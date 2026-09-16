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
