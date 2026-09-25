/**
 * Schritt 13 der Pipeline (Umsetzungsplan Phase 1c): Artikel per Claude-API
 * erzeugen, sofort gegen die bestehenden Zod-Schemas validieren (harter
 * Fehler bei Ungültigkeit — es wird nie ein unvalidiertes Ergebnis
 * geschrieben) und als artikel.md + geschaefte.json in einen neuen
 * Ausgabe-Ordner schreiben.
 *
 * entstehung, backfill, slug, datePublished und newsletter.messageId werden
 * deterministisch von diesem Skript gesetzt, nicht vom Modell — Identität
 * und Herkunft einer Ausgabe dürfen nicht von der Modellantwort abhängen.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { ArtikelFrontmatterSchema, GeschaeftRawSchema, MAX_THEMEN, THEMEN } from "../../src/lib/schema.ts";
import { buildGenerierungsPrompt } from "./prompts.ts";
import { rufeClaudeJsonAuf } from "./claude-client.ts";
import { findeUrlsOhneHerkunft } from "./resolve-sources.ts";

const CONTENT_DIR = join(process.cwd(), "src/content/ausgaben");

/**
 * Verwirft Themen-Tags ausserhalb von THEMEN und kürzt auf MAX_THEMEN, mit Warnung im
 * Log. Die Pipeline läuft unbeaufsichtigt: ein erfundenes Tag soll die
 * Ausgabe nicht verhindern, aber auch nie im Archiv landen. Alles andere
 * bleibt der harten Schema-Prüfung überlassen.
 */
function bereinigeTags(item: unknown, index: number): unknown {
  if (typeof item !== "object" || item === null || !Array.isArray((item as { tags?: unknown }).tags)) return item;
  const roh = (item as { tags: unknown[] }).tags;
  const erlaubt = new Set<string>(THEMEN);
  const gueltig = [...new Set(roh.filter((t): t is string => typeof t === "string" && erlaubt.has(t)))];
  const verworfen = roh.filter((t) => !(typeof t === "string" && erlaubt.has(t)));
  if (verworfen.length > 0) {
    console.warn(`Geschäft ${index}: Themen-Tags ausserhalb der Liste verworfen: ${JSON.stringify(verworfen)}`);
  }
  if (gueltig.length > MAX_THEMEN) {
    console.warn(
      `Geschäft ${index}: mehr als ${MAX_THEMEN} Themen, gekürzt auf ${JSON.stringify(gueltig.slice(0, MAX_THEMEN))}`,
    );
  }
  return { ...item, tags: gueltig.slice(0, MAX_THEMEN) };
}

/** Reines ASCII, ä→ae/ö→oe/ü→ue, siehe docs/entscheide/2026-09-16-slug-regel.md. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface GenerierungsKontext {
  betreff: string;
  /** Lesbares Datum wie im Newsletter-Versand, z. B. "28.08.2026". */
  newsletterDatum: string;
  messageId: string;
  /** Aufbereiteter Text der in Schritt 12 aufgelösten Quellen, geht in den Prompt. */
  quellenText: string;
  /** Aufgelöste amtliche Seite, Basis für relative Links im Quellmaterial. */
  quelleUrl?: string;
  /** JJJJ-MM-TT, vom aufrufenden Skript bestimmt (nicht vom Modell). */
  datePublished: string;
}

export interface GeneriertesArtikelErgebnis {
  ordner: string;
  artikelPfad: string;
  geschaeftePfad: string;
}

function pruefeUndHoleFeld<T>(obj: Record<string, unknown>, feld: string, typPruefung: (v: unknown) => v is T): T {
  const wert = obj[feld];
  if (!typPruefung(wert)) {
    throw new Error(`Generierungs-Antwort: Feld "${feld}" fehlt oder hat falschen Typ: ${JSON.stringify(wert)}`);
  }
  return wert;
}

