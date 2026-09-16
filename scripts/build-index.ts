/**
 * CLI-Einstieg für den SQLite-Build (Entwicklungsdokument Abschnitt 12).
 * Läuft als npm "prebuild"-Hook vor `astro build`, siehe package.json.
 * Die eigentliche Logik liegt in src/lib/index-db.ts, damit dieselbe
 * Funktion auch von den Astro-Archivseiten direkt verwendet werden kann
 * (dort ohne separaten Skript-Aufruf, siehe dortige Kommentare).
 */
import { buildIndex } from "../src/lib/index-db.ts";

buildIndex();
console.log("SQLite-Index gebaut: .build/index.sqlite");
