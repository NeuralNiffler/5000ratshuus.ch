import PostalMime from "postal-mime";
import { bereinigeMailtext } from "./bereinigen";

/**
 * Mail-Eingang der Pipeline (Entwicklungsdokument F1, Umsetzungsplan
 * Phase 1c, Schritt 10). Cloudflare Email Routing ruft `email()` für jede
 * Mail an newsletter@5000ratshuus.ch auf. Passt der Absender, wird der
 * bereinigte Klartext per repository_dispatch an die GitHub Action
 * (.github/workflows/pipeline.yml) übergeben. Alles andere geht unverändert
 * an Robin — es geht also nie eine Mail verloren.
 *
 * Newsletter-Mails gehen zusätzlich als unveränderte Kopie an Robin. Nur dort
 * stehen die persönlichen Links "Newsletter-Abo ändern/deaktivieren", die
 * bereinigeMailtext() für das öffentliche Repo entfernt. Ohne Kopie liesse
 * sich das Abo von newsletter@ nicht mehr verwalten.
 *
 * Idempotenz (dieselbe Mail zweimal) liegt bewusst nicht hier, sondern in
 * scripts/pipeline/run-pipeline.ts (Abgleich der Message-ID mit den
 * committeten Ausgaben).
 */

export interface Env {
  ERLAUBTER_ABSENDER: string;
  WEITERLEITUNGS_ADRESSE: string;
  GITHUB_REPO: string;
  GITHUB_TOKEN: string;
}

// GitHub begrenzt client_payload auf rund 64 KB. Etwas Luft für den Umschlag.
const MAX_PAYLOAD_BYTES = 60_000;

function schweizerDatum(datum: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(datum);
}

/** Notfalls Text aus HTML gewinnen, falls die Mail keinen Klartext-Teil hat. */
function htmlZuText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Prüft den Absender anhand des Headers "From". Der Envelope-Absender
 * (message.from) wird bewusst nicht geprüft: Newsletter-Dienste verwenden
 * dort meist eine eigene Bounce-Adresse.
 *
 * Cloudflare verlangt für die Weiterleitung seit Juli 2025 ein bestandenes
 * SPF oder DKIM, ob und in welchem Header das Ergebnis im Worker ankommt, ist
 * aber nicht dokumentiert. Steht ein Authentication-Results-Header in der
 * Mail und meldet ein Versagen, lehnen wir ab. Fehlt er, verlassen wir uns
 * auf Cloudflares eigene Prüfung. TODO: beim ersten echten Eingang mit
 * `wrangler tail` kontrollieren, welche Header ankommen (werden protokolliert).
 */
function istErlaubterAbsender(headerFrom: string | undefined, authResults: string | null, erlaubt: string): boolean {
  if (headerFrom?.toLowerCase() !== erlaubt.toLowerCase()) return false;
  if (authResults && /dmarc=fail|(dkim=fail[\s\S]*spf=fail)|(spf=fail[\s\S]*dkim=fail)/i.test(authResults)) return false;
  return true;
}

async function loeseGithubDispatchAus(env: Env, clientPayload: Record<string, string>): Promise<void> {
  const antwort = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "5000ratshuus-eingang",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: "newsletter-eingang", client_payload: clientPayload }),
  });
  if (antwort.status !== 204) {
    throw new Error(`GitHub-Dispatch fehlgeschlagen: HTTP ${antwort.status} ${await antwort.text()}`);
  }
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const weiterleiten = async (grund: string) => {
      console.warn(`Mail an Robin weitergeleitet: ${grund}`);
      await message.forward(env.WEITERLEITUNGS_ADRESSE);
    };

    const rohmail = await new Response(message.raw).arrayBuffer();
    const geparst = await PostalMime.parse(rohmail);

    const authResults = message.headers.get("authentication-results");
    console.log(
      `Eingang: From=${geparst.from?.address ?? "?"} Envelope=${message.from} ` +
        `Header=[${[...message.headers.keys()].join(", ")}] Auth=${authResults ?? "(keiner)"}`,
    );

    if (!istErlaubterAbsender(geparst.from?.address, authResults, env.ERLAUBTER_ABSENDER)) {
      return weiterleiten(`Absender ${geparst.from?.address ?? "unbekannt"} nicht erlaubt.`);
    }

    const messageId = message.headers.get("message-id") ?? geparst.messageId;
    const betreff = geparst.subject?.trim();
    const klartext = geparst.text?.trim() || (geparst.html ? htmlZuText(geparst.html).trim() : "");
    if (!messageId || !betreff || !klartext) {
      return weiterleiten("Message-ID, Betreff oder Text fehlen.");
    }

    // Kopie an Robin. Ein Fehler hier darf die Pipeline nicht aufhalten.
    let kopieVerschickt = false;
    try {
      await message.forward(env.WEITERLEITUNGS_ADRESSE);
      kopieVerschickt = true;
      console.log("Kopie an Robin weitergeleitet.");
    } catch (fehler) {
      console.error("Kopie an Robin fehlgeschlagen:", fehler);
    }
    // Ist die Kopie schon unterwegs, nicht ein zweites Mal weiterleiten.
    const weiterleitenFallsNoetig = async (grund: string) => {
      if (kopieVerschickt) {
        console.warn(`${grund} Kopie liegt bereits bei Robin.`);
        return;
      }
      await weiterleiten(grund);
    };

    const datum = geparst.date ? new Date(geparst.date) : new Date();
    const clientPayload = {
      betreff,
      newsletter_datum: schweizerDatum(Number.isNaN(datum.getTime()) ? new Date() : datum),
      message_id: messageId,
      mailtext: bereinigeMailtext(klartext),
    };

    if (new TextEncoder().encode(JSON.stringify(clientPayload)).length > MAX_PAYLOAD_BYTES) {
      return weiterleitenFallsNoetig("Mailtext zu gross für repository_dispatch.");
    }

    try {
      await loeseGithubDispatchAus(env, clientPayload);
      console.log(`Pipeline ausgelöst für ${messageId}.`);
    } catch (fehler) {
      console.error(fehler);
      await weiterleitenFallsNoetig("Dispatch an GitHub fehlgeschlagen.");
    }
  },
} satisfies ExportedHandler<Env>;
