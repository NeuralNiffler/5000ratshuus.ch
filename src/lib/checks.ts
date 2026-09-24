import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ausgabe } from "./schema";
import { getCitations } from "./content";
import { artikelJsonLd } from "./jsonld";
import { istUnvollstaendigeDokumentUrl, pruefeUrlsErreichbar } from "./url-check";

/**
 * Die acht Prüfungen vor der Publikation, Entwicklungsdokument Abschnitt 8.
 * Prüfung 1 (kein Referendumsfrist-Datum) läuft bereits hart beim Einlesen
 * in src/lib/content.ts (readAusgabeOrdner) und wird hier nur noch als
 * bestanden gemeldet — ein Ausgabe-Objekt existiert gar nicht, wenn sie
 * fehlgeschlagen wäre. Prüfung 5 ist bewusst noch nicht umgesetzt (siehe
 * dortiger Kommentar).
 *
 * Reines Node/TS, keine Astro-Abhängigkeit — wiederverwendbar von
 * scripts/check-artikel.ts und später von der Pipeline (Phase 1c).
 */

export type PruefStatus = "bestanden" | "fehlgeschlagen" | "uebersprungen" | "nicht_pruefbar";

export interface PruefErgebnis {
  nr: number;
  name: string;
  status: PruefStatus;
  details: string[];
}

export interface AusgabePruefResultat {
  ordner: string;
  slug: string;
  ergebnisse: PruefErgebnis[];
  /** true, wenn keine Prüfung "fehlgeschlagen" ist ("nicht_pruefbar"/"uebersprungen" blockieren nicht). */
  bestanden: boolean;
}

const EUROZEICHEN = /€/;
const PLATZHALTER = /\{\{[^}]*\}\}/;
/** Markdown-Tabellenkopf (Header + Trennzeile), ohne mindestens eine Datenzeile danach. */
const LEERE_TABELLE = /^\|.+\|\r?\n\|[\s:|-]+\|\r?\n(?!\s*\|)/m;

function textFelderFuerAusgabe(ausgabe: Ausgabe): { feld: string; text: string }[] {
  const { frontmatter, bodyMarkdown, geschaefte } = ausgabe;
  const felder: { feld: string; text: string }[] = [
    { feld: "headline", text: frontmatter.headline },
    { feld: "description", text: frontmatter.description },
    { feld: "metaZeile", text: frontmatter.metaZeile.join(" ") },
    { feld: "artikel.md Fliesstext", text: bodyMarkdown },
  ];
  for (const g of geschaefte) {
    felder.push({ feld: `Geschäft "${g.id}" (titel)`, text: g.titel });
    felder.push({ feld: `Geschäft "${g.id}" (ereignis)`, text: g.ereignis ?? "" });
    felder.push({ feld: `Geschäft "${g.id}" (kurztext)`, text: g.kurztext ?? "" });
  }
  return felder;
}

function pruefeKeinReferendumsfristDatum(): PruefErgebnis {
  return {
    nr: 1,
    name: "Kein Datum einer Referendumsfrist im Artikeltext",
    status: "bestanden",
    details: ["Wird beim Einlesen in src/lib/content.ts hart erzwungen (assertKeinFristdatum)."],
  };
}

async function pruefeQuellenErreichbar(ausgabe: Ausgabe, netz: boolean): Promise<PruefErgebnis> {
  const urls = getCitations(ausgabe);

  // Formprüfung zuerst und auch offline: Eine abgeschnittene Dokument-URL
  // ist sicher kaputt, unabhängig davon, ob aarau.ch gerade antwortet.
  const unvollstaendig = [...urls, ausgabe.frontmatter.quelleAmtlich].filter(istUnvollstaendigeDokumentUrl);
  if (unvollstaendig.length > 0) {
    return {
      nr: 2,
      name: "Jedes Geschäft hat mindestens eine erreichbare Quell-URL",
      status: "fehlgeschlagen",
      details: unvollstaendig.map((url) => `${url}: Dokument-URL ohne Dateiendung (abgeschnitten?)`),
    };
  }

  if (!netz) {
    return {
      nr: 2,
      name: "Jedes Geschäft hat mindestens eine erreichbare Quell-URL",
      status: "uebersprungen",
      details: ["Formprüfung bestanden, Netzwerkprüfung deaktiviert (--offline)."],
    };
  }

  const ergebnisse = await pruefeUrlsErreichbar(urls);

  const nichtErreichbar = ergebnisse.filter((e) => e.status === "nicht_erreichbar");
  const blockiert = ergebnisse.filter((e) => e.status === "blockiert");

  if (nichtErreichbar.length > 0) {
    return {
      nr: 2,
      name: "Jedes Geschäft hat mindestens eine erreichbare Quell-URL",
      status: "fehlgeschlagen",
      details: nichtErreichbar.map((e) => `${e.url}: ${e.fehler ?? `HTTP ${e.httpStatus}`}`),
    };
  }

  if (blockiert.length > 0) {
    return {
      nr: 2,
      name: "Jedes Geschäft hat mindestens eine erreichbare Quell-URL",
      status: "nicht_pruefbar",
      details: [
        `${blockiert.length}/${urls.length} URL(s) mit HTTP 403 blockiert (Bot-Abwehr oder Störung ` +
          `bei aarau.ch, siehe src/lib/url-check.ts) — kein Fehlschlag, aber nicht verifizierbar:`,
        ...blockiert.map((e) => e.url),
      ],
    };
  }

  return {
    nr: 2,
    name: "Jedes Geschäft hat mindestens eine erreichbare Quell-URL",
    status: "bestanden",
    details: [`${urls.length}/${urls.length} Quell-URL(s) erreichbar.`],
  };
}

