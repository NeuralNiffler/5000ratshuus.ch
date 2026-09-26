import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import {
  ArtikelFrontmatterSchema,
  GeschaeftRawSchema,
  templateFuer,
  type Ausgabe,
  type Geschaeft,
} from "./schema";

/**
 * Liest alle Ausgaben aus src/content/ausgaben/*, validiert sie gegen die
 * Schemas in schema.ts und gibt sie fertig aufbereitet zurück.
 *
 * Bewusst kein Astro Content-Collection-Loader: Dieses Modul ist reines
 * Node/TypeScript ohne Astro-Abhängigkeit, damit derselbe Code unverändert
 * vom SQLite-Build (scripts/build-index.ts) und später von der Pipeline
 * (Phase 1c, GitHub Actions) verwendet werden kann. Ein Fehler beim Einlesen
 * wirft eine Exception und bricht damit `astro build` hart ab, das ist
 * gewollt: fehlerhafte Inhalte dürfen nicht stillschweigend gebaut werden.
 */

/**
 * Bewusst relativ zum Arbeitsverzeichnis (nicht `import.meta.url`): Astro
 * bündelt diese Datei beim Build in einen Chunk an anderem Speicherort,
 * `import.meta.url` würde dann ins Leere zeigen. `astro dev`/`astro build`
 * und `tsx scripts/build-index.ts` laufen beide vom Projekt-Root aus (siehe
 * package.json), deshalb ist process.cwd() hier zuverlässig.
 */
const CONTENT_DIR = join(process.cwd(), "src/content/ausgaben");

let cache: Ausgabe[] | null = null;