const istString = (v: unknown): v is string => typeof v === "string";
const istArray = (v: unknown): v is unknown[] => Array.isArray(v);
const istObjekt = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export async function generiereUndSchreibeArtikel(
  kontext: GenerierungsKontext,
): Promise<GeneriertesArtikelErgebnis> {
  const prompt = buildGenerierungsPrompt(kontext.quellenText, kontext.betreff, kontext.newsletterDatum);
  const antwort = await rufeClaudeJsonAuf(prompt, { maxTokens: 8000 });

  if (!istObjekt(antwort)) {
    throw new Error("Generierungs-Antwort ist kein JSON-Objekt.");
  }

  const frontmatterRoh = pruefeUndHoleFeld(antwort, "frontmatter", istObjekt);
  const bodyMarkdown = pruefeUndHoleFeld(antwort, "bodyMarkdown", istString);
  const geschaefteRoh = pruefeUndHoleFeld(antwort, "geschaefte", istArray);

  const headline = pruefeUndHoleFeld(frontmatterRoh, "headline", istString);
  const slug = slugify(headline);
  if (!slug) {
    throw new Error(`Konnte aus headline "${headline}" keinen gültigen Slug ableiten.`);
  }
  const ordner = `${kontext.datePublished}-${slug}`;

  const newsletterRoh = istObjekt(frontmatterRoh.newsletter) ? frontmatterRoh.newsletter : {};

  // Das Template wird aus der Anzahl Geschäfte berechnet (templateFuer in
  // schema.ts), eine Wahl des Modells wird verworfen.
  const { template: _template, ...frontmatterOhneTemplate } = frontmatterRoh;

  const vollstaendigesFrontmatter = {
    ...frontmatterOhneTemplate,
    slug,
    datePublished: kontext.datePublished,
    korrekturen: [],
    backfill: false,
    entstehung: "pipeline",
    newsletter: {
      ...newsletterRoh,
      betreff: kontext.betreff,
      datum: kontext.newsletterDatum,
      messageId: kontext.messageId,
    },
  };

  const parsedFrontmatter = ArtikelFrontmatterSchema.safeParse(vollstaendigesFrontmatter);
  if (!parsedFrontmatter.success) {
    throw new Error(
      `Generierte Ausgabe hat ungültiges Frontmatter:\n${parsedFrontmatter.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }

  if (geschaefteRoh.length === 0) {
    throw new Error("Generierungs-Antwort enthält keine Geschäfte (Prüfung 8.8, keine leeren Abschnitte).");
  }

  const geschaefte = geschaefteRoh.map((item, index) => {
    const parsed = GeschaeftRawSchema.safeParse(bereinigeTags(item, index));
    if (!parsed.success) {
      throw new Error(
        `Generiertes Geschäft an Index ${index} ist ungültig:\n${parsed.error.issues
          .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
          .join("\n")}`,
      );
    }
    return parsed.data;
  });

  // Herkunftsprüfung: Das Modell darf Links nur aus dem Quellmaterial
  // übernehmen, nie kürzen oder selbst zusammensetzen. Abgebrochen wird vor
  // dem Schreiben, damit keine Ausgabe mit erfundenen Links liegen bleibt.
  const alleUrls = [parsedFrontmatter.data.quelleAmtlich, ...geschaefte.flatMap((g) => g.quellen.map((q) => q.url))];
  const ohneHerkunft = findeUrlsOhneHerkunft(alleUrls, kontext.quellenText, kontext.quelleUrl ?? "https://www.aarau.ch/");
  if (ohneHerkunft.length > 0) {
    throw new Error(
      `Generierte Ausgabe enthält URLs, die nicht im Quellmaterial stehen (gekürzt oder erfunden):\n${ohneHerkunft
        .map((u) => `  - ${u}`)
        .join("\n")}`,
    );
  }

  const dir = join(CONTENT_DIR, ordner);
  if (existsSync(dir)) {
    throw new Error(
      `Ordner "${ordner}" existiert bereits — Slug-Kollision, Lauf abgebrochen statt vorhandene Ausgabe zu überschreiben.`,
    );
  }
  mkdirSync(dir, { recursive: true });

  const artikelPfad = join(dir, "artikel.md");
  const geschaeftePfad = join(dir, "geschaefte.json");

  writeFileSync(artikelPfad, matter.stringify(bodyMarkdown, parsedFrontmatter.data));
  writeFileSync(geschaeftePfad, JSON.stringify(geschaefte, null, 2) + "\n");

  return { ordner, artikelPfad, geschaeftePfad };
}
