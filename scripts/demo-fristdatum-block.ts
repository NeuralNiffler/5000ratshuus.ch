/**
 * Einmalig ausführbarer Nachweis für Abnahmekriterium 5 (Entwicklungsdokument
 * Abschnitt 10): "ein absichtlich eingebautes Fristdatum blockiert die
 * Publikation nachweislich." Bewusst kein Testrunner (Nutzerentscheid) —
 * ein On-Demand-Skript, das eine Ausgabe kopiert, unverändert als
 * Negativkontrolle einliest, dann ein Fristdatum einbaut und den Abbruch
 * erwartet.
 *
 *   npm run demo:fristdatum-block
 */
import { cpSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readAusgabeOrdner } from "../src/lib/content.ts";

const QUELL_ORDNER = "2026-08-28-einwohnerrat-beschluesse";
const QUELL_DIR = join(process.cwd(), "src/content/ausgaben", QUELL_ORDNER);
const DEMO_ORDNER = "demo-fristdatum";

// Unter .build/ (bereits gitignored), nicht in src/content/ausgaben/, damit
// die Demo nie versehentlich als echte Ausgabe eingelesen oder committet wird.
const baseDir = join(process.cwd(), ".build", `demo-fristdatum-${Date.now()}`);
const zielDir = join(baseDir, DEMO_ORDNER);
mkdirSync(baseDir, { recursive: true });

function aufraeumen() {
  rmSync(baseDir, { recursive: true, force: true });
}

try {
  cpSync(QUELL_DIR, zielDir, { recursive: true });

  // 1. Negativkontrolle: unverändert eingelesen darf NICHT werfen.
  readAusgabeOrdner(DEMO_ORDNER, baseDir);
  console.log(`✓ Negativkontrolle bestanden: "${QUELL_ORDNER}" wird unverändert ohne Fehler eingelesen.`);

  // 2. Fristdatum in ein Geschäft einbauen.
  const geschaeftePath = join(zielDir, "geschaefte.json");
  const geschaefte = JSON.parse(readFileSync(geschaeftePath, "utf-8"));
  geschaefte[0].kurztext =
    (geschaefte[0].kurztext ?? "") + " Die Referendumsfrist läuft bis 18. September 2026.";
  writeFileSync(geschaeftePath, JSON.stringify(geschaefte, null, 2));

  // 3. Erneutes Einlesen MUSS werfen.
  try {
    readAusgabeOrdner(DEMO_ORDNER, baseDir);
    console.error("✗ Nachweis NICHT erbracht: readAusgabeOrdner hat trotz Fristdatum nicht geworfen.");
    process.exitCode = 1;
  } catch (err) {
    const meldung = err instanceof Error ? err.message : String(err);
    if (/frist/i.test(meldung)) {
      console.log(`✓ Nachweis erbracht: Einlesen wurde blockiert.\n  Meldung: ${meldung}`);
    } else {
      console.error(`✗ Es wurde geworfen, aber nicht wegen des Fristdatums: ${meldung}`);
      process.exitCode = 1;
    }
  }
} finally {
  aufraeumen();
}
