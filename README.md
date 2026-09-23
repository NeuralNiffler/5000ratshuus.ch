# 5000ratshuus.ch

Aarauer Kommunalpolitik, übersichtlich kategorisiert und quellenverlinkt.

Beschlüsse und Mitteilungen der Stadt Aarau, jeder Eintrag mit Link zur
amtlichen Originalquelle. Anlass für jeden Artikel ist eine Ausgabe des
Newsletters der Stadt Aarau (`kommunikation@aarau.ch`). Verlinkt wird immer auf
die tiefstmögliche amtliche Quelle.

Die Seite ist ein privates, nicht kommerzielles Projekt. Sie
wird nicht von der Stadt Aarau betrieben, beauftragt oder unterstützt und zeigt
keine Werbung.

Der Code ist in Zusammenarbeit mit KI entstanden, die Artikel erzeugt die Pipeline automatisch mit der Claude API.

Die Website ist live auf https://5000ratshuus.ch.

## 🛠 Tools & Technik

* **Website:** statisch generiert mit [Astro](https://astro.build/) und TypeScript.
* **Daten:** Jede Newsletter-Ausgabe ist ein eigener Ordner mit dem Artikel (`artikel.md`) und den einzelnen Geschäften (`geschaefte.json`). [Zod](https://zod.dev/) prüft beim Einlesen die Struktur. Für die Archivseiten nach Thema und Art entsteht bei jedem Build ein SQLite-Index.
* **Hosting:** Cloudflare Workers (Static Assets für die Seite, eigene Worker für Kontaktformular und Mail-Eingang, Cloudflare Email Routing)
* **Pipeline:** GitHub Actions und die Claude API (Anthropic) zum Kategorisieren und Erzeugen der Artikel
* **Laufzeit:** Node.js ≥ 22.12

## 🚀 Setup & Ausführung

**Voraussetzungen:** Node.js ≥ 22.12 und npm. Für die Website selbst sind keine
Zugangsdaten nötig, nur für Deployment und Pipeline (siehe unten).

1. **Abhängigkeiten installieren**

   ```sh
   npm install
   ```

2. **Dev-Server starten**

   ```sh
   npm run dev
   ```

   Die Seite läuft dann auf http://localhost:4321. Änderungen erscheinen nach
   dem Speichern automatisch, der SQLite-Index wird bei jeder Anfrage neu
   gebaut. Im Hintergrund: `npx astro dev --background`, verwaltet mit
   `npx astro dev status`, `npx astro dev logs` und `npx astro dev stop`.

3. **Prüfen**

   ```sh
   npm run check                        # Typprüfung (astro check)
   npm run check:artikel                # Prüfungen vor der Publikation, alle Ausgaben
   npm run check:artikel -- --offline   # dasselbe ohne Erreichbarkeitsprüfung der Quellen
   npm run demo:fristdatum-block        # Nachweis: ein Fristdatum blockiert die Publikation
   ```

4. **Bauen**

   ```sh
   npm run build     # SQLite-Index, dann die statische Seite nach ./dist/
   npm run preview   # Vorschau des Builds
   ```

### Worker lokal testen

Beide Worker sind eigene Projekte mit eigenem `package.json`. Wrangler direkt
immer mit `-c wrangler.toml` aufrufen, sonst kann es die `wrangler.jsonc` im
Repo-Root nehmen. Die npm-Skripte des Eingangs-Workers tun das bereits.

**Kontaktformular** (`workers/kontakt/`):

```sh
cd workers/kontakt
npm install
npm run dev
```

Lokal lässt sich die Validierung testen, der echte Mailversand braucht Email
Routing auf der Domain.

**Mail-Eingang** (`workers/eingang/`):

```sh
cd workers/eingang
npm install
GITHUB_TOKEN=fake npm run dev -- --var GITHUB_TOKEN:fake --port 8799
# in einem zweiten Terminal eine Testmail einspielen:
curl -X POST "http://localhost:8799/cdn-cgi/handler/email?from=kommunikation@aarau.ch&to=newsletter@5000ratshuus.ch" \
  --data-binary $'From: Stadt Aarau <kommunikation@aarau.ch>\r\nSubject: Test\r\nMessage-ID: <t1@test>\r\n\r\nText'
```

## ☁️ Deployment

| Teil | Wie | Benötigt |
| --- | --- | --- |
| Website | automatisch über die Cloudflare-Git-Integration bei jedem Push auf `main` | – |
| Kontakt-Worker | von Hand: `cd workers/kontakt && npx wrangler deploy -c wrangler.toml` | Cloudflare-Login, Zieladresse in Email Routing verifiziert |
| Eingangs-Worker | von Hand: `cd workers/eingang && npx wrangler deploy -c wrangler.toml` | Wrangler-Secret `GITHUB_TOKEN` (`npx wrangler secret put GITHUB_TOKEN`) |
| Pipeline | GitHub Action `pipeline.yml`, ausgelöst vom Eingangs-Worker oder von Hand (`workflow_dispatch`) | Repo-Secret `ANTHROPIC_API_KEY` |

Ablauf der Pipeline: Mail an Worker Email → Eingangs-Worker →
GitHub Action `pipeline.yml` → Commit → automatischer Deploy der Website.

## 📁 Projektstruktur

| Pfad | Inhalt |
| --- | --- |
| `src/` | **Website:** Seiten, Layout, Komponenten, Artikeldaten und Leselogik (siehe unten) |
| `scripts/` | SQLite-Index (`build-index.ts`, läuft als `prebuild`), Prüfungen (`check-artikel.ts`), Fristdatum-Nachweis und `pipeline/` (Kategorisieren, Quellen auflösen, Artikel erzeugen) |
| `workers/kontakt/` | Cloudflare Worker für das Kontaktformular |
| `workers/eingang/` | Email Worker: Newsletter-Mail → GitHub-Pipeline |
| `.github/workflows/` | Pipeline und Alarm bei ausbleibenden Ausgaben |
| `docs/` | Entwicklungsdokument, Umsetzungsplan und datierte Architekturentscheide (`docs/entscheide/`) |
| `pipeline-testdaten/` | Beispielmail zum Testen der Pipeline |
| `public/` | statische Dateien (Favicon, `robots.txt`) |

Aufbau von `src/`:

```text
src/
├── content/ausgaben/<ausgabe>/
│   ├── artikel.md         # Frontmatter + optionaler Fliesstext
│   └── geschaefte.json    # einzelne Geschäfte (Entwicklungsdokument Abschnitt 9)
├── lib/
│   ├── schema.ts          # Zod-Schemas
│   ├── content.ts         # Einlesen + Validieren, ohne Astro-Bezug
│   ├── index-db.ts        # SQLite-Index fürs Archiv nach Thema/Art
│   ├── checks.ts          # Prüfungen vor der Publikation (Abschnitt 8)
│   └── url-check.ts       # Erreichbarkeit der Quell-URLs
├── components/            # ArtikelA, ArtikelB, JsonLd, Korrekturhinweis, ...
├── layouts/BaseLayout.astro
├── pages/                 # Startseite, Artikel, Archiv, Über, Kontakt, RSS, Impressum, ...
└── site.config.ts         # Name, Domain, Disclaimer- und Hinweistexte (zentral)
```
