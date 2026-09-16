# 5000ratshuus.ch

Ein quellenverlinkter Blog zur Aarauer Kommunalpolitik. Artikel entstehen aus
dem Newsletter der Stadt Aarau (`kommunikation@aarau.ch`), der nur der
Aufhänger ist — jeder Artikel verlinkt auf die tiefstmögliche amtliche
Originalquelle, nie nur auf die Zusammenfassungsseite oder die Mail.

Name und Domain sind ein Favorit, noch nicht endgültig entschieden (siehe
[`docs/entscheide/2026-09-16-stack.md`](docs/entscheide/2026-09-16-stack.md)).

Hintergrund, Anforderungen und redaktionelle Regeln:
[`docs/Entwicklungsdokument - Aarau Politik-Newsletter.md`](docs/Entwicklungsdokument%20-%20Aarau%20Politik-Newsletter.md),
Umsetzungsreihenfolge in
[`docs/Umsetzungsplan - Aarau Politik-Newsletter.md`](docs/Umsetzungsplan%20-%20Aarau%20Politik-Newsletter.md).
Projektregeln für die Entwicklung: [`AGENTS.md`](AGENTS.md) (= `CLAUDE.md`).

## Stand

**Phase 1a: Website-Gerüst.** Astro-Seite mit den zwei Beispielartikeln
(Template A: Beschlussliste, Template B: Einzelthema), Startseite, Archiv
(chronologisch, nach Thema, nach Art des Geschäfts über einen SQLite-Index),
RSS-Feed, Sitemap, Impressum/Datenschutz/Disclaimer (mit Platzhaltern),
Kontaktformular (Seite + Cloudflare-Worker-Code, lokal testbar, noch nicht
deployt).

**Noch nicht gebaut:** die acht Prüfungen vor der Publikation aus
Entwicklungsdokument Abschnitt 8 (Phase 1b) und die Pipeline vom
Newsletter-Eingang bis zum automatischen Publizieren (Phase 1c).

## Entwicklung

```sh
npm install
npm run dev      # Astro-Dev-Server auf localhost:4321
npm run build    # baut den SQLite-Index, dann die statische Seite nach ./dist/
npm run preview  # Vorschau des Builds
npm run check    # Typprüfung (astro check)
```

Kontakt-Worker lokal testen:

```sh
cd workers/kontakt
npm install
npm run dev      # wrangler dev, siehe workers/kontakt/wrangler.toml
```

## Projektstruktur

```text
src/
├── content/ausgaben/<ausgabe>/
│   ├── artikel.md        # Frontmatter + optionaler Fliesstext
│   └── geschaefte.json   # einzelne Geschäfte, siehe Abschnitt 9
├── lib/
│   ├── schema.ts          # Zod-Schemas (verbindlich, s. AGENTS.md)
│   ├── content.ts         # Einlesen + Validieren, kein Astro-Bezug
│   └── index-db.ts        # SQLite-Index fürs Archiv nach Thema/Art
├── components/             # ArtikelA, ArtikelB, JsonLd, Korrekturhinweis
├── layouts/BaseLayout.astro
└── pages/                  # Startseite, Artikel, Archiv, Impressum, ...
workers/kontakt/            # separates Cloudflare-Worker-Projekt
docs/entscheide/            # kurze, datierte Architekturentscheide
```
