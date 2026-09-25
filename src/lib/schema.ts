import { z } from "zod";

/**
 * Verbindliche Schemas für Artikel-Frontmatter und Geschäfte, siehe
 * Entwicklungsdokument Abschnitt 9 (Datenhaltung) und CLAUDE.md.
 *
 * Diese Datei ist reines TypeScript ohne Astro-Abhängigkeit, damit sie
 * unverändert von der Website (src/lib/content.ts), vom SQLite-Build
 * (scripts/build-index.ts) und später von der Pipeline (Phase 1c)
 * verwendet werden kann.
 */

/** Reines ASCII, klein geschrieben, Bindestriche statt Umlauten (ä→ae, ö→oe, ü→ue). */
const asciiSlug = z
  .string()
  .regex(
    /^[a-z0-9-]+$/,
    "Slug darf nur a-z, 0-9 und Bindestriche enthalten (keine Umlaute, siehe Entscheid zur Slug-Regel)",
  );

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format JJJJ-MM-TT sein");

export const KATEGORIEN = ["Amtliche Publikation", "Medienmitteilung"] as const;
export type Kategorie = (typeof KATEGORIEN)[number];

export const TEMPLATES = ["A", "B"] as const;
export type Template = (typeof TEMPLATES)[number];

/**
 * Template aus der Anzahl Geschäfte: eines → B (Einzelthema), mehrere → A
 * (Beschlussliste). Wird berechnet statt im Frontmatter gewählt, siehe
 * docs/entscheide/2026-09-25-template-aus-anzahl-geschaefte.md.
 */
export function templateFuer(geschaefte: readonly unknown[]): Template {
  return geschaefte.length > 1 ? "A" : "B";
}

export const ENTSTEHUNG = ["manuell", "pipeline"] as const;

/** Art des Geschäfts, siehe Abschnitt 9. ASCII-Werte, weil sie in Archiv-URLs erscheinen. */
export const GESCHAEFT_ARTEN = [
  "wahl",
  "motion",
  "postulat",
  "buergermotion",
  "reglement",
  "kredit",
  "sonstiges",
] as const;
export type GeschaeftArt = (typeof GESCHAEFT_ARTEN)[number];

/** Anzeige-Label pro Art, für Überschriften und Tabellen. */
export const GESCHAEFT_ART_LABEL: Record<GeschaeftArt, string> = {
  wahl: "Wahl",
  motion: "Motion",
  postulat: "Postulat",
  buergermotion: "Bürgermotion",
  reglement: "Reglement",
  kredit: "Kredit",
  sonstiges: "Sonstiges",
};

/** Gruppe innerhalb von Template A, Abschnitt "Abschliessend entschieden". */
/**
 * Feste Liste der Themen-Tags. Ein Thema ist das Sachgebiet, um das es im
 * Geschäft geht, nicht die Art des Vorgangs: eine Qualitätsüberprüfung einer
 * Schule ist "Bildung & Schule", eine Strassensanierung "Verkehr & Mobilität".
 * Eigennamen und Vorgangswörter gehören in Titel und Text, nie in Tags.
 * Siehe docs/entscheide/2026-09-23-themen-vokabular.md.
 */
export const THEMEN = [
  "Bildung & Schule",
  "Finanzen",
  "Bauen & Planung",
  "Verkehr & Mobilität",
  "Umwelt & Energie",
  "Wohnen",
  "Sicherheit & Ordnung",
  "Gesellschaft & Soziales",
  "Kultur, Sport & Freizeit",
  "Verwaltung & Organisation",
  "Politik",
] as const;
export type Thema = (typeof THEMEN)[number];

/** Höchstzahl Themen pro Geschäft. Finanzen steht oft neben einem oder zwei Sachgebieten. */
export const MAX_THEMEN = 3;

export const GESCHAEFT_GRUPPEN = [
  "wahlen",
  "motionen-und-postulate",
  "bevoelkerungsanliegen",
  "sonstige",
] as const;
export type GeschaeftGruppe = (typeof GESCHAEFT_GRUPPEN)[number];

export const GESCHAEFT_GRUPPE_LABEL: Record<GeschaeftGruppe, string> = {
  wahlen: "Wahlen",
  "motionen-und-postulate": "Motionen & Postulate",
  bevoelkerungsanliegen: "Bevölkerungsanliegen",
  sonstige: "Weitere Geschäfte",
};

export const QUELLE_TYPEN = [
  "botschaft",
  "reglement",
  "amtliche_publikation",
  "sonstige",
] as const;

const quelleSchema = z.object({
  url: z.url(),
  label: z.string().min(1),
  typ: z.enum(QUELLE_TYPEN),
});
export type Quelle = z.infer<typeof quelleSchema>;

const urheberSchema = z
  .object({
    name: z.string().min(1),
    partei: z.string().nullable().default(null),
  })
  .nullable();

