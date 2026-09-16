/**
 * CLI für die acht Prüfungen vor der Publikation (Entwicklungsdokument
 * Abschnitt 8, umgesetzt in src/lib/checks.ts). Läuft NICHT als Teil von
 * "npm run build"/"prebuild" (siehe dortige Begründung in checks.ts) —
 * "Publikation" im Sinn von Abschnitt 8 ist der Commit+Push-Schritt der
 * Pipeline (Phase 1c), nicht ein lokaler Vorschau-Build.
 *
 *   npm run check:artikel                   Alle Ausgaben prüfen
 *   npm run check:artikel -- <ordnername>   Nur eine Ausgabe prüfen
 *   npm run check:artikel -- --offline      Ohne Prüfung 2 (Netzwerk)
 */
import { getAllAusgaben } from "../src/lib/content.ts";
import { pruefeAusgabe, pruefeDisclaimerUndKontakt } from "../src/lib/checks.ts";
import type { PruefStatus } from "../src/lib/checks.ts";

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const ordnerFilter = args.find((a) => !a.startsWith("--"));

const STATUS_LABEL: Record<PruefStatus, string> = {
  bestanden: "[OK]  ",
  fehlgeschlagen: "[FEHLER]",
  uebersprungen: "[SKIP]",
  nicht_pruefbar: "[N/A] ",
};

let alleBestanden = true;

let ausgaben;
try {
  ausgaben = getAllAusgaben();
} catch (err) {
  console.error(`Fehler beim Einlesen: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

if (ordnerFilter) {
  ausgaben = ausgaben.filter((a) => a.ordner === ordnerFilter);
  if (ausgaben.length === 0) {
    console.error(`Keine Ausgabe mit Ordner "${ordnerFilter}" gefunden.`);
    process.exit(1);
  }
}

const disclaimerErgebnis = pruefeDisclaimerUndKontakt();
console.log("Global (seitenweit, einmalig):");
console.log(
  `  ${STATUS_LABEL[disclaimerErgebnis.status]} ${disclaimerErgebnis.nr}. ${disclaimerErgebnis.name}`,
);
for (const detail of disclaimerErgebnis.details) console.log(`         ${detail}`);
if (disclaimerErgebnis.status === "fehlgeschlagen") alleBestanden = false;
console.log("");

for (const ausgabe of ausgaben) {
  const resultat = await pruefeAusgabe(ausgabe, { netz: !offline });
  console.log(`Ausgabe ${resultat.ordner}:`);
  for (const e of resultat.ergebnisse) {
    console.log(`  ${STATUS_LABEL[e.status]} ${e.nr}. ${e.name}`);
    for (const detail of e.details) console.log(`         ${detail}`);
  }
  if (!resultat.bestanden) alleBestanden = false;
  console.log("");
}

if (alleBestanden) {
  console.log("Alle Prüfungen bestanden (übersprungene/nicht prüfbare ausgenommen).");
  process.exit(0);
} else {
  console.error("Mindestens eine Prüfung ist fehlgeschlagen.");
  process.exit(1);
}
