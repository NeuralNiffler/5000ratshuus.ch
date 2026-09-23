/**
 * Orchestriert die Pipeline (Umsetzungsplan Phase 1c, Schritte 11-13):
 * kategorisieren → Quellen auflösen → Artikel erzeugen → Prüfungen
 * (Abschnitt 8) gegen die neue Ausgabe laufen lassen. Schreibt ein
 * Protokoll pro Lauf (Schritt 15). Committet NIE selbst — das ist Sache
 * des GitHub-Actions-Workflow-Schritts (.github/workflows/pipeline.yml),
 * damit die Verantwortlichkeiten (Inhalt erzeugen vs. veröffentlichen)
 * sauber getrennt bleiben.
 *
 * Idempotenz (F1): newsletter.messageId ist für entstehung: "pipeline"
 * verbindlich (siehe src/lib/schema.ts). Vor der Verarbeitung wird über
 * getAllAusgaben() geprüft, ob bereits eine Ausgabe mit derselben
 * messageId existiert — die bereits committeten Ordner sind damit selbst
 * die Quelle der Wahrheit, kein separater State-Store nötig.
 *
 *   npm run pipeline:run -- --mailtext-datei <pfad> --betreff "..." \
 *     --newsletter-datum "28.08.2026" --message-id "<...>"
 *
 * Die Mailtext-Datei ist lokal und wird NIE committet (siehe
 * pipeline-testdaten/ in .gitignore) — der öffentliche Charakter des Repos
 * verbietet unbereinigte Rohmails im Verlauf (siehe stack.md).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAllAusgaben, readAusgabeOrdner } from "../../src/lib/content.ts";
import { pruefeAusgabe } from "../../src/lib/checks.ts";
import { kategorisiereAusgabe } from "./categorize.ts";
import { loeseKurzlinkAuf, ladeSeiteAlsText } from "./resolve-sources.ts";
import { generiereUndSchreibeArtikel } from "./generate-article.ts";
import { holeVerbrauch, type Verbrauch } from "./claude-client.ts";

interface PipelineProtokoll {
  zeitpunkt: string;
  messageId: string;
  betreff: string;
  entscheid: "verarbeitet" | "uebersprungen_bereits_vorhanden" | "aussortiert" | "fehler";
  grund: string;
  ordner?: string;
  quelleAufgeloest?: string;
  pruefungenBestanden?: boolean;
  fehler?: string;
  /** Claude-API-Verbrauch dieses Laufs, wird in schreibeProtokoll() gesetzt. */
  verbrauch?: Verbrauch;
}

function leseArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function schreibeProtokoll(protokoll: PipelineProtokoll) {
  const dir = join(process.cwd(), ".build/pipeline-log");
  mkdirSync(dir, { recursive: true });
  const pfad = join(dir, `${Date.now()}.json`);
  const mitVerbrauch = { ...protokoll, verbrauch: holeVerbrauch() };
  writeFileSync(pfad, JSON.stringify(mitVerbrauch, null, 2) + "\n");
  console.log(`Protokoll geschrieben: ${pfad}`);
}

