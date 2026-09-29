import { EmailMessage } from "cloudflare:email";
import { createMimeMessage, Mailbox } from "mimetext";
import { MIN_GRUENDE, spamGruende } from "./spam";

/**
 * Kontaktformular-Worker (Entwicklungsdokument F5, Plan Bauauftrag 1a
 * Punkt 8). Nimmt den POST von /kontakt/ entgegen, prüft die Eingabe,
 * verwirft mutmassliche Bot-Anfragen (Honeypot, Cloudflare Turnstile),
 * markiert mutmassliche Werbung im Betreff und schickt die Meldung per
 * `send_email`-Binding an die verifizierte Zieladresse. Siehe
 * docs/entscheide/2026-09-28-kontaktformular-spamschutz.md.
 *
 * Lokal mit `wrangler dev` ist die gesamte Validierungs- und Redirect-Logik
 * testbar, der echte E-Mail-Versand braucht Email Routing auf der Domain. Ein
 * Sendefehler wird nur protokolliert, nicht dem Absender/der Absenderin
 * gezeigt — das vermeidet Rückschlüsse für Spam-Bots. Echte Fehlerbehandlung
 * (z. B. Robin bei dauerhaftem Sendefehler benachrichtigen) ist noch offen.
 */

export interface Env {
  KONTAKT_ZIEL_ADRESSE: string;
  ABSENDER_ADRESSE: string;
  KONTAKT_MAIL: SendEmail;
  /** Secret-Key des Turnstile-Widgets (`wrangler secret put`, lokal `.dev.vars`). */
  TURNSTILE_SECRET: string;
}

const DANKE_PFAD = "/kontakt/danke/";
const FEHLER_PFAD = "/kontakt/fehler/";
const MAX_NACHRICHT_LAENGE = 5000;
const MAX_NAME_LAENGE = 200;
const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function istGueltigeEmail(wert: string): boolean {
  // Bewusst einfach: keine RFC-vollständige Prüfung, nur ein grober Filter
  // gegen offensichtlich falsche Eingaben.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wert);
}

/**
 * Prüft das Turnstile-Token serverseitig bei Cloudflare. Fail closed: Fehlt
 * das Token oder ist Cloudflare nicht erreichbar, gilt die Prüfung als nicht
 * bestanden. Die Person sieht dann eine Fehlerseite und kann es erneut
 * versuchen, statt dass eine ungeprüfte Nachricht durchgeht.
 */
async function pruefeTurnstile(token: string, ip: string | null, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const antwort = await fetch(TURNSTILE_URL, { method: "POST", body });
    const ergebnis = (await antwort.json()) as { success?: boolean; "error-codes"?: string[] };
    if (ergebnis.success !== true) {
      console.warn("Kontaktformular: Turnstile abgelehnt.", ergebnis["error-codes"]);
    }
    return ergebnis.success === true;
  } catch (error) {
    console.error("Kontaktformular: Turnstile nicht erreichbar.", error);
    return false;
  }
}

function redirect(pfad: string, requestUrl: string): Response {
  return Response.redirect(new URL(pfad, requestUrl).toString(), 303);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/api/kontakt") {
      return new Response("Not found", { status: 404 });
    }

    const form = await request.formData();
    const honeypot = String(form.get("website") ?? "").trim();

    // Honeypot-Feld ausgefüllt: mutmasslich ein Bot. Kein Fehler zeigen,
    // damit der Bot nicht lernt, welches Feld ihn verraten hat — einfach
    // so tun, als wäre die Nachricht angekommen.
    if (honeypot.length > 0) {
      console.warn("Kontaktformular: Honeypot ausgefüllt, Anfrage verworfen.");
      return redirect(DANKE_PFAD, request.url);
    }

    const token = String(form.get("cf-turnstile-response") ?? "");
    const ip = request.headers.get("CF-Connecting-IP");
    if (!(await pruefeTurnstile(token, ip, env.TURNSTILE_SECRET))) {
      return redirect(`${FEHLER_PFAD}pruefung/`, request.url);
    }

    const name = String(form.get("name") ?? "").trim().slice(0, MAX_NAME_LAENGE);
    const email = String(form.get("email") ?? "").trim();
    const nachricht = String(form.get("nachricht") ?? "").trim();

    if (!email || !istGueltigeEmail(email) || !nachricht) {
      return redirect(`${FEHLER_PFAD}eingabe/`, request.url);
    }
    if (nachricht.length > MAX_NACHRICHT_LAENGE) {
      return redirect(`${FEHLER_PFAD}zu-lang/`, request.url);
    }

    // Werbung, die ein Mensch von Hand eingetippt hat, kommt an Turnstile
    // vorbei. Sie wird nur markiert, nicht verworfen (siehe spam.ts).
    const gruende = spamGruende(name, nachricht);
    const verdacht = gruende.length >= MIN_GRUENDE;

    const msg = createMimeMessage();
    msg.setSender({ name: "Kontaktformular 5000ratshuus.ch", addr: env.ABSENDER_ADRESSE });
    msg.setRecipient(env.KONTAKT_ZIEL_ADRESSE);
    msg.setSubject(`${verdacht ? "[Spam?] " : ""}Kontaktformular: Neue Nachricht${name ? ` von ${name}` : ""}`);
    msg.addMessage({
      contentType: "text/plain",
      data: [
        ...(verdacht ? [`Spam-Verdacht: ${gruende.join(", ")}`, ""] : []),
        `Name: ${name || "(nicht angegeben)"}`,
        `E-Mail: ${email}`,
        "",
        "Nachricht:",
        nachricht,
      ].join("\n"),
    });
    // Antworten sollen direkt an die absendende Person gehen, nicht an die
    // Formular-Absenderadresse. setHeader erwartet für Reply-To eine
    // Mailbox-Instanz, kein blosses String (siehe mimetext-Validierung).
    msg.setHeader("Reply-To", new Mailbox(email));

    try {
      const message = new EmailMessage(env.ABSENDER_ADRESSE, env.KONTAKT_ZIEL_ADRESSE, msg.asRaw());
      await env.KONTAKT_MAIL.send(message);
    } catch (error) {
      // Siehe Kommentar oben: vor dem Deploy erwartet, hier nur protokolliert.
      console.error("Kontaktformular: Mailversand fehlgeschlagen.", error);
    }

    return redirect(DANKE_PFAD, request.url);
  },
} satisfies ExportedHandler<Env>;
