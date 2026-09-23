/**
 * Redaktionelle Regeln aus Entwicklungsdokument Abschnitt 6 und
 * docs/aarau-newsletter-artikel/SKILL.md, einmal transkribiert und von
 * categorize.ts / generate-article.ts importiert — damit die Regeln nicht
 * pro Skript neu aus Prosa abgeleitet werden.
 *
 * Wichtig: Diese Prompts zielen auf das jetzige Markdown+Frontmatter-Format
 * (src/lib/schema.ts: ArtikelFrontmatterSchema/GeschaeftRawSchema), NICHT auf
 * die alten HTML-Templates aus SKILL.md. Die Kategorisierungs- und
 * Schreibregeln sind identisch, nur die Zielstruktur ist neu.
 */
import { MAX_THEMEN, THEMEN } from "../../src/lib/schema.ts";

const THEMEN_LISTE = THEMEN.map((t) => `"${t}"`).join(", ");

export const KATEGORISIERUNGSREGELN = `
- Eine Bürgermotion ist ein Bevölkerungsanliegen, keine gewöhnliche Motion.
  Sie gehört in die Gruppe "bevoelkerungsanliegen", auch wenn der Name
  anderes nahelegt.
- Nur Motionen und Postulate von amtierenden Ratsmitgliedern gehören in die
  Gruppe "motionen-und-postulate".
- Ein Status/Ereignis (gewählt, überwiesen, nicht überwiesen, aufgenommen,
  abgeschrieben) wird nur gesetzt, wenn die Quelle ihn ausdrücklich nennt.
  Sonst bleibt das Feld null.
- Zahlen aus Budget oder Politikplan sind Prognosen (frontmatter.forecast
  auf true setzen, Badge "Budgetiert, nicht effektiv").
- Aarauer Beträge sind immer Franken. Ein Eurozeichen in extrahierten
  Rohdaten ist ein Extraktionsfehler und wird zu "Fr."/"Franken" korrigiert,
  nie übernommen.
- Themen-Tags stehen immer direkt beim einzelnen Geschäft (tags[]), nie als
  lose Tag-Wolke ohne Zuordnung. Pro Geschäft 1 bis ${MAX_THEMEN} Tags, ausschliesslich
  aus dieser festen Liste: ${THEMEN_LISTE}. Keine eigenen Tags erfinden.
- Ein Thema ist das Sachgebiet, um das es im Geschäft geht, nicht die Art
  des Vorgangs. Wörter wie "Qualitätsüberprüfung", "Sanierung", "Verbot"
  oder "Baurechtsvertrag" beschreiben, was passiert, und sind nie ein Thema.
  Entscheidend ist, woran es passiert: Die Qualitätsüberprüfung einer
  Primarschule ist "Bildung & Schule", die einer Wasserversorgung
  "Umwelt & Energie". Eigennamen (Strassen, Gebäude, Schulen) sind ebenfalls
  nie ein Thema.
- Grenzfall Bauvorhaben: Strassen, Wege und Plätze sind "Verkehr & Mobilität",
  Gebäude, Nutzungsplanung und Denkmalschutz sind "Bauen & Planung".
- Ein Geschäft darf mehrere Sachgebiete haben, wenn es wirklich mehrere
  betrifft (z. B. Oberstufenstandorte: "Bildung & Schule" und
  "Bauen & Planung"). "Finanzen" steht meist neben dem Sachgebiet, für das
  das Geld bestimmt ist, nur bei rein finanziellen Geschäften wie dem
  Budget allein.
- "Politik" umfasst den politischen Betrieb selbst: Wahlen und Ersatzwahlen
  in Rat und Kommissionen, Stimmenzähler, Ratsorganisation. "Verwaltung &
  Organisation" ist dagegen die Stadtverwaltung (z. B. WOSA-Reglement).
- Urheberschaft (urheber) nur übernehmen, wenn die Quelle Name und ggf.
  Partei ausdrücklich nennt. Nie aus dem Kontext erschliessen.
`.trim();

export const REFERENDUMSFRIST_REGEL = `
Die Referendumsfrist wird NIE als konkretes Datum gezeigt, auch wenn die
Quelle sie nennt. Nur der Status referendumspflichtig (true/false) wird
gesetzt. Für das genaue Datum wird auf die Originalquelle verwiesen. Diese
Regel gilt für jedes Feld (titel, ereignis, kurztext, bodyMarkdown,
description, ogDescription) und jede Ausgabe ohne Ausnahme. Ein falsch
übertragenes Datum könnte jemanden eine echte Unterschriftenfrist verpassen
lassen — anders als andere Fehler ist das nach Ablauf nicht mehr
korrigierbar.
`.trim();

