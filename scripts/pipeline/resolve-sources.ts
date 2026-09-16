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

/**
 * Folgt einem Kurzlink (z. B. aarau.ch/short/...) bis zur Ziel-URL, ohne den
 * Seiteninhalt zu laden. Generisch, nicht aarau.ch-spezifisch — funktioniert
 * unabhängig vom aktuellen 403-Befund für jeden Standard-HTTP-Redirect.
 */
export async function loeseKurzlinkAuf(url: string, opts?: { timeoutMs?: number }): Promise<string> {
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(opts?.timeoutMs ?? 8000),
  });
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
  const linkMuster = /<a[^>]+href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;
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
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 8000),
    });
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