function pruefeKeinEurozeichen(ausgabe: Ausgabe): PruefErgebnis {
  const treffer = textFelderFuerAusgabe(ausgabe)
    .filter(({ text }) => EUROZEICHEN.test(text))
    .map(({ feld }) => feld);

  return {
    nr: 3,
    name: "Kein Eurozeichen im Text",
    status: treffer.length === 0 ? "bestanden" : "fehlgeschlagen",
    details: treffer.length === 0 ? [] : treffer.map((feld) => `€-Zeichen gefunden in: ${feld}`),
  };
}

function pruefeKeinePlatzhalter(ausgabe: Ausgabe): PruefErgebnis {
  const treffer = textFelderFuerAusgabe(ausgabe)
    .filter(({ text }) => PLATZHALTER.test(text))
    .map(({ feld }) => feld);

  return {
    nr: 4,
    name: "Kein Platzhalter aus dem Template ({{...}}) im Ergebnis",
    status: treffer.length === 0 ? "bestanden" : "fehlgeschlagen",
    details: treffer.length === 0 ? [] : treffer.map((feld) => `Platzhalter {{...}} gefunden in: ${feld}`),
  };
}

function pruefeAnzahlGeschaefteVsAmtlich(): PruefErgebnis {
  // TODO(Phase 1c): Erfordert die tatsächliche Anzahl Geschäfte aus der
  // amtlichen Publikation, die erst durch die Quellenauflösung der Pipeline
  // bekannt ist (Umsetzungsplan Schritt 12/13). Bewusst kein
  // Platzhalter-Vergleich, bis die echte Zahl vorliegt — Entscheid vom
  // 2026-09-16, siehe Plan-Notiz zu Prüfung 8.5.
  return {
    nr: 5,
    name: "Anzahl der Geschäfte im Artikel entspricht der amtlichen Publikation",
    status: "uebersprungen",
    details: ["Noch nicht implementiert, siehe TODO in src/lib/checks.ts. Folgt in Phase 1c."],
  };
}