export function readAusgabeOrdner(ordner: string, baseDir: string = CONTENT_DIR): Ausgabe {
  const dir = join(baseDir, ordner);
  const artikelPath = join(dir, "artikel.md");
  const geschaeftePath = join(dir, "geschaefte.json");

  if (!existsSync(artikelPath)) {
    throw new Error(`Ausgabe "${ordner}": artikel.md fehlt unter ${artikelPath}`);
  }
  if (!existsSync(geschaeftePath)) {
    throw new Error(`Ausgabe "${ordner}": geschaefte.json fehlt unter ${geschaeftePath}`);
  }

  const raw = readFileSync(artikelPath, "utf-8");
  const { data, content: bodyMarkdown } = matter(raw);

  const parsedFrontmatter = ArtikelFrontmatterSchema.safeParse(data);
  if (!parsedFrontmatter.success) {
    throw new Error(
      `Ausgabe "${ordner}": ungültiges Frontmatter in artikel.md:\n${parsedFrontmatter.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  const frontmatter = parsedFrontmatter.data;

  const geschaefteRawJson = JSON.parse(readFileSync(geschaeftePath, "utf-8"));
  if (!Array.isArray(geschaefteRawJson)) {
    throw new Error(`Ausgabe "${ordner}": geschaefte.json muss ein Array sein.`);
  }
  if (geschaefteRawJson.length === 0) {
    throw new Error(`Ausgabe "${ordner}": geschaefte.json ist leer (Prüfung 8.8, keine leeren Abschnitte).`);
  }

  const geschaefte: Geschaeft[] = geschaefteRawJson.map((item, index) => {
    const parsed = GeschaeftRawSchema.safeParse(item);
    if (!parsed.success) {
      throw new Error(
        `Ausgabe "${ordner}": ungültiges Geschäft an Index ${index} in geschaefte.json:\n${parsed.error.issues
          .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
          .join("\n")}`,
      );
    }
    return { ...parsed.data, ausgabe: ordner };
  });

  const ids = new Set<string>();
  for (const g of geschaefte) {
    if (ids.has(g.id)) {
      throw new Error(`Ausgabe "${ordner}": doppelte Geschäft-ID "${g.id}" in geschaefte.json.`);
    }
    ids.add(g.id);
  }

  // Harte Prüfung (Prüfung 1 aus Abschnitt 8/Phase 1b, siehe src/lib/checks.ts
  // für die übrigen sieben Prüfungen): kein Fristdatum-Zeichenmuster im
  // Fliesstext, in den Metadaten oder in den einzelnen Geschäften. Das ist
  // die einzige Ausnahme vom unbeaufsichtigten Betrieb (Abschnitt 6) und wird
  // deshalb schon hier, beim Einlesen, hart erzwungen statt erst später.
  // Streng (jedes Datum neben "Frist") nur, wo ein Referendum im Spiel ist,
  // siehe docs/entscheide/2026-09-26-fristdatum-pruefung-enger.md.
  const ausgabeStreng = geschaefte.some((g) => g.referendumspflichtig);
  assertKeinFristdatum(ordner, "description", frontmatter.description, ausgabeStreng);
  assertKeinFristdatum(ordner, "ogDescription", frontmatter.ogDescription ?? "", ausgabeStreng);
  assertKeinFristdatum(ordner, "artikel.md Fliesstext", bodyMarkdown, ausgabeStreng);
  for (const g of geschaefte) {
    const streng = g.referendumspflichtig;
    assertKeinFristdatum(ordner, `Geschäft "${g.id}" (titel)`, g.titel, streng);
    assertKeinFristdatum(ordner, `Geschäft "${g.id}" (ereignis)`, g.ereignis ?? "", streng);
    assertKeinFristdatum(ordner, `Geschäft "${g.id}" (kurztext)`, g.kurztext ?? "", streng);
  }

  const bodyHtml = bodyMarkdown.trim().length > 0 ? (marked.parse(bodyMarkdown) as string) : "";

  const dateModified =
    frontmatter.korrekturen.length > 0
      ? [...frontmatter.korrekturen].sort((a, b) => a.datum.localeCompare(b.datum)).at(-1)!.datum
      : frontmatter.datePublished;

  return {
    frontmatter,
    bodyMarkdown,
    bodyHtml,
    geschaefte,
    ordner,
    dateModified,
    template: templateFuer(geschaefte),
  };
}

/**
 * Erkennt ein konkretes Referendumsfrist-Datum im Text. Die Regel aus
 * Abschnitt 6 verbietet jedes Datum einer Referendumsfrist, nicht nur ein
 * bestimmtes bekanntes Datum. Diese Heuristik sucht deshalb Datumsformate
 * (ausgeschriebener Monatsname oder ISO) und prüft die Umgebung (80 Zeichen):
 *
 * - streng (die Ausgabe bzw. das Geschäft ist referendumspflichtig): jedes
 *   Datum in der Nähe von "Frist" blockiert, auch wenn das Wort "Referendum"
 *   nicht danebensteht.
 * - sonst: nur ein Datum in der Nähe von "Referendum" oder "Unterschrift".
 *   Andere Fristen (Bewerbung, Einsprache, Mitwirkung) dürfen ein Datum haben,
 *   siehe docs/entscheide/2026-09-26-fristdatum-pruefung-enger.md.
 *
 * Das ist Prüfung 1 aus Abschnitt 8 (Phase 1b) — die einzige der acht
 * Prüfungen, die hart beim Einlesen statt in src/lib/checks.ts läuft, weil
 * ein falsch übertragenes Fristdatum nicht nachträglich korrigierbar ist.
 */
function assertKeinFristdatum(ordner: string, feld: string, text: string, streng: boolean): void {
  const datumsMuster = /\b\d{1,2}\.\s?(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s?\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/gi;
  // Nie "referendumspflichtig" allein als Treffer werten: Sitzungs- und
  // Publikationsdatum stehen oft daneben. "referendum(?!spflicht)" schliesst
  // es aus, "Referendumsfrist" und "Referendum ergreifen" bleiben erfasst.
  const fristKontext = streng ? /frist/i : /referendum(?!spflicht)|unterschrift/i;
  for (const match of text.matchAll(datumsMuster)) {
    const start = Math.max(0, match.index! - 80);
    const end = Math.min(text.length, match.index! + match[0].length + 80);
    const umgebung = text.slice(start, end);
    if (fristKontext.test(umgebung)) {
      throw new Error(
        `Ausgabe "${ordner}": ${feld} enthält ein Datum in der Nähe von ` +
          `"${streng ? "Frist" : "Referendum/Unterschrift"}" ` +
          `("${match[0]}"). Die Referendumsfrist darf nie als Datum gezeigt werden (Abschnitt 6).`,
      );
    }
  }
}

/** Alle Ausgaben, neueste zuerst. Wird pro Prozess einmal eingelesen und gecacht. */
export function getAllAusgaben(): Ausgabe[] {
  if (cache) return cache;

  if (!existsSync(CONTENT_DIR)) {
    throw new Error(`Content-Verzeichnis fehlt: ${CONTENT_DIR}`);
  }

  const ordner = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const ausgaben = ordner.map((o) => readAusgabeOrdner(o));

  const slugs = new Set<string>();
  for (const a of ausgaben) {
    if (slugs.has(a.frontmatter.slug)) {
      throw new Error(`Doppelter Slug "${a.frontmatter.slug}" über mehrere Ausgaben hinweg.`);
    }
    slugs.add(a.frontmatter.slug);
  }

  ausgaben.sort((a, b) => b.frontmatter.datePublished.localeCompare(a.frontmatter.datePublished));

  cache = ausgaben;
  return ausgaben;
}

export function getAusgabeBySlug(slug: string): Ausgabe | undefined {
  return getAllAusgaben().find((a) => a.frontmatter.slug === slug);
}

/** Alle Geschäfte aller Ausgaben, flach, für Archiv-Auswertungen. */
export function getAllGeschaefte(): Geschaeft[] {
  return getAllAusgaben().flatMap((a) => a.geschaefte);
}

/**
 * Eindeutige Quell-URLs eines Artikels, aus allen seinen Geschäften
 * zusammengetragen. Wird für `citation` im JSON-LD verwendet, damit die
 * Quellen nicht zusätzlich im Frontmatter gepflegt werden müssen.
 */
export function getCitations(ausgabe: Ausgabe): string[] {
  const urls = new Set<string>();
  for (const g of ausgabe.geschaefte) {
    for (const q of g.quellen) urls.add(q.url);
  }
  return [...urls];
}

/** Jahr/Monat für die Artikel-URL, aus datePublished abgeleitet. */
export function getArtikelPfad(ausgabe: Ausgabe): { jahr: string; monat: string; slug: string } {
  const [jahr, monat] = ausgabe.frontmatter.datePublished.split("-");
  return { jahr, monat, slug: ausgabe.frontmatter.slug };
}

export function getArtikelUrl(ausgabe: Ausgabe): string {
  const { jahr, monat, slug } = getArtikelPfad(ausgabe);
  return `/artikel/${jahr}/${monat}/${slug}/`;
}

/** Vorschaubild (og:image) der Ausgabe, erzeugt von src/pages/og/[...pfad].png.ts. */
export function getOgBildUrl(ausgabe: Ausgabe): string {
  const { jahr, monat, slug } = getArtikelPfad(ausgabe);
  return `/og/${jahr}/${monat}/${slug}.png`;
}

/** Für Archiv-Einträge aus dem SQLite-Index, die nur den Ausgabe-Ordner kennen. */
export function getArtikelUrlByOrdner(ordner: string): string {
  const ausgabe = getAllAusgaben().find((a) => a.ordner === ordner);
  if (!ausgabe) throw new Error(`Keine Ausgabe mit Ordner "${ordner}" gefunden.`);
  return getArtikelUrl(ausgabe);
}