async function main() {
  const mailtextDatei = leseArg("mailtext-datei");
  const betreff = leseArg("betreff");
  const newsletterDatum = leseArg("newsletter-datum");
  const messageId = leseArg("message-id");

  if (!mailtextDatei || !betreff || !newsletterDatum || !messageId) {
    console.error(
      "Aufruf: npm run pipeline:run -- --mailtext-datei <pfad> --betreff <text> " +
        "--newsletter-datum <TT.MM.JJJJ> --message-id <id>",
    );
    process.exit(1);
  }

  const zeitpunkt = new Date().toISOString();
  const mailKlartext = readFileSync(mailtextDatei, "utf-8");

  // Idempotenz: bereits verarbeitete messageId überspringen.
  const bestehende = getAllAusgaben().find((a) => a.frontmatter.newsletter.messageId === messageId);
  if (bestehende) {
    const protokoll: PipelineProtokoll = {
      zeitpunkt,
      messageId,
      betreff,
      entscheid: "uebersprungen_bereits_vorhanden",
      grund: `Bereits verarbeitet als Ausgabe "${bestehende.ordner}".`,
    };
    schreibeProtokoll(protokoll);
    console.log(protokoll.grund);
    process.exit(0);
  }

  try {
    const kategorisierung = await kategorisiereAusgabe(mailKlartext, betreff);
    console.log(`Kategorisierung: ${kategorisierung.kategorie}, relevant: ${kategorisierung.relevant}`);
    console.log(`Grund: ${kategorisierung.grund}`);

    if (!kategorisierung.relevant) {
      schreibeProtokoll({
        zeitpunkt,
        messageId,
        betreff,
        entscheid: "aussortiert",
        grund: `Kategorie "${kategorisierung.kategorie}": ${kategorisierung.grund}`,
      });
      process.exit(0);
    }

    // Quellen auflösen (Schritt 12): den ersten aarau.ch-Kurzlink im Mailtext
    // folgen und die Zielseite als Text laden. Tiefere Quellenauflösung pro
    // Geschäft (Botschaft-PDF im Sitzungsarchiv, siehe resolve-sources.ts
    // resolveGeschaeftsquelle) ist bewusst noch nicht hier verdrahtet: sie
    // braucht die einzelnen Geschäfte, die erst NACH der Generierung bekannt
    // sind, und ist gegen die echte aarau.ch-Seitenstruktur noch nicht
    // verifizierbar (siehe Modul-Kommentar in resolve-sources.ts). TODO: als
    // Anreicherungsschritt nach generiereUndSchreibeArtikel ergänzen, sobald
    // aarau.ch wieder erreichbar ist und die Sitzungsarchiv-Struktur bekannt.
    const kurzlinkMatch = mailKlartext.match(/https?:\/\/(?:www\.)?aarau\.ch\/short\/\S+/i);
    let quellenText = mailKlartext;
    let quelleAufgeloest: string | undefined;

    if (kurzlinkMatch) {
      const zielUrl = await loeseKurzlinkAuf(kurzlinkMatch[0]);
      const seitenText = await ladeSeiteAlsText(zielUrl);
      if (seitenText) {
        quellenText = `Amtliche Seite (${zielUrl}):\n${seitenText}\n\nUrsprünglicher Mailtext:\n${mailKlartext}`;
        quelleAufgeloest = zielUrl;
      } else {
        console.warn(
          `Konnte ${zielUrl} nicht laden (blockiert oder nicht erreichbar) — nutze nur den Mailtext als Quellengrundlage.`,
        );
      }
    }

    const generiert = await generiereUndSchreibeArtikel({
      betreff,
      newsletterDatum,
      messageId,
      quellenText,
      quelleUrl: quelleAufgeloest,
      datePublished: new Date().toISOString().slice(0, 10),
    });
    console.log(`Artikel geschrieben: ${generiert.artikelPfad}`);

    // Prüfungen (Abschnitt 8) gegen die neue Ausgabe. Cache in content.ts
    // umgehen: readAusgabeOrdner direkt statt getAllAusgaben(), damit die neue
    // Ausgabe garantiert frisch von der Festplatte gelesen wird.
    const neueAusgabe = readAusgabeOrdner(generiert.ordner);
    const pruefResultat = await pruefeAusgabe(neueAusgabe);

    schreibeProtokoll({
      zeitpunkt,
      messageId,
      betreff,
      entscheid: "verarbeitet",
      grund: pruefResultat.bestanden
        ? "Alle Prüfungen bestanden, bereit für Commit durch den Workflow."
        : "Mindestens eine Prüfung fehlgeschlagen, siehe pruefungenBestanden.",
      ordner: generiert.ordner,
      quelleAufgeloest,
      pruefungenBestanden: pruefResultat.bestanden,
    });

    for (const e of pruefResultat.ergebnisse) {
      console.log(`  [${e.status}] ${e.nr}. ${e.name}`);
      for (const detail of e.details) console.log(`         ${detail}`);
    }

    if (!pruefResultat.bestanden) {
      console.error("Prüfungen fehlgeschlagen — Ausgabe bleibt im Workspace liegen, wird NICHT committet.");
      process.exit(1);
    }

    console.log("Alle Prüfungen bestanden.");
    process.exit(0);
  } catch (err) {
    const fehlermeldung = err instanceof Error ? err.message : String(err);
    const istAarauBlockiert = /HTTP 403/i.test(fehlermeldung) || /blockiert/i.test(fehlermeldung);

    schreibeProtokoll({
      zeitpunkt,
      messageId,
      betreff,
      entscheid: "fehler",
      grund: istAarauBlockiert
        ? "aarau.ch nicht erreichbar (403), später erneut versuchen."
        : "Unerwarteter Fehler, siehe Feld fehler.",
      fehler: fehlermeldung,
    });
    console.error(`Pipeline-Lauf fehlgeschlagen: ${fehlermeldung}`);
    process.exit(1);
  }
}

main();
