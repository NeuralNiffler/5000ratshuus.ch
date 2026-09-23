# Feste Themenliste statt freier Themen-Tags

**Datum:** 2026-09-23
**Kontext:** Archiv nach Thema (`/archiv/thema/<tag>/`) nach den ersten
automatisch erzeugten Ausgaben

## Entscheid

Themen-Tags (`tags[]` pro Geschäft) dürfen nur Werte aus der festen Liste
`THEMEN` in [`src/lib/schema.ts`](../../src/lib/schema.ts) haben, höchstens
3 pro Geschäft (`MAX_THEMEN`). Ein Wert ausserhalb der Liste bricht das
Einlesen ab, wie bei `art`.

**Grundregel:** Ein Thema ist das Sachgebiet, um das es im Geschäft geht,
nicht die Art des Vorgangs. „Qualitätsüberprüfung“, „Sanierung“, „Verbot“
oder „Baurechtsvertrag“ beschreiben, *was* passiert, und kommen in jedem
Sachgebiet vor. Entscheidend ist, *woran* es passiert: die
Qualitätsüberprüfung einer Primarschule ist „Bildung & Schule“, die einer
Wasserversorgung „Umwelt & Energie“. Eigennamen (Schachenallee,
Walthersburg) sind ebenfalls nie ein Thema.

Grenzfall Bauvorhaben: Strassen, Wege, Plätze → „Verkehr & Mobilität“;
Gebäude, Nutzungsplanung, Denkmalschutz → „Bauen & Planung“.

Mehrere Themen sind erlaubt, wenn ein Geschäft wirklich mehrere
Sachgebiete betrifft (Oberstufenstandorte: Schule und Bau). „Finanzen“ steht
meist neben dem Sachgebiet, für das das Geld bestimmt ist; deshalb 3 statt 2.

„Politik“ umfasst den politischen Betrieb selbst (Wahlen in Rat und
Kommissionen, Stimmenzähler, Ratsorganisation), „Verwaltung & Organisation“
die Stadtverwaltung.

## Warum

Solange `tags` ein freies `string[]` war, hat die Pipeline pro Ausgabe neue
Schlagwörter erfunden (nach den ersten fünf Ausgaben 14 zusätzliche, darunter
`Schachenallee`, `Verbot`, `Qualitätsüberprüfung`). Fast jede Themenseite
enthielt damit genau ein Geschäft. Ein Archiv nach Thema ist nur nützlich,
wenn dieselben Themen wiederkehren.

## Umsetzung

- `src/lib/schema.ts`: `THEMEN`, `tags: z.array(z.enum(THEMEN)).max(MAX_THEMEN)`.
- `scripts/pipeline/prompts.ts`: Liste und Grundregel im Prompt, direkt aus
  `THEMEN` erzeugt.
- `scripts/pipeline/generate-article.ts`: Tags ausserhalb der Liste werden
  verworfen und als Warnung geloggt, statt den unbeaufsichtigten Lauf
  scheitern zu lassen.
- Bestehende Ausgaben einmalig umgestellt, jedes Geschäft einzeln nach
  seinem Sachgebiet eingeordnet.

## Nachteil, bewusst in Kauf genommen

- Die alten Archiv-URLs (`/archiv/thema/strassenbau/` usw.) verschwinden
  ohne Weiterleitung. Die Seite ist wenige Wochen alt.
- Ein neues Sachgebiet braucht eine Code-Änderung an `THEMEN`. Das ist
  gewollt: neue Themen sollen eine bewusste Entscheidung sein.
