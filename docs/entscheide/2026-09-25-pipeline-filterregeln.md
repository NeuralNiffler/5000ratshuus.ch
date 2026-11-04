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

## Nachtrag 2026-11-04: Abgrenzung von «Planung»

**Anlass:** Die Medienmitteilung «Bestandessanierung und Baumersatz am
Zollrain» (03.11.2026) wurde als «Stadtplanung und Stadtraumgestaltung»
aufgenommen, obwohl sie keinen Beschluss, keine Kosten und keine Auflage
nannte. Die Ausgabe wurde wieder entfernt, die Zeile in der CSV bleibt als
Protokoll des damaligen Entscheids.

**Abgrenzung im Prompt:** «Planung» meint formelle Planungsverfahren und
-entscheide. Unterhalts-, Sanierungs- und Bauarbeiten sowie Baumersatz sind
nicht relevant, wenn die Mail keinen Beschluss, keinen Kredit und kein
Mitwirkungsverfahren nennt. Die Regel grenzt nach Art der Meldung ab, nicht
nach fehlenden Details: «Beschlüsse des Einwohnerrats» bleibt relevant, auch
wenn der Mailtext die einzelnen Beschlüsse nicht aufzählt.

**Warum im Prompt statt in `filter-regeln.json`:** Ein Betreff-Muster würde
nur diesen einen Fall treffen, das Problem war die Auslegung des Kriteriums.

**Folge:** Meldungen zu Vorhaben ohne Verfahren werden eher aussortiert. Das
entspricht «im Zweifel lieber nichts publizieren», zu Unrecht aussortierte
Mails lassen sich mit `erzwingen` nachholen.

## Grenzen

- Fehlerläufe werden nicht committet und stehen deshalb nicht in der CSV.
  Sie sind über Issues mit dem Label `pipeline-fehler` sichtbar.
- Die Zeilen der Läufe vom 23. bis 25.09.2026 (vor Einführung der CSV)
  wurden aus den Job Summaries und Step-Logs der Actions-Läufe nachgetragen.
  `quelle` ist dort immer `claude`, weil es noch keine festen Regeln gab.
- Jeder Entscheid ist ein Commit auf `main` und löst damit auch einen Build
  bei Cloudflare aus, selbst bei aussortierten Mails.