/** Läuft einmal global, nicht pro Ausgabe: Disclaimer/Kontakt sind seitenweit im Layout verankert. */
export function pruefeDisclaimerUndKontakt(): PruefErgebnis {
  const layoutPath = join(process.cwd(), "src/layouts/BaseLayout.astro");
  let quelltext: string;
  try {
    quelltext = readFileSync(layoutPath, "utf-8");
  } catch (err) {
    return {
      nr: 6,
      name: "Disclaimer und Link zum Kontaktformular sind vorhanden",
      status: "fehlgeschlagen",
      details: [`BaseLayout.astro nicht lesbar: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const hatDisclaimer = quelltext.includes("siteConfig.disclaimer");
  const hatKontaktLink = quelltext.includes("siteConfig.contactPath");

  const fehlt: string[] = [];
  if (!hatDisclaimer) fehlt.push("Disclaimer-Text (siteConfig.disclaimer) fehlt in BaseLayout.astro");
  if (!hatKontaktLink) fehlt.push("Link zum Kontaktformular (siteConfig.contactPath) fehlt in BaseLayout.astro");

  return {
    nr: 6,
    name: "Disclaimer und Link zum Kontaktformular sind vorhanden",
    status: fehlt.length === 0 ? "bestanden" : "fehlgeschlagen",
    details: fehlt.length === 0 ? ["In BaseLayout.astro fest verankert, für jede Seite."] : fehlt,
  };
}

/**
 * Prüft genau das Objekt, das die Artikelseite rendert (artikelJsonLd aus
 * src/lib/jsonld.ts), plus die Meta-Angaben aus dem Frontmatter. Bewusst
 * kein echter `astro build`: Die Datenebene ist über Zod bereits streng
 * validiert (schema.ts), ein Rendering-Fehler würde astro build ohnehin hart
 * brechen lassen.
 */
function pruefeJsonLdUndMeta(ausgabe: Ausgabe): PruefErgebnis {
  const { frontmatter } = ausgabe;
  const jsonLd = artikelJsonLd(ausgabe);
  const fehlt: string[] = [];

  try {
    JSON.parse(JSON.stringify(jsonLd));
  } catch (e) {
    fehlt.push(`JSON-LD ist nicht serialisierbar: ${(e as Error).message}`);
  }
  if (!String(jsonLd.headline ?? "").trim()) fehlt.push("headline fehlt");
  if (!String(jsonLd.description ?? "").trim()) fehlt.push("description (Meta-Description) fehlt");
  if (!isGueltigesDatum(String(jsonLd.datePublished))) fehlt.push("datePublished ist kein gültiges Datum");
  if (!isGueltigesDatum(String(jsonLd.dateModified))) fehlt.push("dateModified ist kein gültiges Datum");
  if (!jsonLd.image) fehlt.push("image (Vorschaubild) fehlt");
  if (!String(jsonLd.isBasedOn ?? "").trim()) fehlt.push("quelleAmtlich (isBasedOn) fehlt");
  if (frontmatter.keywords.length === 0) fehlt.push("keywords ist leer");
  if (!Array.isArray(jsonLd.citation) || jsonLd.citation.length === 0)
    fehlt.push("citation ist leer (keine Quell-URLs über alle Geschäfte)");

  return {
    nr: 7,
    name: "Gültiges JSON-LD, gesetzte Meta-Angaben, gesetztes Publikationsdatum",
    status: fehlt.length === 0 ? "bestanden" : "fehlgeschlagen",
    details: fehlt,
  };
}

function isGueltigesDatum(datum: string): boolean {
  return !Number.isNaN(new Date(datum).getTime());
}

/**
 * geschaefte.length === 0 ist bereits in content.ts hart geblockt (Ausgabe
 * würde gar nicht erst eingelesen). Für Template A ist die Garantie leerer
 * Gruppen bereits strukturell durch ArtikelA.astro gegeben (Zeile 31-36,
 * filtert leere Gruppen vor dem Rendern heraus) — hier nur referenziert,
 * nicht dupliziert. Zusätzlich hier: Regex-Schutz gegen eine von Hand
 * geschriebene Markdown-Tabelle ohne Datenzeile in Template B's freiem
 * bodyMarkdown.
 */
function pruefeKeineLeerenAbschnitte(ausgabe: Ausgabe): PruefErgebnis {
  const fehlt: string[] = [];

  if (ausgabe.geschaefte.length === 0) {
    fehlt.push("geschaefte.json ist leer (sollte bereits beim Einlesen geblockt worden sein)");
  }
  if (LEERE_TABELLE.test(ausgabe.bodyMarkdown)) {
    fehlt.push("artikel.md enthält eine Markdown-Tabelle ohne Datenzeile");
  }

  return {
    nr: 8,
    name: "Keine leeren Abschnitte oder Tabellen ohne Zeilen",
    status: fehlt.length === 0 ? "bestanden" : "fehlgeschlagen",
    details:
      fehlt.length === 0
        ? ["Leere Gruppen werden in ArtikelA.astro bereits vor dem Rendern gefiltert."]
        : fehlt,
  };
}

export async function pruefeAusgabe(
  ausgabe: Ausgabe,
  opts?: { netz?: boolean },
): Promise<AusgabePruefResultat> {
  const netz = opts?.netz ?? true;

  // Prüfung 6 (Disclaimer/Kontakt) läuft bewusst NICHT hier: sie ist
  // seitenweit im Layout verankert, nicht ausgaben-spezifisch, und wird
  // von scripts/check-artikel.ts einmal separat über
  // pruefeDisclaimerUndKontakt() aufgerufen statt pro Ausgabe wiederholt.
  const ergebnisse: PruefErgebnis[] = [
    pruefeKeinReferendumsfristDatum(),
    await pruefeQuellenErreichbar(ausgabe, netz),
    pruefeKeinEurozeichen(ausgabe),
    pruefeKeinePlatzhalter(ausgabe),
    pruefeAnzahlGeschaefteVsAmtlich(),
    pruefeJsonLdUndMeta(ausgabe),
    pruefeKeineLeerenAbschnitte(ausgabe),
  ];

  return {
    ordner: ausgabe.ordner,
    slug: ausgabe.frontmatter.slug,
    ergebnisse,
    bestanden: ergebnisse.every((e) => e.status !== "fehlgeschlagen"),
  };
}
