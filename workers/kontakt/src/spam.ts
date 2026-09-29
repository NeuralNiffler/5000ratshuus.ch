/**
 * Inhaltsfilter für Kontaktmeldungen, die Turnstile und Honeypot passiert
 * haben (typisch: von Hand eingetippte Werbung). Markiert nur, verwirft nie:
 * Eine echte Meldung darf nicht verloren gehen, siehe
 * docs/entscheide/2026-09-28-kontaktformular-spamschutz.md.
 *
 * Jede Heuristik liefert höchstens einen Grund. Erst ab MIN_GRUENDE gilt eine
 * Meldung als Verdacht, damit ein einzelnes englisches Wort, ein Link oder
 * ein Dollarbetrag allein nichts auslöst.
 */

export const MIN_GRUENDE = 2;

const ENGLISCHE_WOERTER = new Set([
  "the", "you", "your", "our", "we", "and", "for", "with", "business",
  "website", "if", "are", "just", "can", "of", "to", "is", "that",
]);
const DEUTSCHE_WOERTER = new Set([
  "und", "der", "die", "das", "ich", "nicht", "ist", "ein", "eine", "im",
  "zu", "mit", "auf", "für", "sie", "es", "wir", "bei", "den",
]);

const VERKAUFSPHRASEN = [
  "prices start",
  "our videos",
  "seo",
  "backlink",
  "rank your website",
  "guest post",
  "marketing",
  "let me know if you",
  "samples",
  "increase your traffic",
  "first page of google",
  "web design",
];

function woerter(text: string): string[] {
  return text.toLowerCase().match(/[a-zäöüéèà']+/g) ?? [];
}

function wirktEnglisch(text: string): boolean {
  const alle = woerter(text);
  if (alle.length < 8) return false;
  const en = alle.filter((w) => ENGLISCHE_WOERTER.has(w)).length;
  const de = alle.filter((w) => DEUTSCHE_WOERTER.has(w)).length;
  return en >= 4 && en > 3 * de;
}

export function spamGruende(name: string, nachricht: string): string[] {
  const text = `${name}\n${nachricht}`;
  const klein = text.toLowerCase();
  const gruende: string[] = [];

  if (wirktEnglisch(nachricht)) gruende.push("englischer Text");
  if (/\$|\busd\b/i.test(text)) gruende.push("Betrag in Dollar");

  const phrase = VERKAUFSPHRASEN.find((p) => new RegExp(`\\b${p}\\b`).test(klein));
  if (phrase) gruende.push(`Verkaufsphrase "${phrase}"`);

  const links = text.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links > 2) gruende.push(`${links} Links`);

  return gruende;
}