/**
 * Ein einzelnes Geschäft, wie es roh in einer geschaefte.json steht.
 * Das Feld `ausgabe` steht bewusst NICHT im Rohformat: es wird beim Einlesen
 * aus dem Ordnernamen der Ausgabe gesetzt, damit es nie widersprüchlich zum
 * tatsächlichen Ablageort sein kann. Siehe GeschaeftSchema unten.
 */
export const GeschaeftRawSchema = z.object({
  id: z.string().min(1),
  titel: z.string().min(1),
  art: z.enum(GESCHAEFT_ARTEN),
  urheber: urheberSchema.default(null),
  ereignis: z.string().nullable().default(null),
  referendumspflichtig: z.boolean(),
  tags: z.array(z.enum(THEMEN)).max(MAX_THEMEN, `Höchstens ${MAX_THEMEN} Themen pro Geschäft`).default([]),
  sitzungsdatum: isoDate.nullable().default(null),
  publikationsdatum: isoDate,
  quellen: z.array(quelleSchema).min(1, "Jedes Geschäft braucht mindestens eine Quelle (Prüfung 8.2)"),
  gruppe: z.enum(GESCHAEFT_GRUPPEN).nullable().default(null),
  kurztext: z.string().nullable().default(null),
});
export type GeschaeftRaw = z.infer<typeof GeschaeftRawSchema>;

export const GeschaeftSchema = GeschaeftRawSchema.extend({
  ausgabe: asciiSlug,
});
export type Geschaeft = z.infer<typeof GeschaeftSchema>;

const korrekturSchema = z.object({
  datum: isoDate,
  beschreibung: z.string().min(1),
});
export type Korrektur = z.infer<typeof korrekturSchema>;

const kennzahlSchema = z.object({
  label: z.string().min(1),
  wert: z.string().min(1),
});

/** Frontmatter von artikel.md, siehe Entwicklungsdokument F4 und Templates A/B. */
export const ArtikelFrontmatterSchema = z
  .object({
    slug: asciiSlug,
    headline: z.string().min(1),
    kategorie: z.enum(KATEGORIEN),
    datePublished: isoDate,
    korrekturen: z.array(korrekturSchema).default([]),
    description: z.string().min(1).max(300),
    ogDescription: z.string().min(1).max(300).optional(),
    keywords: z.array(z.string().min(1)).min(1),
    /** isBasedOn im JSON-LD: die amtliche Publikation bzw. Medienmitteilung. */
    quelleAmtlich: z.url(),
    about: z.array(z.string().min(1)).default([]),
    newsletter: z.object({
      betreff: z.string().min(1),
      /** Lesbares Datum wie im Newsletter-Versand, z. B. "28.08.2026". */
      datum: z.string().min(1),
      messageId: z.string().optional(),
    }),
    sitzungsdatum: isoDate.optional(),
    /** Zusätzliche, frei formulierte Meta-Zeilen-Angaben, z. B. "Steuerfuss: 96 %". */
    metaZeile: z.array(z.string().min(1)).default([]),
    kennzahlen: z.array(kennzahlSchema).optional(),
    /** Badge "Budgetiert, nicht effektiv" auf Artikelebene (v. a. Template B). */
    forecast: z.boolean().default(false),
    backfill: z.boolean().default(false),
    entstehung: z.enum(ENTSTEHUNG),
  })
  .superRefine((data, ctx) => {
    // Pipeline-erzeugte Ausgaben (Phase 1c) brauchen newsletter.messageId für
    // die Idempotenz-Prüfung (F1): ohne sie könnte dieselbe Newsletter-Ausgabe
    // unbemerkt doppelt verarbeitet werden. Manuell erzeugte Ausgaben (Phase
    // 1a/1b, Backfill) haben oft keine Message-ID zur Hand, deshalb bleibt das
    // Feld dort optional.
    if (data.entstehung === "pipeline" && !data.newsletter.messageId) {
      ctx.addIssue({
        code: "custom",
        path: ["newsletter", "messageId"],
        message:
          'newsletter.messageId ist für automatisiert erzeugte Ausgaben (entstehung: "pipeline") verbindlich, für die Idempotenz-Prüfung der Pipeline.',
      });
    }
  });
export type ArtikelFrontmatter = z.infer<typeof ArtikelFrontmatterSchema>;

/** Eine vollständig eingelesene und geprüfte Ausgabe: Artikel plus Geschäfte. */
export interface Ausgabe {
  frontmatter: ArtikelFrontmatter;
  /** Roher Markdown-Fliesstext aus artikel.md (nur bei Template B relevant). */
  bodyMarkdown: string;
  /** Zu HTML gerendeter Fliesstext. */
  bodyHtml: string;
  geschaefte: Geschaeft[];
  /** Ordnername unter src/content/ausgaben/, dient als Ausgaben-ID. */
  ordner: string;
  /** dateModified fürs JSON-LD: letzte Korrektur, sonst datePublished. */
  dateModified: string;
  /** Berechnet aus der Anzahl Geschäfte, siehe templateFuer(). */
  template: Template;
}
