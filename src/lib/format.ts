const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

/** "2026-08-24" -> "24. August 2026" */
export function formatDatumLesbar(iso: string): string {
  const [jahr, monat, tag] = iso.split("-").map(Number);
  return `${tag}. ${MONATE[monat - 1]} ${jahr}`;
}

/** "2026-08-24" -> "24.08.2026" */
export function formatDatumKurz(iso: string): string {
  const [jahr, monat, tag] = iso.split("-");
  return `${tag}.${monat}.${jahr}`;
}

/**
 * ASCII-Slug für Archiv-URLs, z. B. Themen-Tags. Gleiche Regel wie für
 * Artikel-Slugs: ä→ae, ö→oe, ü→ue, kein Eszett, kein Umlaut in der URL.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Die Zusätze hinter Datum und Urheberschaft in Geschäftslisten, etwa
 * "Gewählt" oder "Referendumspflichtig".
 *
 * Jeder Zusatz stammt aus einem ausdrücklich gesetzten Feld, nichts wird
 * erschlossen:
 * - `ereignis` im Wortlaut der Quelle,
 * - "Referendumspflichtig", wenn die Quelle den Beschluss so ausweist,
 * - "Budgetiert, nicht effektiv" bei Budget- und Politikplan-Zahlen.
 *
 * Eine Referendumsfrist erscheint hier nie, auch nicht als Datum.
 */
export function statusZusaetze(e: {
  ereignis: string | null;
  referendumspflichtig: boolean;
  budgetiert: boolean;
}): string[] {
  return [
    e.ereignis,
    e.referendumspflichtig ? "Referendumspflichtig" : null,
    e.budgetiert ? "Budgetiert, nicht effektiv" : null,
  ].filter((z): z is string => Boolean(z));
}