export const SCHREIBREGELN = `
- Kein einleitender Lead-Satz unter der Überschrift.
- bodyMarkdown nur für das, was nicht schon in Meta-Zeile, Badges oder
  Kennzahlen-Box steht. Keine Wiederholung von Zahlen.
- Kurze, einfache, klare Sprache. Ein bis zwei Sätze pro Geschäft (kurztext)
  reichen fast immer.
- Keine erfundenen Fakten, keine unmarkierten Annahmen. Unklares wird als
  offen benannt statt interpretiert.
- Keine Wertung, keine politische Einordnung, keine Meinung. Faktisch und
  neutral.
- Keine interaktive Inline-Suche oder Filter-Beschreibung im Text.
- Deutsch (Schweiz): Umlaute als ö/ä/ü ausgeschrieben, kein Eszett. Slugs
  sind die einzige Ausnahme (reines ASCII, ä→ae/ö→oe/ü→ue).
- Kein Platzhalter wie {{...}} im Ergebnis. Kein Eurozeichen.
- URLs (quellen[].url, quelleAmtlich) nur Zeichen für Zeichen aus den
  aufgelösten Quellen übernehmen: nie kürzen, nie selbst zusammensetzen.
  Dokument-Links vollständig inkl. Dateiendung (".pdf"). Steht für ein
  Geschäft kein eigener Dokument-Link in den Quellen, die amtliche Seite
  verlinken. Links, die nicht in den Quellen stehen, lassen den Lauf scheitern.
`.trim();

export const ZIELFORMAT_BESCHREIBUNG = `
Antworte ausschliesslich mit einem JSON-Objekt (kein Markdown-Codeblock,
kein Begleittext) mit genau dieser Form:

{
  "frontmatter": {
    "template": "A" | "B",
    "headline": string,
    "kategorie": "Amtliche Publikation" | "Medienmitteilung",
    "description": string (max. 300 Zeichen),
    "ogDescription": string (max. 300 Zeichen, optional),
    "keywords": string[] (mind. 1),
    "quelleAmtlich": string (URL der amtlichen Hauptquelle),
    "about": string[] (Themen, z. B. ["Bildung", "Finanzen"]),
    "newsletter": { "betreff": string, "datum": string (z. B. "28.08.2026") },
    "sitzungsdatum": string (JJJJ-MM-TT, optional),
    "metaZeile": string[] (zusätzliche Meta-Angaben),
    "kennzahlen": { "label": string, "wert": string }[] (optional),
    "forecast": boolean
  },
  "bodyMarkdown": string (nur bei Template B relevanter Fliesstext, sonst ""),
  "geschaefte": [
    {
      "id": string (stabil, ASCII, z. B. "2026-66-aufloesung"),
      "titel": string,
      "art": "wahl" | "motion" | "postulat" | "buergermotion" | "reglement" | "kredit" | "sonstiges",
      "urheber": { "name": string, "partei": string | null } | null,
      "ereignis": string | null,
      "referendumspflichtig": boolean,
      "tags": string[] (1–${MAX_THEMEN} Werte aus: ${THEMEN_LISTE}),
      "sitzungsdatum": string (JJJJ-MM-TT) | null,
      "publikationsdatum": string (JJJJ-MM-TT),
      "quellen": [{ "url": string, "label": string, "typ": "botschaft" | "reglement" | "amtliche_publikation" | "sonstige" }] (mind. 1),
      "gruppe": "wahlen" | "motionen-und-postulate" | "bevoelkerungsanliegen" | "sonstige" | null,
      "kurztext": string | null
    }
  ]
}

Felder wie "slug", "datePublished", "entstehung", "backfill" und
"newsletter.messageId" werden NICHT von dir gesetzt, sondern deterministisch
vom aufrufenden Skript ergänzt.
`.trim();

export function buildKategorisierungsPrompt(betreff: string, mailKlartext: string): string {
  return `
Du kategorisierst eine Ausgabe des Newsletters der Stadt Aarau
(kommunikation@aarau.ch) für einen quellenverlinkten Blog zur Aarauer
Kommunalpolitik.

Kategorien: "Medienmitteilung", "Amtliche Publikation", "Baugesuch",
"unklar". Baugesuche und einzelne Routine-Publikationen (z. B. einzelne
Einbürgerungsgesuche) sind NICHT relevant. Relevant ist nur echte
politische Substanz: Beschlüsse, Budget/Finanzen, Planung,
Vernehmlassungen/öffentliche Auflagen.

Antworte ausschliesslich mit einem JSON-Objekt:
{ "kategorie": "Medienmitteilung" | "Amtliche Publikation" | "Baugesuch" | "unklar",
  "relevant": boolean, "grund": string (kurze Begründung, Deutsch) }

Betreff: ${betreff}

Mailtext:
${mailKlartext}
`.trim();
}

export function buildGenerierungsPrompt(quellenText: string, betreff: string, newsletterDatum: string): string {
  return `
Du erzeugst einen Artikel für 5000ratshuus.ch, einen quellenverlinkten Blog
zur Aarauer Kommunalpolitik. Der Newsletter der Stadt Aarau ist nur der
Aufhänger — die untenstehenden, bereits aufgelösten amtlichen Quellen sind
deine einzige Faktengrundlage. Erfinde nichts, was dort nicht steht.

## Kategorisierungsregeln
${KATEGORISIERUNGSREGELN}

## Referendumsfrist-Regel (verbindlich, keine Ausnahme)
${REFERENDUMSFRIST_REGEL}

## Schreibregeln
${SCHREIBREGELN}

## Zielformat
${ZIELFORMAT_BESCHREIBUNG}

## Newsletter-Betreff
${betreff}

## Newsletter-Datum
${newsletterDatum}

## Aufgelöste amtliche Quellen
${quellenText}
`.trim();
}
