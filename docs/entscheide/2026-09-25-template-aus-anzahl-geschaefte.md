# Template A/B aus der Anzahl Geschäfte

**Datum:** 2026-09-25
**Kontext:** Einzelne Medienmitteilungen (z. B. „Stadt Aarau hebt
Feuerwerksverbot auf“) erschienen mit Template A: Inhaltsverzeichnis mit
einem Eintrag, Gruppe „Abschliessend entschieden“, Untergruppe „Sonstige“
und eine Tabelle mit einer Zeile.

## Entscheid

Das Template steht nicht mehr im Frontmatter, sondern wird beim Einlesen
berechnet (`templateFuer()` in [`schema.ts`](../../src/lib/schema.ts),
Feld `ausgabe.template`):

- **genau ein Geschäft → Template B** (Einzelthema)
- **mehrere Geschäfte → Template A** (Beschlussliste)

Ist das einzige Geschäft referendumspflichtig, zeigt Template B einen
eigenen Referendumshinweis (ohne Datum, Verweis auf die Originalquelle),
den bisher nur Template A hatte.

## Warum

- **Ursache war eine freie Wahl ohne Regel:** Die Pipeline liess das Modell
  `"template": "A" | "B"` setzen, ohne Kriterium. 4 von 7 Einzelausgaben
  landeten so in A.
- **Die Regel ist die einzige sinnvolle:** Template B wiederholt Kennzahlen
  und Fliesstext pro Geschäft, mit mehreren Geschäften wäre es kaputt.
  Template A mit einem Geschäft ist das beschriebene Overkill. Alle
  korrekt gewählten Ausgaben (Budget 2027: 1 → B, Einwohnerrat 28.08.: 9 → A)
  folgen ihr bereits.
- **Ableiten statt vorschreiben:** Was sich aus den Daten ergibt, kann
  nicht falsch gewählt werden, weder vom Modell noch bei manuell angelegten
  Ausgaben.

## Verworfene Alternative

**Regel in den Prompt schreiben und das Modell weiter wählen lassen:**
verringert die Fehlerquote, schliesst sie aber nicht aus. Ein falsch
gewähltes Template fällt keiner Prüfung auf.
