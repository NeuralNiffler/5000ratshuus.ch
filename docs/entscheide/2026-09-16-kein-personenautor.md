# Kein Personenautor in Meta-Angaben und JSON-LD

**Datum:** 2026-09-16
**Kontext:** Bauauftrag Phase 1a (Website-Gerüst)

## Entscheid

Artikel führen **keinen** `meta name="author"` und **kein**
`author: { "@type": "Person" }` im JSON-LD. Stattdessen steht im JSON-LD ein
`publisher` als `Organization` mit dem Seitennamen
([`src/components/JsonLd.astro`](../../src/components/JsonLd.astro)).

Die Templates A und B in `docs/aarau-newsletter-artikel/SKILL.md` setzen
`meta name="author" content="Robin Schmid"` und
`author: { "@type": "Person", "name": "Robin Schmid" }`. Das wird für Phase 1a
bewusst nicht übernommen.

## Warum

Im Rückfragen-Gespräch vom 2026-09-16 auf die Frage nach der Autorzeile:
„Autor ist ja eigentlich niemand … bzw. die Stadt Aarau — ich würde sie
wegnehmen." Daraus folgt:

- Kein Personenautor, weil inhaltlich niemand als Verfasser/in im
  journalistischen Sinn auftritt.
- Die Stadt Aarau wird **nicht** als Autorin oder Herausgeberin geführt,
  obwohl sie die Quelle ist — das würde den Anschein von Amtlichkeit
  erwecken, den Abschnitt 13 des Entwicklungsdokuments ausdrücklich
  ausschliesst ("Die Seite darf nicht wie ein Angebot der Stadt Aarau
  aussehen"). Die Stadt Aarau erscheint stattdessen ausschliesslich in
  `isBasedOn` und `citation` als Quelle.

## Konsequenz für die Autorenfrage im Impressum

Das Impressum nennt seit 2026-09-19 Robin Schmid, Aarau, als Betreiber.
Dieser Entscheid regelt nur die *sichtbare Autorenangabe pro Artikel*, nicht
die Verantwortlichkeit im Impressum.

## Verworfen

- **„Robin Schmid" wie in den Templates**: verworfen laut explizitem
  Entscheid oben.
- **„Stadt Aarau" als Autorin**: verworfen wegen Anschein von Amtlichkeit
  (Abschnitt 13).
