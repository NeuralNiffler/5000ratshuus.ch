# CLAUDE.md / AGENTS.md — 5000ratshuus.ch

Projektregeln für dieses Repository. Verbindliche Quelle ist
[`docs/Entwicklungsdokument - Aarau Politik-Newsletter.md`](docs/Entwicklungsdokument%20-%20Aarau%20Politik-Newsletter.md);
dieses Dokument fasst die für den Code relevanten Regeln zusammen und macht
sie durchsuchbar. Im Konfliktfall gilt das Entwicklungsdokument, mit den in
[`docs/entscheide/`](docs/entscheide/) dokumentierten Abweichungen.

## Was diese Seite ist

Ein quellenverlinkter Blog zur Aarauer Kommunalpolitik. Artikel entstehen aus
dem Newsletter der Stadt Aarau (`kommunikation@aarau.ch`), der nur der
Aufhänger ist — jeder Artikel verlinkt auf die tiefstmögliche amtliche
Originalquelle, nie nur auf die Zusammenfassungsseite oder die Mail.

## Entwicklung

```bash
npm install
npm run dev              # Astro-Dev-Server, baut den SQLite-Index bei jeder Anfrage neu
npm run build            # prebuild (SQLite-Index) + astro build nach dist/
npm run check            # astro check (Typprüfung)
npm run check:artikel    # Prüfungen vor der Publikation (Abschnitt 8), alle Ausgaben
npm run demo:fristdatum-block  # Nachweis: Fristdatum blockiert die Publikation
```

Dev-Server im Hintergrund starten: `astro dev --background`, verwaltet mit
`astro dev stop`, `astro dev status`, `astro dev logs`.

Der Kontakt-Worker liegt separat in `workers/kontakt/` mit eigenem
`package.json`. Lokal testen: `cd workers/kontakt && npm install && npm run dev`.

Der Mail-Eingang (Email Worker, Newsletter-Mail → `repository_dispatch` →
`.github/workflows/pipeline.yml`) liegt in `workers/eingang/`, ebenfalls mit
eigenem `package.json`. Wrangler immer mit `-c wrangler.toml` aufrufen (die
npm-Skripte tun das), sonst nimmt es die `wrangler.jsonc` im Repo-Root. Werte
aus der Mail (Betreff, Text) im Workflow nie per `${{ ... }}` in `run:`
einsetzen, nur über `env:` (Script-Injection).

## Astro-Dokumentation

Vor Arbeiten an den folgenden Themen konsultieren:

