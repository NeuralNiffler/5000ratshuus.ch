# Umsetzungsplan: Aarau Politik-Newsletter

_Projekt: `Venture Lab/26Q3 Aarau Politik-Newsletter/`_
_Erstellt: 2026-09-16_
_Zweck: Reihenfolge der Umsetzung von der Validierung bis zum Backfill, plus Liste der offenen Punkte. Lesen, bevor am Projekt weitergearbeitet wird. Die Spezifikation selbst (Anforderungen, Regeln, Abnahmekriterien) steht im `Entwicklungsdokument - Aarau Politik-Newsletter.md` und wird hier nicht wiederholt._

---

## Stand am 2026-09-16

Vorhanden: Entwicklungsdokument (Spezifikation für Claude Code), der manuell erprobte Skill `97_Skills/aarau-newsletter-artikel/SKILL.md` und zwei Beispielartikel (Template A und B).

Nicht vorhanden: Code, Repository, Website, Name, Domain, Empfangsadresse.

Die Architekturrichtung ist seit 2026-09-16 entschieden (Entwicklungsdokument, Abschnitt 12). Technisch blockiert nichts mehr den Bau, vor dem Bau steht nur noch die Validierung in Phase 0.

Einwand aus der Venture Lab Regel "kein Bauen vor der Validierung": Das Publikationsmodell ist entschieden, die riskanteste Annahme liegt jetzt bei der Leserschaft. Bisher ist Robin der einzige belegte Nutzer. Deshalb steht Phase 0 vor dem Bau.

---

## Phase 0: Validieren und entscheiden

1. **Leserschaft testen.** Die zwei bestehenden Beispielartikel auf einer einfachen Seite veröffentlichen und in Aarauer Kanälen teilen. Erfolgs- und Abbruchkriterium vor dem Test schriftlich festhalten, zum Beispiel Anzahl Rückmeldungen oder Feed-Abos innerhalb von 4 Wochen. Die konkreten Zahlen legt Robin fest.
2. **Zeit- und Geldbudget** für das Experiment festlegen: Domain, Formulardienst, Modellkosten pro Ausgabe.
3. **Betriebsmodell entscheiden.** Erledigt am 2026-09-16: Dateien im Repository mit SQLite-Index beim Build, Eingang über eine eigene Empfangsadresse, Pipeline als Job in der Cloud. Details und verworfene Alternativen im Entwicklungsdokument, Abschnitt 12. Variante C bleibt als Übergang möglich.
4. **Name und Domain** aus den drei Kandidaten wählen und im Chat bestätigen.

---

## Phase 1a: Website-Gerüst

5. Repository anlegen, das Entwicklungsdokument an Claude Code geben und den Stack-Vorschlag innerhalb der Architekturrichtung abnehmen (Entwicklungsdokument, Abschnitt 14, Schritt 2).
6. Im Repository eine `CLAUDE.md` mit den redaktionellen Regeln (Abschnitt 6), den Prüfungen (Abschnitt 8) und der Datenanforderung (Abschnitt 9) anlegen.
7. Website mit den Beispielartikeln bauen: Startseite, Artikelseiten, Archiv, RSS-Feed, Sitemap, Disclaimer, Kontaktformular.
8. Vor dem Live-Gang Impressum, Datenschutz und Urheberrecht klären (offene Punkte 6 bis 8).

---

## Phase 1b: Prüfungen

9. Die acht Prüfungen vor der Publikation (Abschnitt 8) als Code umsetzen. Mit einem absichtlich eingebauten Datum einer Referendumsfrist testen, ob die Publikation nachweislich blockiert wird.

---

## Phase 1c: Pipeline

10. Eigene Empfangsadresse einrichten und den Newsletter der Stadt darauf abonnieren. Eingang über den Maildienst mit festgehaltenem Verarbeitungsstand über die Message-ID, damit keine Ausgabe doppelt verarbeitet wird. Benachrichtigung, wenn längere Zeit keine Ausgabe eingeht.
11. Ausgaben kategorisieren und aussortieren, jeweils mit protokolliertem Grund.
12. Kurzlinks auflösen, Botschaft-PDFs im Sitzungsarchiv suchen, jeden Link auf Erreichbarkeit prüfen.
13. Artikel nach Template A oder B erzeugen, dazu pro Ausgabe eine strukturierte Datei mit den einzelnen Geschäften (Abschnitt 9).
14. Build und Deploy automatisieren. Korrekturen behalten die URL und zeigen einen Hinweis mit `dateModified`.
15. Protokoll pro Lauf schreiben, Robin bei Fehlern benachrichtigen.
16. Abnahme gegen die acht Kriterien der Phase 1 (Abschnitt 10).

