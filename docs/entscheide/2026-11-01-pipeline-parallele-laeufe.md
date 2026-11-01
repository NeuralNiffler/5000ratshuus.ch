# Pipeline-Läufe verschiedener Mails parallel statt in einer Warteschlange

**Datum:** 2026-11-01
**Kontext:** Die Mail «Beschlüsse des Einwohnerrats» vom 30.10.2026 kam an,
erzeugte aber weder eine Ausgabe noch eine Zeile in
[`pipeline-entscheide.csv`](../pipeline-entscheide.csv) noch ein Fehler-Issue.

## Was passiert war

Um 10:52 UTC kamen drei Mails in derselben Sekunde an (Einbürgerungsgesuche,
Baugesuche Woche 44, Beschlüsse des Einwohnerrats), also drei
`repository_dispatch`-Läufe. Der Workflow hatte eine einzige
Concurrency-Gruppe `pipeline`. GitHub hält pro Gruppe höchstens **einen
laufenden und einen wartenden** Lauf. Kommt ein dritter dazu, bricht GitHub
den wartenden ab, bevor sein Job startet. `cancel-in-progress: false`
schützt nur den laufenden. Weil der abgebrochene Lauf nie startet, läuft
auch der Schritt nicht, der bei Fehlern ein Issue anlegt: Die Mail ging
lautlos verloren.

## Entscheid

- Concurrency-Gruppe **pro `message_id`** (`pipeline-<message_id>`). Läufe
  verschiedener Mails laufen parallel, zwei Auslösungen derselben Mail
  bleiben hintereinander (dazu kommt die Idempotenz in `run-pipeline.ts`).
- Der Push-Schritt holt parallele Commits per `git pull --rebase` nach und
  versucht den Push bis zu dreimal. Die CSV verträgt das dank
  `merge=union` in `.gitattributes`. Jede Ausgabe liegt in einem eigenen
  Ordner, deshalb gibt es dort keine Konflikte.

## Verworfen

- **Globale Gruppe behalten, Worker verzögert die Dispatches:** verschiebt
  das Problem nur. Bei genug Mails in kurzer Zeit geht wieder eine verloren.
- **Wiederholen im Worker, bis der Lauf startet:** Der Worker sieht nicht,
  ob GitHub den Lauf später abbricht.

## Nachholen

Ein so abgebrochener Lauf lässt sich mit `gh run rerun <run-id>` neu starten.
Der Re-Run bekommt dieselben Nutzdaten (Betreff, Mailtext, `message_id`).
