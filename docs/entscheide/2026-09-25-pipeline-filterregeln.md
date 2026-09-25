# Filterregeln und Entscheidungsliste der Pipeline

**Datum:** 2026-09-25
**Kontext:** Robin wollte sehen, welche Newsletter-Mails zum Artikel werden
und welche nicht, und bei Bedarf eingreifen.

## Entscheid

Ob eine Mail zum Artikel wird, entscheidet die Pipeline in dieser
Reihenfolge ([`run-pipeline.ts`](../../scripts/pipeline/run-pipeline.ts)):

1. **Idempotenz:** Ist die `messageId` schon als Ausgabe vorhanden, wird die
   Mail übersprungen.
2. **`--erzwingen`** (Workflow-Input `erzwingen`): verarbeiten, ohne weitere
   Prüfung.
3. **`nieAufnehmen`** in
   [`filter-regeln.json`](../../scripts/pipeline/filter-regeln.json):
   aussortieren.
4. **`immerAufnehmen`**: verarbeiten.
5. Sonst **Claude** (`kategorisiereAusgabe()`, Kriterien im Prompt in
   `prompts.ts`).

Jeder Entscheid wird als Zeile an
[`docs/pipeline-entscheide.csv`](../pipeline-entscheide.csv) angehängt und
vom Workflow committet, auch wenn die Mail aussortiert wurde.

## Warum

- **Teilstrings statt Regex, nur gegen den Betreff:** Die Regeln sollen ohne
  Technikwissen editierbar sein. Der Betreff ist kurz und zeigt die Art der
  Mail zuverlässiger als der lange Mailtext.
- **„Nie“ schlägt „immer“:** Im Zweifel lieber nichts publizieren. Eine zu
  Unrecht aussortierte Mail lässt sich mit `erzwingen` nachholen, ein zu
  Unrecht publizierter Artikel ist schon draussen.
- **CSV im Repo:** Die Job Summary von GitHub Actions verfällt nach etwa 90
  Tagen, `.build/` ist nicht versioniert. GitHub zeigt eine CSV als
  durchsuchbare Tabelle an. Weil das Repo öffentlich ist, stehen in der CSV
  weder Mailtext noch `messageId`, nur der Betreff (der Newsletter ist
  öffentlich) und der Grund.

## Grenzen

- Fehlerläufe werden nicht committet und stehen deshalb nicht in der CSV.
  Sie sind über Issues mit dem Label `pipeline-fehler` sichtbar.
- Jeder Entscheid ist ein Commit auf `main` und löst damit auch einen Build
  bei Cloudflare aus, selbst bei aussortierten Mails.
