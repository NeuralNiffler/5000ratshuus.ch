import { EmailMessage } from "cloudflare:email";
import { createMimeMessage, Mailbox } from "mimetext";

/**
 * Kontaktformular-Worker (Entwicklungsdokument F5, Plan Bauauftrag 1a
 * Punkt 8). Nimmt den POST von /kontakt/ entgegen, prüft die Eingabe,
 * verwirft mutmassliche Bot-Anfragen und schickt eine Meldung per
 * `send_email`-Binding an die verifizierte Zieladresse.
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
}

const DANKE_PFAD = "/kontakt/danke/";
const KONTAKT_PFAD = "/kontakt/";
const MAX_NACHRICHT_LAENGE = 5000;

function istGueltigeEmail(wert: string): boolean {
  // Bewusst einfach: keine RFC-vollständige Prüfung, nur ein grober Filter
  // gegen offensichtlich falsche Eingaben.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wert);
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

    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const nachricht = String(form.get("nachricht") ?? "").trim();

    if (!email || !istGueltigeEmail(email) || !nachricht) {
      return redirect(`${KONTAKT_PFAD}?fehler=eingabe`, request.url);
    }
    if (nachricht.length > MAX_NACHRICHT_LAENGE) {
      return redirect(`${KONTAKT_PFAD}?fehler=zu-lang`, request.url);
    }

    const msg = createMimeMessage();
    msg.setSender({ name: "Kontaktformular 5000ratshuus.ch", addr: env.ABSENDER_ADRESSE });
    msg.setRecipient(env.KONTAKT_ZIEL_ADRESSE);
    msg.setSubject(`Kontaktformular: Neue Nachricht${name ? ` von ${name}` : ""}`);
    msg.addMessage({
      contentType: "text/plain",
      data: [
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
