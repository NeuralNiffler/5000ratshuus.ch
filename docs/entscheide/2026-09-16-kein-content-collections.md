# Kein Astro Content-Collections-Loader für Ausgaben

**Datum:** 2026-09-16
**Kontext:** Bauauftrag Phase 1a (Website-Gerüst)

## Entscheid

Ausgaben (`artikel.md` + `geschaefte.json`) werden **nicht** über Astros
Content-Collections-API eingelesen, sondern über ein eigenes, reines
Node/TypeScript-Modul: [`src/lib/content.ts`](../../src/lib/content.ts),
mit Zod-Schemas in [`src/lib/schema.ts`](../../src/lib/schema.ts).

## Warum

1. **Zwei Dateiformen pro Ausgabe.** Content Collections sind darauf
   ausgelegt, eine Dateiform (z. B. alle `.md`-Dateien eines Ordners) zu
   einer Collection zu machen. `artikel.md` und `geschaefte.json` gehören
   aber fachlich zusammen (eine Ausgabe = ein Artikel + seine Geschäfte) und
   `geschaefte.json` ist zudem ein *Array*, das pro Eintrag eine eigene,
   abfragbare Einheit sein soll (für den SQLite-Index und spätere
   Archivseiten) — das hätte einen eigenen, nicht-trivialen Custom Loader
   gebraucht.
2. **Wiederverwendung ausserhalb von Astro.** Laut Entwicklungsdokument
   Abschnitt 12 soll dieselbe Logik später die Pipeline (Phase 1c, GitHub
   Actions) und die Prüfungen (Phase 1b) verwenden — beides läuft als
   eigenständiges Node-Skript, nicht innerhalb von Astro. Ein
   Content-Collections-Loader ist an Astros Build/Dev-Lebenszyklus gebunden
   und liesse sich nicht 1:1 aus einem CLI-Skript aufrufen. Ein einfaches
   TypeScript-Modul mit `fs`-Zugriff dagegen schon (siehe
   `scripts/build-index.ts`, das dieselbe Funktion nutzt wie die
   Astro-Seiten).
3. **Eine Schema-Quelle für alles.** Mit einem eigenen Modul liegen Zod-
   Schema, Lese-/Validierungslogik und (später) die Prüfungen aus
   Abschnitt 8 an einem Ort, unabhängig vom Astro-spezifischen
   `zod`-Wrapper, den Content Collections intern verwenden.

## Nachteil, bewusst in Kauf genommen

- Kein automatisches Astro-Tooling (z. B. `astro:content`-Typen, Content-
  Layer-Caching). Bei zwei bis wenigen Dutzend Ausgaben ist der
  Performance-Nachteil (alles wird bei jedem Zugriff neu von der Platte
  gelesen, siehe `cache`-Variable in `content.ts`) vernachlässigbar; sollte
  die Zahl der Ausgaben stark wachsen, ist das neu zu bewerten.
- Eigene Fehlerbehandlung statt Astros eingebauter Content-Collection-
  Fehlermeldungen — dafür mit projektspezifischen, verständlicheren
  Fehlertexten (z. B. Verweis auf die konkrete Regel aus Abschnitt 6).

## Pfad relativ zu `process.cwd()`, nicht `import.meta.url`

Nebenentscheid in derselben Datei: `CONTENT_DIR` und `DB_PATH`
(`src/lib/index-db.ts`) werden relativ zu `process.cwd()` aufgelöst, nicht
über `new URL(..., import.meta.url)`. Astro bündelt Quelldateien beim Build
in Chunks an einem anderen Ort im `dist/`-Baum; ein `import.meta.url`-Pfad
hätte nach dem Bündeln ins Leere gezeigt (in der Praxis beim ersten
`npm run build` aufgetreten und so behoben). `process.cwd()` ist zuverlässig,
weil `npm run dev`, `npm run build` und `tsx scripts/build-index.ts` alle
vom Projekt-Root aus laufen (siehe `package.json`-Skripte).
