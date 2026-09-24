# KI-Crawler gesperrt, nur klassische Suche

**Datum:** 2026-09-24
**Kontext:** SEO-Ausbau (OG-Bilder, JSON-LD, Sitemap, robots.txt)

## Entscheid

Suchmaschinen dürfen die Seite crawlen, KI-Crawler nicht. Umgesetzt in
[`public/robots.txt`](../../public/robots.txt): eine Liste bekannter
KI-Bots mit `Disallow: /` und für alle übrigen die Cloudflare-Zeile
`Content-Signal: search=yes, ai-input=no, ai-train=no`.

Damit fällt GEO (Zitate in ChatGPT, Perplexity, Claude usw.) bewusst weg.
Es gibt deshalb auch keine maschinenlesbare Zusatzfassung (kein `llms.txt`,
kein Markdown pro Artikel, keine offenen Daten).

## Warum

Entscheid von Robin in der Rückfrage zum SEO-Ausbau („Nur klassische
Suche“).

## Grenzen

- robots.txt ist eine Bitte, keine Sperre. Wirksam sperren kann nur
  Cloudflare selbst (Dashboard: *Security → Bots → Block AI bots*).
- **Google AI Overviews** nutzen den normalen Googlebot. Sie lassen sich
  nicht sperren, ohne die Seite aus der Google-Suche zu nehmen.
  `Google-Extended` betrifft nur Gemini-Training und die Gemini-Apps.
- Die Bot-Liste veraltet. Neue Anbieter müssen von Hand ergänzt werden.