---

## Phase 2: Backfill

17. Stichtag und Umfang festlegen, alte Ausgaben verarbeiten und als nachträglich erstellt markieren. Quelle ist Robins Gmail-Postfach, der Lauf kann einmalig lokal erfolgen.

---

## Phase 3: Wahlhilfe

Nicht bauen. Zuerst klären, ob die Urheberschaft pro Vorstoss strukturiert erfassbar ist oder nur aus dem Fliesstext der Sitzungsprotokolle.

---

## Offene Punkte

| # | Punkt | Blockiert | Vorschlag / Stand |
|---|---|---|---|
| 1 | Leserschaft ausserhalb von Robin | Sinn des Baus | Test aus Schritt 1 |
| 2 | Erfolgs- und Abbruchkriterium, Budget | Start des Experiments | Vor dem Test festhalten |
| 4 | Name und Domain | Impressum, Branding | 5000 Rathuus Post, Rathuus5000, 5000 Rathuus |
| 5 | Dienst für das Kontaktformular | Abnahme Phase 1 | Mit dem Stack-Vorschlag |
| 6 | Impressum und Verantwortlichkeit | Live-Gang | Laut Praxisquellen zielt die gesetzliche Pflicht vor allem auf kommerzielle Angebote. Ob Robin mit vollem Namen auftritt, ist sein Entscheid. Keine Rechtsberatung. Quelle: https://www.cyon.ch/blog/impressum-websites |
| 7 | Datenschutzhinweis zum Kontaktformular | Live-Gang | Das Formular sammelt Personendaten, ein Hinweis ist vermutlich nötig. Nicht verifiziert. |
| 8 | Urheberrecht an amtlichen Texten | Live-Gang | Art. 5 URG nimmt amtliche Erlasse, Protokolle und Berichte von Behörden vom Schutz aus. Ob Medienmitteilungen darunter fallen, ist offen. Quelle: https://www.rechtundgesetz.ch/15_76_309_URG_gesetzestexte_artikel_5_Art_5_Nicht_geschuetzte_Werke.html |
| 9 | Gmail-Zugang für den Backfill | Phase 2 | Der laufende Betrieb braucht keinen Gmail-Zugang mehr. Für den Backfill einmalig lokal auf Gmail zugreifen. |
| 10 | Modellkosten pro Ausgabe | Budget | Beim ersten Lauf messen |
| 11 | Umfang des Backfills | Phase 2 | Annahme: 6 Monate oder 10 Ausgaben |
| 12 | Skill auf Automatik umstellen | Variante C | Workflow-Schritt 6 im Skill nennt noch "manueller Test-Workflow" |
| 13 | Einordnung und Meinungsebene | Nichts | Artikel bleiben vorerst neutral |
| 14 | Wahlhilfe: Datenlage pro Vorstoss | Phase 3 | Unvalidiert |
| 15 | Dienst für eingehende Mails und Empfangsadresse | Phase 1c | Mit dem Stack-Vorschlag, Kandidaten Cloudflare Email Workers oder Postmark Inbound. `[Annahme]` Der Newsletter der Stadt lässt sich mit jeder Adresse abonnieren, beim Abo prüfen. |

---

_Erstellt am 2026-09-16 aus dem Entwicklungsdokument, dem Projekt-`MEMORY.md` und dem Skill `aarau-newsletter-artikel`. Wenn ein offener Punkt entschieden ist, die Zeile hier entfernen und den Entscheid unter Key Decisions im Projekt-`MEMORY.md` ablegen. Änderungen hier datiert notieren: `[YYYY-MM-DD] was geändert wurde`._

_[2026-09-16] Architekturrichtung entschieden: Phase 0 Schritt 3 als erledigt markiert, Schritte 5, 10 und 17 angepasst, offenen Punkt 3 entfernt, Punkt 9 auf den Backfill umgestellt, Punkt 15 zum Maildienst ergänzt._
