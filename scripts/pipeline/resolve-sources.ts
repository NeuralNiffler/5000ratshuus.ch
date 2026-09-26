/**
 * Schritt 12 der Pipeline (Umsetzungsplan Phase 1c): Kurzlinks auflösen,
 * Botschaft-PDFs im Sitzungsarchiv suchen, jede Quelle auf Erreichbarkeit
 * prüfen. Nutzt src/lib/url-check.ts für die Erreichbarkeitsprüfung, statt
 * eigener Logik (Vorgabe aus dem Plan, Wiederverwendung mit Prüfung 2).
 *
 * WICHTIG (Stand 2026-09-16): aarau.ch liefert aktuell HTTP 403 für jede
 * automatisierte Anfrage UND für normale Browser (siehe AGENTS.md, Prüfung
 * 2 / src/lib/url-check.ts). Die HTML-Struktur der Sitzungsarchiv-Seite
 * konnte deshalb in dieser Session nicht live eingesehen werden — die
 * Link-Erkennung unten ist ein plausibler erster Ansatz (Regex auf
 * PDF-Links mit Geschäftsnummer im href/Linktext), aber NICHT gegen die
 * echte Seite verifiziert. Vor dem produktiven Einsatz gegen eine echte,
 * erreichbare Sitzungsarchiv-Seite gegenprüfen und die Muster anpassen.
 */
import { pruefeUrlErreichbar, type UrlPruefErgebnis } from "../../src/lib/url-check.ts";

export interface AufgeloesteQuelle {
  url: string;
  typ: "botschaft" | "amtliche_publikation";
  erreichbarkeit: UrlPruefErgebnis;
}

const TIMEOUT_MS = 8000;
const PAUSE_VOR_WIEDERHOLUNG_MS = 3000;

/**
 * fetch mit einem zweiten Versuch, wenn die Anfrage gar keine Antwort bekommt
 * (Timeout, Netzwerkfehler). aarau.ch antwortet aus GitHub Actions zeitweise
 * nicht innerhalb der Frist (Läufe vom 2026-09-23 und 2026-09-26), beim
 * nächsten Versuch aber sofort. Eine HTTP-Antwort (403, 404, 429 usw.) wird
 * nicht wiederholt, sondern unverändert zurückgegeben: Die Bewertung bleibt
 * Sache des Aufrufers, es wird keine Prüfung aufgeweicht.
 */
async function fetchMitWiederholung(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    console.warn(
      `Keine Antwort von ${url} (${err instanceof Error ? err.message : String(err)}), ` +
        `neuer Versuch in ${PAUSE_VOR_WIEDERHOLUNG_MS / 1000} s.`,
    );
    await new Promise((resolve) => setTimeout(resolve, PAUSE_VOR_WIEDERHOLUNG_MS));
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  }
}

/**
 * Folgt einem Kurzlink (z. B. aarau.ch/short/...) bis zur Ziel-URL, ohne den
 * Seiteninhalt zu laden. Generisch, nicht aarau.ch-spezifisch — funktioniert
 * unabhängig vom aktuellen 403-Befund für jeden Standard-HTTP-Redirect.
 */
export async function loeseKurzlinkAuf(url: string, opts?: { timeoutMs?: number }): Promise<string> {
  const response = await fetchMitWiederholung(url, { method: "HEAD", redirect: "follow" }, opts?.timeoutMs ?? TIMEOUT_MS);
  return response.url || url;
}

/**
 * Durchsucht eine Sitzungsarchiv-Listenseite (z. B. "Sitzungen Einwohnerrat
 * [Jahr]") nach einem PDF-Link, dessen href oder Linktext die
 * Geschäftsnummer enthält. Einfache Regex-Suche statt eines HTML-Parsers
 * (keine neue Abhängigkeit) — bewusst best-effort, siehe Modul-Kommentar.
 * Gibt null zurück, wenn nichts Passendes gefunden wird; ruft NICHT
 * pruefeUrlErreichbar für jeden Kandidaten auf (Aufgabe von
 * resolveGeschaeftsquelle unten).
 */