- [Seiten, dynamische Routen, Middleware](https://docs.astro.build/en/guides/routing/)
- [Astro-Komponenten](https://docs.astro.build/en/basics/astro-components/)
- [Framework-Komponenten (React, Vue, Svelte, ...)](https://docs.astro.build/en/guides/framework-components/)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/) —
  in diesem Projekt **bewusst nicht verwendet**, siehe
  [`docs/entscheide/2026-09-16-kein-content-collections.md`](docs/entscheide/2026-09-16-kein-content-collections.md)
- [Styling](https://docs.astro.build/en/guides/styling/)
- [Internationalisierung](https://docs.astro.build/en/guides/internationalization/)

## Architektur (Kurzfassung)

Siehe Entwicklungsdokument Abschnitt 12 für die vollständige Begründung und
verworfene Alternativen; hier nur die Umsetzung:

- **Astro**, statischer Output, kein Framework-JS im Browser.
- **Artikelformat**: ein Ordner pro Ausgabe unter `src/content/ausgaben/`,
  mit `artikel.md` (Frontmatter, siehe [`src/lib/schema.ts`](src/lib/schema.ts))
  und `geschaefte.json` (die einzelnen Geschäfte, siehe Abschnitt 9 unten).
  Einlesen und Validieren läuft über [`src/lib/content.ts`](src/lib/content.ts) —
  reines Node/TypeScript ohne Astro-Abhängigkeit, damit dieselbe Logik später
  von der Pipeline (Phase 1c) wiederverwendet werden kann.
- **Template A/B** wird nicht gewählt, sondern aus der Anzahl Geschäfte
  berechnet (`templateFuer()` in `schema.ts`): eines → B (Einzelthema),
  mehrere → A (Beschlussliste). Siehe
  [`docs/entscheide/2026-09-25-template-aus-anzahl-geschaefte.md`](docs/entscheide/2026-09-25-template-aus-anzahl-geschaefte.md).
- **SQLite-Index**: [`src/lib/index-db.ts`](src/lib/index-db.ts) baut bei
  jedem Build (und bei jeder Dev-Anfrage) eine SQLite-Datei unter `.build/`
  aus den `geschaefte.json`-Dateien. Daraus entstehen die Archivseiten nach
  Thema (`/archiv/thema/<tag>/`) und Art des Geschäfts (`/archiv/art/<art>/`).
  Die Dateien im Repository bleiben die Quelle der Wahrheit, `.build/` ist
  nicht versioniert.
- **Slugs**: reines ASCII, `ä→ae`, `ö→oe`, `ü→ue`, kein Eszett. Weicht von
  F4/Abschnitt 7 des Entwicklungsdokuments ab, siehe
  [`docs/entscheide/2026-09-16-slug-regel.md`](docs/entscheide/2026-09-16-slug-regel.md).
- **Kein Personenautor**: Im JSON-LD steht `publisher` (Organization), kein
  `author: Person`. Siehe
  [`docs/entscheide/2026-09-16-kein-personenautor.md`](docs/entscheide/2026-09-16-kein-personenautor.md).

- **SEO**: Meta-Angaben, Open Graph und Brotkrumen im
  [`BaseLayout.astro`](src/layouts/BaseLayout.astro) (Props `image`,
  `breadcrumbs`, `jsonLd`, `noindex`). Alle JSON-LD-Objekte entstehen in
  [`src/lib/jsonld.ts`](src/lib/jsonld.ts), Prüfung 7 prüft dieselben.
  Vorschaubilder (1200×630) generiert
  [`src/pages/og/[...pfad].png.ts`](src/pages/og/[...pfad].png.ts) beim Build
  mit satori + resvg, ohne Wappen oder Stadtlogo (Abschnitt 13). `lastmod` der
  Sitemap kommt aus [`src/lib/sitemap.ts`](src/lib/sitemap.ts).
- **KI-Crawler gesperrt**, nur klassische Suche: `public/robots.txt`, siehe
  [`docs/entscheide/2026-09-24-ki-crawler-gesperrt.md`](docs/entscheide/2026-09-24-ki-crawler-gesperrt.md).

## Redaktionelle Regeln (verbindlich, Entwicklungsdokument Abschnitt 6)

- **Referendumsfrist nie als Datum.** Auch wenn die Quelle sie nennt: nur der
  Status referendumspflichtig ja/nein, mit Verweis auf die Originalquelle
  für das genaue Datum. Einzige Ausnahme vom unbeaufsichtigten Betrieb, weil
  ein falsch übertragenes Datum eine echte Frist verpassen lassen könnte und
  das nachträglich nicht mehr korrigierbar ist. Technisch erzwungen in
  `assertKeinFristdatum()` in `src/lib/content.ts` (Heuristik: bricht den
  Build ab, wenn ein Datum in der Nähe des Worts "Frist" auftaucht).
- Eine **Bürgermotion** ist ein Bevölkerungsanliegen, keine gewöhnliche Motion.
- Nur Motionen/Postulate **amtierender Ratsmitglieder** gehören in die Gruppe
  „Motionen & Postulate".
- Ein **Status** (gewählt, überwiesen, nicht überwiesen, aufgenommen,
  abgeschrieben) wird nur gesetzt, wenn die Quelle ihn ausdrücklich nennt
  (Feld `ereignis`, sonst `null`).
- **Budget-/Politikplan-Zahlen sind Prognosen**: Badge „Budgetiert, nicht
  effektiv" (`frontmatter.forecast`).
- **Immer Franken.** Ein „€" in extrahierten Rohdaten ist ein Extraktionsfehler
  und wird korrigiert, nie übernommen.
- **Themen-Tags** stehen immer direkt beim einzelnen Geschäft (`tags[]` im
  jeweiligen Geschäft), nie als lose Tag-Wolke ohne Zuordnung.
  Nur Werte aus der festen Liste `THEMEN` in `src/lib/schema.ts`, höchstens
  3 pro Geschäft. Das Thema ist das Sachgebiet, nicht der Vorgang
  („Qualitätsüberprüfung“ oder „Sanierung“ sind nie ein Thema), siehe
  [`docs/entscheide/2026-09-23-themen-vokabular.md`](docs/entscheide/2026-09-23-themen-vokabular.md).
- Kein einleitender Lead-Satz unter der Überschrift, kein Wiederholen von
  Zahlen aus Meta-Zeile/Badges/Kennzahlen-Box, keine Wertung oder politische
  Einordnung, keine erfundenen Fakten oder unmarkierten Annahmen, keine
  interaktive Inline-Suche/Filter im Artikel.
- Deutsch (Schweiz): Umlaute als ö/ä/ü ausgeschrieben, kein Eszett — mit der
  einen Ausnahme der Slug-Regel oben.

## Prüfungen vor der Publikation (Entwicklungsdokument Abschnitt 8)

Umgesetzt in [`src/lib/checks.ts`](src/lib/checks.ts), aufrufbar über
`npm run check:artikel` ([`scripts/check-artikel.ts`](scripts/check-artikel.ts)).
Läuft bewusst **nicht** als Teil von `npm run build`/`prebuild` — nur
Prüfung 1 ist dort hart in `content.ts` verankert, die übrigen laufen nur
über `check:artikel` und später als Gate in der Pipeline (Phase 1c) vor dem
Commit, weil Prüfung 2 Live-Netzwerkaufrufe macht, die die lokale
Entwicklung nicht verlangsamen sollen. Reines Node/TS ohne Astro-Abhängigkeit,
verwendet dieselben Schemas aus `src/lib/schema.ts` und dieselbe Leselogik
aus `src/lib/content.ts`.

1. Kein Datum einer Referendumsfrist im Artikeltext (hart, blockiert) — läuft
   beim Einlesen in `content.ts` (`assertKeinFristdatum`), auch pro Geschäft
   (`titel`, `ereignis`, `kurztext`), nicht nur im Artikeltext.
2. Jedes Geschäft hat mindestens eine erreichbare Quell-URL, geprüft über
   [`src/lib/url-check.ts`](src/lib/url-check.ts) (`npm run check:artikel --
   --offline` überspringt diese Prüfung für schnelle lokale Iteration).
   **HTTP 403 zählt als eigener Status "blockiert"/"nicht_pruefbar"**, nicht
   als Fehlschlag: aarau.ch liefert aktuell 403 für automatisierte Anfragen
   und teils auch im normalen Browser (Stand 2026-09-16, Ursache unklar —
   Bot-Abwehr oder Störung). Nur echte tote Links (404/5xx/Timeout) blockieren.
   Davor läuft immer (auch mit `--offline`) eine **Formprüfung**
   (`istUnvollstaendigeDokumentUrl()` in `url-check.ts`): Eine Dokument-URL
   unter `/public/upload/assets/<Nr>/` ohne Dateiendung ist abgeschnitten und
   blockiert. Grund: Bei der Netzprüfung können 403/429 einen echten 404
   verdecken (so geschehen bei der Ausgabe 2026-08-28).

**Filter der Pipeline:** Welche Mails zum Artikel werden und welche
aussortiert wurden, steht in
[`docs/pipeline-entscheide.csv`](docs/pipeline-entscheide.csv) (eine Zeile
pro Lauf, vom Workflow committet, nie Mailtext oder `messageId`). Eingreifen:
Muster für den Betreff in
[`scripts/pipeline/filter-regeln.json`](scripts/pipeline/filter-regeln.json)
(`nieAufnehmen` vor `immerAufnehmen` vor Claude), einzelne Mail nachholen
über den manuellen Workflow-Lauf mit `erzwingen=true`. Siehe
[`docs/entscheide/2026-09-25-pipeline-filterregeln.md`](docs/entscheide/2026-09-25-pipeline-filterregeln.md).

**Herkunft von Links (Pipeline):** Das Modell darf URLs nur aus dem
geladenen Quellmaterial übernehmen. `findeUrlsOhneHerkunft()` in
`scripts/pipeline/resolve-sources.ts` vergleicht jede URL der generierten
Ausgabe mit den Links aus Quellseite und Mailtext (normalisiert, `?fp=`
darf fehlen); eine unbekannte oder gekürzte URL bricht den Lauf vor dem
Schreiben ab. Manuell angelegte Links immer vollständig von der amtlichen
Seite kopieren (Sitzungsseite des Einwohnerrats, inkl. `.pdf`).
3. Kein Eurozeichen im Text.
4. Kein Platzhalter aus dem Template (`{{...}}`) im Ergebnis.
5. Anzahl der Geschäfte im Artikel entspricht der Anzahl in der amtlichen
   Publikation. **Noch nicht umgesetzt** (Status `uebersprungen`) — die
   Vergleichszahl ist erst durch die Quellenauflösung der Pipeline (Phase 1c)
   bekannt, siehe TODO in `checks.ts`.
6. Disclaimer und Link zum Kontaktformular sind vorhanden — geprüft über
   `pruefeDisclaimerUndKontakt()`, liest `BaseLayout.astro` und bestätigt,
   dass `siteConfig.disclaimer`/`siteConfig.contactPath` dort referenziert
   sind. Läuft einmal global (seitenweit verankert), nicht pro Ausgabe.
7. Gültiges JSON-LD, gesetzte Meta-Angaben, gesetztes Publikationsdatum —
   rekonstruiert dieselbe Objektform wie `JsonLd.astro` gegen die
   Frontmatter-Daten, bewusst ohne echten `astro build`.
8. Keine leeren Abschnitte oder Tabellen ohne Zeilen — leere `geschaefte.json`
   bricht bereits beim Einlesen ab, leere Gruppen werden in `ArtikelA.astro`
   vor dem Rendern gefiltert, zusätzlich ein Regex-Schutz gegen eine leere
   Markdown-Tabelle im freien Fliesstext von Template B.

**Nachweis für Prüfung 1** (Abnahmekriterium, Abschnitt 10 #5): `npm run
demo:fristdatum-block` baut testweise ein Fristdatum in eine Kopie einer
Beispielausgabe ein (unter `.build/`, nie committet) und bestätigt, dass das
Einlesen dadurch hart abbricht. Kein permanenter Testrunner (bewusster
Entscheid, siehe Umsetzungsplan) — ein On-Demand-Nachweis.

## Datenanforderung (Entwicklungsdokument Abschnitt 9)

Jedes Geschäft in `geschaefte.json` enthält mindestens: stabile `id`, `titel`,
`art` (Wahl/Motion/Postulat/Bürgermotion/Reglement/Kredit/Sonstiges),
`urheber` (Name + Partei, nur wenn die Quelle sie nennt, sonst `null`),
`ereignis`, `referendumspflichtig`, `tags`, `sitzungsdatum`,
`publikationsdatum`, `quellen` und implizit `ausgabe` (aus dem Ordnernamen).
Verbindlich:

- Diese Daten werden **nur erzeugt und abgelegt**, nicht ausgewertet und
  nicht über Personen aggregiert dargestellt (keine Personenprofile in
  Phase 1/2).
- Personennamen erscheinen nur so, wie die amtliche Quelle sie nennt, nur im
  Zusammenhang mit dem konkreten Geschäft.
- Keine abgeleitete Bewertung, kein Score, kein Ranking — auch nicht als
  Nebenprodukt in den Daten oder im SQLite-Index.

## Korrekturen (F6)

Ein publizierter Artikel wird korrigiert, ohne die URL zu ändern: Eintrag in
`frontmatter.korrekturen` (`{ datum, beschreibung }`) ergänzen. Der Hinweis
erscheint automatisch sichtbar im Artikel (`Korrekturhinweis.astro`),
`dateModified` im JSON-LD wird automatisch aus dem jüngsten Korrektur-Datum
berechnet.

## Nicht in Phase 1/2 bauen

Keine Aggregation über Personen, keine Personenprofile, keine Scores
(Phase 3, siehe Entwicklungsdokument Abschnitt 4). Keine Kommentarfunktion,
keine Benutzerkonten, kein E-Mail-Versand an Abonnenten, keine
Backend-Volltextsuche, keine Mehrsprachigkeit.
