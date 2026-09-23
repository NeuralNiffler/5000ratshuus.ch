/**
 * Erreichbarkeits-Prüfung für Quell-URLs. Geteilt zwischen Prüfung 2 aus
 * Abschnitt 8 (src/lib/checks.ts) und der Quellenauflösung der Pipeline
 * (Phase 1c, scripts/pipeline/resolve-sources.ts), damit dieselbe Logik
 * nicht doppelt gebaut wird.
 *
 * HTTP 403 wird bewusst als eigener Status "blockiert" geführt, nicht als
 * "nicht_erreichbar": aarau.ch liefert aktuell 403 für automatisierte
 * Anfragen (reproduziert per curl und per Browser, auch für die Startseite
 * selbst), Ursache unklar (Bot-Abwehr oder vorübergehende Störung). Ein
 * echter toter Link (404, 5xx, Timeout, DNS-Fehler) soll davon nicht
 * überdeckt werden, aber 403 soll auch keinen falschen Dauer-Fehlalarm
 * auslösen.
 */

export type UrlStatus = "erreichbar" | "nicht_erreichbar" | "blockiert";

export interface UrlPruefErgebnis {
  url: string;
  status: UrlStatus;
  httpStatus?: number;
  fehler?: string;
}

const STANDARD_TIMEOUT_MS = 8000;
const STANDARD_CONCURRENCY = 5;

export async function pruefeUrlErreichbar(
  url: string,
  opts?: { timeoutMs?: number },
): Promise<UrlPruefErgebnis> {
  const timeoutMs = opts?.timeoutMs ?? STANDARD_TIMEOUT_MS;

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

    // Manche Server unterstützen HEAD nicht (405/501) und antworten nur auf GET.
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
    }

    if (response.status === 403) {
      return { url, status: "blockiert", httpStatus: 403 };
    }
    if (response.ok) {
      return { url, status: "erreichbar", httpStatus: response.status };
    }
    return { url, status: "nicht_erreichbar", httpStatus: response.status };
  } catch (err) {
    return {
      url,
      status: "nicht_erreichbar",
      fehler: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Dokument-Links auf aarau.ch liegen unter /public/upload/assets/<Nr>/ und
 * tragen den vollen Dokumenttitel als Dateinamen, inkl. Endung (".pdf").
 * Fehlt die Endung, wurde die URL abgeschnitten (so geschehen bei der
 * Ausgabe 2026-08-28: Dateiname endete mitten im Titel, Link lief auf 404).
 * Rein formale Prüfung ohne Netzwerk, damit sie auch dann greift, wenn
 * aarau.ch mit 403/429 antwortet und die Erreichbarkeit nicht prüfbar ist.
 */
const DOKUMENT_PFAD = /^\/public\/upload\/assets\/\d+\//;
const DATEIENDUNG = /\.[a-z0-9]{2,5}$/i;

export function istUnvollstaendigeDokumentUrl(url: string): boolean {
  let pfad: string;
  try {
    pfad = new URL(url).pathname;
  } catch {
    return false; // Ungültige URLs fängt bereits das Schema (z.url()) ab.
  }
  return DOKUMENT_PFAD.test(pfad) && !DATEIENDUNG.test(pfad);
}

export async function pruefeUrlsErreichbar(
  urls: string[],
  opts?: { timeoutMs?: number; concurrency?: number },
): Promise<UrlPruefErgebnis[]> {
  const concurrency = opts?.concurrency ?? STANDARD_CONCURRENCY;
  const ergebnisse: UrlPruefErgebnis[] = new Array(urls.length);

  let naechsterIndex = 0;
  async function worker() {
    while (naechsterIndex < urls.length) {
      const index = naechsterIndex++;
      ergebnisse[index] = await pruefeUrlErreichbar(urls[index], { timeoutMs: opts?.timeoutMs });
    }
  }

  const workerAnzahl = Math.min(concurrency, urls.length);
  await Promise.all(Array.from({ length: workerAnzahl }, () => worker()));

  return ergebnisse;
}
