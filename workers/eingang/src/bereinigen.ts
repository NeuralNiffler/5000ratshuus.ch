/**
 * Bereinigt den Klartext einer Newsletter-Mail, bevor er an die Pipeline
 * geht. Das Repository ist öffentlich und der Mailtext erscheint im
 * Workflow-Lauf (siehe docs/entscheide/2026-09-16-stack.md): persönliche
 * Abmelde- und Verwaltungslinks dürfen dort nicht landen.
 *
 * Die Heuristik ist gegen die echte Newsletter-Mail der Stadt Aarau noch
 * nicht geprüft (Format unbekannt). Beim ersten echten Eingang den
 * bereinigten Text im Workflow-Lauf ansehen und hier nachschärfen.
 */

// Zeilen mit Link und einem dieser Wörter werden komplett entfernt.
const PERSOENLICHE_ZEILE = /abmeld|abbestell|unsubscribe|opt-?out|profil|einstellungen|preferences|manage/i;

// Lange, zufällig aussehende Query-Werte sind fast immer Empfänger-Tokens.
const TOKEN_IN_URL = /[?&][^=&\s]+=[A-Za-z0-9_\-%.]{20,}/;

const URL_MUSTER = /https?:\/\/[^\s<>"')\]]+/g;

/** Die Kurzlinks brauchen wir: die Pipeline löst sie zur amtlichen Quelle auf. */
function istAarauKurzlink(url: string): boolean {
  return /^https?:\/\/(?:www\.)?aarau\.ch\/short\//i.test(url);
}

export function bereinigeMailtext(text: string): string {
  const behalten = text.split(/\r?\n/).filter((zeile) => {
    const hatLink = /https?:\/\//i.test(zeile);
    return !(hatLink && PERSOENLICHE_ZEILE.test(zeile));
  });

  return behalten
    .join("\n")
    .replace(URL_MUSTER, (url) => (!istAarauKurzlink(url) && TOKEN_IN_URL.test(url) ? "[Link entfernt]" : url))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
