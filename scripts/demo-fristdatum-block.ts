/**
 * Einmalig ausführbarer Nachweis für Abnahmekriterium 5 (Entwicklungsdokument
 * Abschnitt 10): "ein absichtlich eingebautes Fristdatum blockiert die
 * Publikation nachweislich." Bewusst kein Testrunner (Nutzerentscheid) —
 * ein On-Demand-Skript, das eine Ausgabe kopiert, unverändert als
 * Negativkontrolle einliest, dann ein Fristdatum einbaut und den Abbruch
 * erwartet. Dazu zwei Proben für die zweistufige Prüfung (siehe
 * docs/entscheide/2026-09-26-fristdatum-pruefung-enger.md): eine
 * Bewerbungsfrist mit Datum geht bei einem nicht referendumspflichtigen
 * Geschäft durch und blockiert bei einem referendumspflichtigen.
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
mkdirSync(baseDir, { recursive: true });

function aufraeumen() {
  rmSync(baseDir, { recursive: true, force: true });
}

/**
 * Frische Kopie der Quellausgabe, erstes Geschäft verändert, dann einlesen.
 * Gibt die Fehlermeldung zurück oder null, wenn das Einlesen durchging.
 */
function probe(nr: number, veraendere: (geschaeft: Record<string, unknown>) => void): string | null {
  const ordner = `${DEMO_ORDNER}-${nr}`;
  const dir = join(baseDir, ordner);
  cpSync(QUELL_DIR, dir, { recursive: true });
  const geschaeftePath = join(dir, "geschaefte.json");
  const geschaefte = JSON.parse(readFileSync(geschaeftePath, "utf-8"));
  veraendere(geschaefte[0]);
  writeFileSync(geschaeftePath, JSON.stringify(geschaefte, null, 2));
  try {
    readAusgabeOrdner(ordner, baseDir);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

function erwarteBlock(beschreibung: string, meldung: string | null) {
  if (meldung === null) {
    console.error(`✗ ${beschreibung}: hätte blockieren müssen, wurde aber eingelesen.`);
    process.exitCode = 1;
  } else if (!/frist/i.test(meldung)) {
    console.error(`✗ ${beschreibung}: geworfen, aber nicht wegen des Fristdatums: ${meldung}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${beschreibung}: blockiert.\n  Meldung: ${meldung}`);
  }
}

function erwarteDurchgang(beschreibung: string, meldung: string | null) {
  if (meldung === null) {
    console.log(`✓ ${beschreibung}: eingelesen.`);
  } else {
    console.error(`✗ ${beschreibung}: hätte durchgehen müssen: ${meldung}`);
    process.exitCode = 1;
  }
}

const anhaengen = (g: Record<string, unknown>, satz: string) => {
  g.kurztext = `${(g.kurztext as string | null) ?? ""} ${satz}`;
};

try {
  // 1. Negativkontrolle: unverändert eingelesen darf NICHT werfen.
  erwarteDurchgang(`Negativkontrolle, "${QUELL_ORDNER}" unverändert`, probe(1, () => {}));

  // 2. Nachweis: Referendumsfrist mit Datum MUSS blockieren, egal ob das
  //    Geschäft als referendumspflichtig markiert ist.
  erwarteBlock(
    "Referendumsfrist mit Datum",
    probe(2, (g) => {
      g.referendumspflichtig = false;
      anhaengen(g, "Die Referendumsfrist läuft bis 18. September 2026.");
    }),
  );

  // 3. Andere Frist bei nicht referendumspflichtigem Geschäft: erlaubt.
  erwarteDurchgang(
    "Bewerbungsfrist mit Datum, nicht referendumspflichtig",
    probe(3, (g) => {
      g.referendumspflichtig = false;
      anhaengen(g, "Die Bewerbungsfrist läuft bis 26. Oktober 2026.");
    }),
  );

  // 4. Dieselbe Frist bei referendumspflichtigem Geschäft: blockiert, weil
  //    sie mit der Referendumsfrist verwechselt werden könnte.
  erwarteBlock(
    "Bewerbungsfrist mit Datum, referendumspflichtig",
    probe(4, (g) => {
      g.referendumspflichtig = true;
      anhaengen(g, "Die Bewerbungsfrist läuft bis 26. Oktober 2026.");
    }),
  );
} finally {
  aufraeumen();
}