export function findePdfLinkFuerGeschaeft(sitzungsseiteHtml: string, geschaeftsnummer: string): string | null {
  // aarau.ch hängt einen Cache-Parameter an (".pdf?fp=1"), deshalb ist ein
  // Query-String nach ".pdf" erlaubt (Stand 2026-09-23 an der Seite
  // "Sitzungen Einwohnerrat 2026" überprüft).
  const linkMuster = /<a[^>]+href="([^"]+\.pdf(?:\?[^"]*)?)"[^>]*>([^<]*)<\/a>/gi;
  for (const match of sitzungsseiteHtml.matchAll(linkMuster)) {
    const [, href, linktext] = match;
    if (href.includes(geschaeftsnummer) || linktext.includes(geschaeftsnummer)) {
      return href;
    }
  }
  return null;
}

/**
 * Lädt eine Seite als Text. Wirft nicht bei 403/404 — gibt stattdessen
 * null zurück, damit der Aufrufer das als "nicht auflösbar" protokollieren
 * kann statt den ganzen Pipeline-Lauf mit einer unbehandelten Exception
 * abzubrechen.
 */
export async function ladeSeiteAlsText(url: string, opts?: { timeoutMs?: number }): Promise<string | null> {
  try {
    const response = await fetchMitWiederholung(url, { redirect: "follow" }, opts?.timeoutMs ?? TIMEOUT_MS);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Löst die Quelle für ein Geschäft auf: Botschaft-PDF im Sitzungsarchiv hat
 * Priorität, amtliche Publikation ist der Fallback (Priorität laut
 * SKILL.md Workflow-Schritt 4). Prüft die gefundene URL sofort auf
 * Erreichbarkeit.
 */
export async function resolveGeschaeftsquelle(
  sitzungsarchivUrl: string,
  geschaeftsnummer: string,
  amtlichePublikationUrl: string,
): Promise<AufgeloesteQuelle> {
  const sitzungsseite = await ladeSeiteAlsText(sitzungsarchivUrl);
  const pdfLink = sitzungsseite ? findePdfLinkFuerGeschaeft(sitzungsseite, geschaeftsnummer) : null;

  if (pdfLink) {
    const url = new URL(pdfLink, sitzungsarchivUrl).toString();
    return { url, typ: "botschaft", erreichbarkeit: await pruefeUrlErreichbar(url) };
  }

  return {
    url: amtlichePublikationUrl,
    typ: "amtliche_publikation",
    erreichbarkeit: await pruefeUrlErreichbar(amtlichePublikationUrl),
  };
}

/**
 * Normalisiert eine URL für den Vergleich: HTML-Entities im href auflösen,
 * relativ zur Basis auflösen, Fragment entfernen. new URL() kodiert dabei
 * Leerzeichen und Umlaute einheitlich, so dass "Auflösung" und
 * "Aufl%C3%B6sung" als gleich gelten.
 */
function normalisiereUrl(roh: string, basisUrl: string): URL | null {
  try {
    const url = new URL(roh.replace(/&amp;/g, "&"), basisUrl);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

/** Alle Links aus dem Quellmaterial: href/src-Attribute (HTML) und freistehende URLs (Mailtext). */
function extrahiereUrls(quellenText: string, basisUrl: string): Set<string> {
  const roh: string[] = [];
  for (const m of quellenText.matchAll(/(?:href|src)="([^"]+)"/gi)) roh.push(m[1]);
  for (const m of quellenText.matchAll(/https?:\/\/[^\s"'<>)\]]+/gi)) roh.push(m[0].replace(/[.,;:]+$/, ""));

  const bekannt = new Set<string>();
  for (const r of roh) {
    const url = normalisiereUrl(r, basisUrl);
    if (!url) continue;
    bekannt.add(url.href);
    // Auch ohne Query-String zulassen: aarau.ch hängt Cache-Parameter wie
    // "?fp=1" an, die für den Link selbst nicht nötig sind.
    bekannt.add(url.origin + url.pathname);
  }
  return bekannt;
}

/**
 * Herkunftsprüfung: Jede URL, die das Modell in den Artikel schreibt, muss
 * genau so im geladenen Quellmaterial vorkommen. Sonst hat das Modell sie
 * gekürzt oder konstruiert. Ein blosser Teilstring-Vergleich reicht nicht,
 * weil eine abgeschnittene URL ein Präfix der echten ist; verglichen wird
 * deshalb gegen die vollständig extrahierten Links.
 * Gibt die URLs zurück, die nicht im Quellmaterial stehen.
 */
export function findeUrlsOhneHerkunft(urls: string[], quellenText: string, basisUrl: string): string[] {
  const bekannt = extrahiereUrls(quellenText, basisUrl);
  return urls.filter((u) => {
    const url = normalisiereUrl(u, basisUrl);
    return !url || !bekannt.has(url.href);
  });
}
