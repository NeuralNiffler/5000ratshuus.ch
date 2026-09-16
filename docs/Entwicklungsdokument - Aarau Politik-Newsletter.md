# Entwicklungsdokument: Aarau Politik-Newsletter

_Projekt: `Venture Lab/26Q3 Aarau Politik-Newsletter/`_
_Erstellt: 2026-09-10_
_Zweck: Ursprungsdokument für die Entwicklung mit Claude Code_
_Arbeitstitel: `[ARBEITSTITEL]`, Name und Domain sind noch nicht entschieden (siehe Abschnitt 11)_

---

## 0. Wie dieses Dokument zu lesen ist

Adressat ist Claude Code in einem eigenen Repository. Dieses Dokument ist die einzige Quelle, die du zu Beginn brauchst. Es beschreibt Problem, Zielbild, Anforderungen, redaktionelle Regeln und Abnahmekriterien.

Was dieses Dokument bewusst nicht tut: es schreibt keine konkreten Werkzeuge vor. Die Architekturrichtung ist festgelegt (Abschnitt 12). Framework, Hosting und die einzelnen Dienste wählst du und schlägst sie als Entscheid mit Begründung vor, bevor du baust (Abschnitt 14).

Fakten und Annahmen sind getrennt. Alles, was mit `[Annahme]` markiert ist, ist nicht belegt und muss vor der Umsetzung bestätigt oder widerlegt werden.

Quellen im bestehenden Workspace, die diesem Dokument zugrunde liegen:

- `97_Skills/aarau-newsletter-artikel/SKILL.md`: der bestehende, manuell erprobte Artikel-Workflow inklusive der beiden HTML-Templates. Er ist die verbindliche redaktionelle Referenz.
- `Venture Lab/26Q3 Aarau Politik-Newsletter/CLAUDE.md` und `MEMORY.md`: Projektregeln, Entscheide und offene Punkte.
- `Beispiel HTML - Einwohnerratsbeschlüsse Aarau.html`: erprobtes Ergebnis für Template A.
- `Beispiel HTML 2 - Budget 2027 Aarau.html`: erprobtes Ergebnis für Template B.
- `Testartikel - Einwohnerratsbeschlüsse Aarau (24.08.2026).md`: früher Fliesstext-Test, zeigt Ton und Detailtiefe.

---

## 1. Problem

Die Stadt Aarau veröffentlicht politisch relevante Inhalte (Einwohnerrats-Beschlüsse, Budget, Planung, öffentliche Auflagen) nur als einzelne News-Meldungen tief unter Politik und Verwaltung, Aktuelles. Es gibt dort keine Übersichtsseite, keinen RSS-Feed und keine brauchbare Suche. Wer die Meldungen nicht am Tag der Publikation sieht, findet sie praktisch nicht mehr.

Heute löst Robin das, indem er den Newsletter der Stadt Aarau (`kommunikation@aarau.ch`) selbst liest, den Kurzlink öffnet, die amtliche Publikation liest und bei Bedarf im Sitzungsarchiv nach der Botschaft zum einzelnen Geschäft sucht. Das ist pro Ausgabe manuelle Arbeit und passiert deshalb unregelmässig.

---

## 2. Zielbild

Ein öffentlicher, quellenverlinkter Blog zur Aarauer Kommunalpolitik, der sich selbst füllt. Vom Eingang einer Newsletter-Ausgabe bis zum publizierten Artikel läuft der Ablauf ohne Robins aktives Zutun.

Der Newsletter ist dabei nur der Aufhänger, nie die Quelle. Jeder Artikel verlinkt auf die tiefstmögliche Originalquelle, nicht auf die Newsletter-Mail und nicht nur auf die Zusammenfassungsseite.

**Definition of Done für Phase 1:** Eine neue Newsletter-Ausgabe mit politischer Substanz führt ohne manuellen Eingriff zu einem publizierten, korrekt kategorisierten und quellenverlinkten Artikel auf der Website, der über die Startseite und das Archiv auffindbar ist.

---

## 3. Nutzung und Leserschaft

Primärer Nutzer ist Robin selbst. Sekundär: Aarauerinnen und Aarauer, die wissen wollen, was der Einwohnerrat entschieden hat, ohne PDF-Archive zu durchsuchen.

Offener Punkt aus der Projektdiskussion: bisher ist Robin der einzige belegte Nutzer, es gibt keinen Beleg für eine Leserschaft darüber hinaus. Das ist kein Blocker für den Bau, aber es ist der Grund, warum die erste Version klein bleibt und keine Community-Funktionen (Kommentare, Konten, Abos) enthält.

---

## 4. Scope in Phasen

Die Phasen sind bewusst getrennt. Phase 3 wird in Phase 1 und 2 nicht gebaut, aber die Datenstruktur wird so gewählt, dass sie später ohne Umbau möglich ist (siehe Abschnitt 9).

### Phase 1: Artikel-Pipeline und Website (MVP)

Newsletter-Ausgabe rein, publizierter Artikel raus. Website mit Startseite, Artikelseiten, Archiv, Impressum, Disclaimer und Kontaktformular.

### Phase 2: Begrenzter Archiv-Backfill

Bestehende Newsletter-Ausgaben aus dem Postfach werden nachträglich zu Artikeln verarbeitet, damit die Seite nicht leer startet.

Bewusst begrenzt: nicht das ganze Postfach, nur ein definierter Zeitraum zurück. `[Annahme]` Sinnvoller Startwert sind die Ausgaben der letzten sechs Monate oder maximal zehn Ausgaben, je nachdem was zuerst erreicht ist. Der endgültige Stichtag ist ein offener Entscheid (Abschnitt 11).

Backfill-Artikel werden im Artikel-Frontmatter als solche markiert, damit sie sich später von laufender Produktion unterscheiden lassen und damit die Publikationsdaten nicht so aussehen, als wäre die Seite älter als sie ist.

### Phase 3: Wahlhilfe (noch nicht validiert, nicht bauen)

Auswertung, welches Einwohnerratsmitglied sich für welche Themen einsetzt. Reifegrad laut Projekt-MEMORY: Idee, unvalidiert. Robins eigener Vorschlag ist, mit reiner Themenbereich-Zuordnung pro Person zu starten statt mit einer Erfolgsbewertung, weil eine automatisierte Bewertung namentlich genannter Personen ein anderes Risikoprofil hat als eine reine Beschluss-Zusammenfassung.

Verbindlich für Phase 1 und 2: keine Aggregation über Personen, keine Personenprofile, keine Scores. Nur die Anforderung aus Abschnitt 9 erfüllen, damit die Daten später dafür taugen.

### Ausserhalb des Scopes

Kommentarfunktion, Benutzerkonten, E-Mail-Versand an Abonnenten, Volltextsuche über eine Suchmaschine im Backend, Mehrsprachigkeit, Paywall, Werbung, Meinungs- und Kommentarartikel.

---

## 5. Funktionale Anforderungen

### F1: Eingang, Newsletter-Ausgaben erkennen

- Quelle ist eine eigene Empfangsadresse des Projekts, auf die der Newsletter von `kommunikation@aarau.ch` abonniert ist. Eine eingehende Mail löst die Pipeline direkt aus (Architekturrichtung in Abschnitt 12). Robins Gmail-Postfach dient nur noch als Quelle für den einmaligen Backfill in Phase 2.
- Geht über längere Zeit keine Ausgabe ein, wird Robin benachrichtigt. `[Annahme]` Sinnvoller Schwellenwert sind 14 Tage, abhängig vom tatsächlichen Versandrhythmus der Stadt.
- Die Pipeline erkennt neue Ausgaben und verarbeitet jede Ausgabe genau einmal. Dazu gehört ein persistenter Zustand über bereits verarbeitete Ausgaben, zum Beispiel die Message-ID.
- Ein erneuter Lauf über eine bereits verarbeitete Ausgabe darf keinen zweiten Artikel erzeugen (Idempotenz).
- Die Mail wird als Klartext verarbeitet, nicht als HTML-Rendering.

### F2: Kategorisieren und Aussortieren

Der Newsletter transportiert drei Kategorien: Medienmitteilungen, Amtliche Publikationen und Baugesuche.

- Zu Artikeln werden nur Ausgaben mit politischer Substanz: Beschlüsse, Budget und Finanzen, Planung, Vernehmlassungen und öffentliche Auflagen.
- Baugesuche und einzelne Routine-Publikationen (zum Beispiel einzelne Einbürgerungsgesuche) werden nicht zu Artikeln.
- Eine aussortierte Ausgabe wird als verarbeitet markiert und mit Begründung protokolliert, nicht stillschweigend verworfen.

### F3: Quellen auflösen

- Den in der Mail verlinkten Kurzlink (`aarau.ch/short/...`) auflösen und die amtliche Seite vollständig extrahieren, nicht zusammenfassen lassen.
- Bei einer Liste mit mehreren Beschlüssen alle Punkte einzeln herausholen. Beispiele oder eine Auswahl genügen nicht.
- Bei Einwohnerrats-Geschäften die Sitzungsseite des Jahres nach dem Sitzungsdatum durchsuchen. Dort liegen die einzelnen Botschaften als PDF pro Geschäft.
- Prioritätsreihenfolge für den Quellenlink pro Geschäft: Botschaft-PDF oder Reglementstext zuerst, amtliche Publikation nur als Fallback, wenn nichts Spezifischeres existiert.
- Beobachtete URL-Muster aus dem manuellen Test, als Orientierung und nicht als Vertrag: amtliche Publikation `https://www.aarau.ch/politik-verwaltung/aktuelles.html/204/news/[ID]`, Sitzungsarchiv `https://www.aarau.ch/politik-verwaltung/politik/einwohnerrat/sitzungen-einwohnerrat-[JAHR].html/[ID]`.
- Jeder im Artikel verwendete Link wird vor der Publikation auf Erreichbarkeit geprüft. Ein toter Link blockiert die Publikation des betroffenen Geschäfts, nicht des ganzen Artikels, und wird protokolliert.

### F4: Artikel erzeugen

- Zwei Formatvarianten, im Wortlaut in `97_Skills/aarau-newsletter-artikel/SKILL.md`:
  - **Template A** für Ausgaben mit mehreren Geschäften, zum Beispiel eine Beschlussliste einer Ratssitzung. Enthält Inhaltsverzeichnis, Gruppe "Referendumspflichtig" mit einem Block pro Geschäft und Gruppe "Abschliessend entschieden" als Tabellen nach Art des Geschäfts.
  - **Template B** für Einzelthemen, zum Beispiel eine Medienmitteilung zum Budget. Kein Inhaltsverzeichnis, keine Tabellen, optional eine Kennzahlen-Box.
- Die CSS-Variablen und Grundstile der beiden Templates sind identisch und werden nicht pro Artikel verändert. Sie gehören in die Website und nicht in jede einzelne Artikeldatei, sobald ein Build-Schritt existiert.
- Jeder Artikel enthält Meta-Description, Keywords, Open-Graph-Angaben und JSON-LD nach schema.org NewsArticle, inklusive `isBasedOn` und `citation` auf die Originalquellen.
- Sprache ist Deutsch (Schweiz), Umlaute werden als ö, ä und ü geschrieben, kein Eszett. Das gilt auch für Dateinamen, Slugs und Metadaten.

### F5: Publizieren

- Die Website enthält mindestens: Startseite mit den neuesten Artikeln, Artikelseiten, Archivseite, Impressum, Disclaimer und Kontaktformular.
- Jeder Artikel trägt sichtbar den Hinweis: "Diese Seite wird KI-gestützt betrieben. Fehler können vorkommen, bei Auffälligkeiten bitte über das Kontaktformular melden."
- Das Kontaktformular muss ohne eigenen Server funktionieren, wenn die Seite statisch ausgeliefert wird, und es muss Meldungen zuverlässig an Robin zustellen.
- Publikation läuft ohne Freigabeschritt. Das ist ein bewusster Projektentscheid, siehe Abschnitt 13.
- Jeder Artikel bekommt eine stabile URL, die sich später nicht ändert. Slug aus Datum und Thema `[Annahme]`, endgültiges Schema entscheidest du im Stack-Vorschlag.

### F6: Korrigieren

- Ein Artikel muss nach der Publikation korrigierbar sein, ohne dass die URL wechselt.
- Bei einer inhaltlichen Korrektur wird sichtbar vermerkt, dass und wann korrigiert wurde. `dateModified` im JSON-LD wird mitgeführt.
- Der Korrekturweg ist manuell und braucht keine eigene Oberfläche. Ein Edit im Repository plus Deploy genügt.

### F7: Protokoll und Benachrichtigung

- Jeder Lauf schreibt ein Protokoll: verarbeitete Ausgabe, Entscheid (Artikel oder aussortiert mit Grund), gefundene Quellen, publizierte URL, Fehler.
- Fehlerfälle, die zu keinem Artikel führen, benachrichtigen Robin aktiv. `[Annahme]` E-Mail genügt, das ist mit dem Betriebsmodell in Abschnitt 12 zu entscheiden.
- Ein Fehler in einer Ausgabe darf die Verarbeitung der nächsten Ausgabe nicht blockieren.

---

## 6. Redaktionelle Regeln (verbindlich)

Diese Regeln stammen aus dem manuellen Test-Workflow und sind im Bau nicht verhandelbar. Vollständiger Wortlaut in `97_Skills/aarau-newsletter-artikel/SKILL.md`.

### Kategorisierung

- Eine Bürgermotion ist ein Bevölkerungsanliegen, keine gewöhnliche Motion. Sie gehört in die Gruppe Bevölkerungsanliegen, auch wenn der Name anderes nahelegt.
- Nur Motionen und Postulate von amtierenden Ratsmitgliedern gehören in die Gruppe "Motionen und Postulate".
- Ein Status (gewählt, überwiesen, nicht überwiesen, aufgenommen, abgeschrieben) wird nur gesetzt, wenn die Quelle ihn ausdrücklich nennt.
- Zahlen aus Budget oder Politikplan sind Prognosen. Sie werden mit dem Badge "Budgetiert, nicht effektiv" gekennzeichnet.
- Aarauer Beträge sind immer Franken. Ein Eurozeichen in extrahierten Rohdaten ist ein Extraktionsfehler und wird korrigiert, nicht übernommen.
- Themen-Tags stehen immer direkt beim einzelnen Geschäft, nie als lose Tag-Wolke.

### Die Referendumsfrist-Regel

Die Referendumsfrist wird nie als konkretes Datum im Artikel gezeigt, auch wenn die Quelle sie nennt. Gezeigt wird nur der Status referendumspflichtig ja oder nein. Für das genaue Datum wird auf die Originalquelle verwiesen.

Begründung: ein falsch übertragenes Datum könnte jemanden eine echte Unterschriftenfrist verpassen lassen. Anders als andere Fehler ist das nach Ablauf der Frist nicht mehr korrigierbar, eine nachträgliche Meldung hilft dann niemandem mehr.

Diese Regel ist die einzige Ausnahme vom unbeaufsichtigten Betrieb. Sie gilt für jede Ausgabe, jede Vorlage und jeden Sonderfall.

### Schreibregeln

- Kein einleitender Lead-Satz unter der Überschrift. Die Meta-Zeile deckt die Kerninfo bereits ab.
- Fliesstext nur für das, was nicht schon in Meta-Zeile, Badges oder Kennzahlen-Box steht. Keine Wiederholung von Zahlen.
- Kurze, einfache, klare Sprache. Ein bis zwei Sätze pro Geschäft reichen fast immer.
- Der Link zur Quelle steht so weit oben wie möglich im Abschnitt, nicht nach der Erklärung.
- Keine erfundenen Fakten, keine unmarkierten Annahmen. Unklares wird als offen benannt statt interpretiert.
- Keine Wertung, keine politische Einordnung, keine Meinung. Die Artikel bleiben faktisch und neutral. Eine spätere Einordnungsebene ist denkbar, aber nur auf ausdrückliche Ansage und nicht Teil dieses Auftrags.
- Keine interaktive Inline-Suche und kein Filter-Widget innerhalb eines einzelnen Artikels. Auffindbarkeit läuft über Metadaten, Tags und die Archivseite.

---

## 7. Nicht-funktionale Anforderungen

- **Statisch ausliefern.** Die publizierte Seite braucht zur Laufzeit keinen eigenen Server und keine Datenbank. Ausnahme ist der Dienst hinter dem Kontaktformular.
- **Kosten.** Laufende Kosten bleiben klein und vorhersehbar: Domain, allenfalls ein Formulardienst, sowie die Modellkosten pro Ausgabe. Kein Dienst mit Kosten, die mit den Besucherzahlen wachsen.
- **Betrieb ohne Aufsicht.** Die Pipeline läuft nach einem Zeitplan und braucht keinen laufenden Rechner von Robin, wenn das gewählte Betriebsmodell das zulässt (Abschnitt 12).
- **Nachvollziehbarkeit.** Zu jedem publizierten Artikel muss rekonstruierbar sein, aus welcher Newsletter-Ausgabe und welchen Quellen er entstanden ist.
- **Sprache und Zeichen.** de-CH durchgehend, Umlaute ausgeschrieben, kein Eszett, korrekte Zeichencodierung in Dateien, Slugs und Feeds.
- **Auffindbarkeit.** Saubere Metadaten, JSON-LD, Sitemap und ein Feed. Ein RSS- oder Atom-Feed ist ausdrücklich erwünscht, weil genau dessen Fehlen bei der Stadt das Ausgangsproblem ist.
- **Darstellung.** Lesbar auf dem Telefon, heller und dunkler Modus wie in den bestehenden Templates, keine Layoutabhängigkeit von JavaScript.
- **Geschwindigkeit.** Eine Artikelseite lädt ohne externe Schriften, ohne Tracker und ohne Framework-Laufzeit im Browser, wenn nichts davon eine Funktion erfüllt.
- **Kein Tracking.** Keine Analyse-Skripte von Dritten. Wenn Reichweitenmessung gewünscht ist, wird sie separat entschieden.

---

## 8. Qualitätssicherung vor der Publikation

Weil ohne menschliche Freigabe publiziert wird, ersetzt eine automatische Prüfung den Review. Ein Artikel wird nur publiziert, wenn alle Prüfungen bestanden sind. Sonst bleibt er als Entwurf liegen und Robin wird benachrichtigt.

1. Kein Datum einer Referendumsfrist im Artikeltext. Diese Prüfung ist hart und blockiert.
2. Jedes Geschäft hat mindestens eine erreichbare Quell-URL.
3. Kein Eurozeichen im Text.
4. Kein Platzhalter aus dem Template (`{{...}}`) im Ergebnis.
5. Anzahl der Geschäfte im Artikel entspricht der Anzahl in der amtlichen Publikation.
6. Der Disclaimer und der Link zum Kontaktformular sind vorhanden.
7. Gültiges JSON-LD, gesetzte Meta-Angaben, gesetztes Publikationsdatum.
8. Keine leeren Abschnitte oder Tabellen ohne Zeilen.

---

## 9. Datenhaltung und Vorbereitung auf Phase 3

Der Artikel ist die Ausgabe, nicht die Datenbasis. Damit Phase 3 später ohne Umbau möglich ist, wird pro Ausgabe zusätzlich zum Artikel eine strukturierte Datei mit den einzelnen Geschäften abgelegt, im Repository neben dem Artikel.

Pro Geschäft mindestens: stabile ID, Titel, Art des Geschäfts (Wahl, Motion, Postulat, Bürgermotion, Reglement, Kredit, Sonstiges), Urheberin oder Urheber mit Partei falls die Quelle sie nennt, Ereignis oder Status wie in der Quelle formuliert, referendumspflichtig ja oder nein, Themen-Tags, Sitzungsdatum, Publikationsdatum, Quell-URLs, und die Ausgabe aus der es stammt.

Verbindlich dazu:

- Diese Daten werden in Phase 1 und 2 nur erzeugt und abgelegt, nicht ausgewertet und nicht über Personen aggregiert dargestellt.
- Personennamen erscheinen nur so, wie die amtliche Quelle sie nennt, und nur im Zusammenhang mit dem konkreten Geschäft.
- Keine abgeleitete Bewertung, kein Score, kein Ranking, keine Erfolgsquote. Auch nicht als Nebenprodukt in den Daten.

---

## 10. Abnahmekriterien

### Phase 1

1. Eine bisher unverarbeitete Newsletter-Ausgabe mit mehreren Beschlüssen führt zu einem publizierten Artikel im Format von Template A, mit allen Geschäften der Quelle, korrekt gruppiert.
2. Eine Einzelthema-Ausgabe führt zu einem Artikel im Format von Template B.
3. Eine Baugesuch-Ausgabe führt zu keinem Artikel und wird mit Grund protokolliert.
4. Ein zweiter Lauf über dieselben Ausgaben erzeugt keine Duplikate.
5. Alle acht Prüfungen aus Abschnitt 8 laufen automatisch und ein absichtlich eingebautes Fristdatum blockiert die Publikation nachweislich.
6. Die Startseite listet die Artikel, das Archiv ist vollständig, der Feed validiert, Impressum und Kontaktformular sind erreichbar.
7. Eine Testmeldung über das Kontaktformular kommt bei Robin an.
8. Ein manuell korrigierter Artikel behält seine URL und zeigt den Korrekturhinweis.

### Phase 2

9. Der Backfill verarbeitet genau den definierten Zeitraum, nicht mehr, und markiert die Artikel als nachträglich erstellt.
10. Der Backfill läuft ohne Doppelverarbeitung der bereits laufenden Produktion.

---

## 11. Offene Entscheidungen

| # | Entscheidung | Blockiert | Stand |
|---|---|---|---|
| 1 | Name und Domain | Domainkauf, Impressum, Branding der Seite. Nicht den Bau. | Offen. Kandidaten: 5000 Rathuus Post (5000rathuuspost.ch), Rathuus5000 (rathuus5000.ch), 5000 Rathuus (5000rathuus.ch). Aareblick verworfen, weil die Aare nicht eindeutig auf Aarau zeigt. Bis dahin gilt `[ARBEITSTITEL]`. |
| 2 | Betriebsmodell und Ausführungsort | Den Bau der Pipeline. | Entschieden am 2026-09-16, siehe Abschnitt 12, Architekturrichtung. Offen bleiben die konkreten Dienste, die du im Stack-Vorschlag wählst. |
| 3 | Publikationskanal über die Website hinaus | Nichts in Phase 1. | Offen. Ein eigener E-Mail-Versand an Abonnenten ist ausserhalb des Scopes, ein Feed ersetzt ihn vorerst. |
| 4 | Stichtag und Umfang des Backfills | Phase 2. | Offen. `[Annahme]` sechs Monate oder zehn Ausgaben. |
| 5 | Dienst für das Kontaktformular | Phase 1, Abnahmekriterium 7. | Offen, wird mit dem Stack-Vorschlag entschieden. |
| 6 | Impressumspflicht und Verantwortlichkeit | Live-Gang. | Offen. Zu klären ist, welche Angaben eine private Schweizer Publikationsseite führen muss und ob Robin sie mit vollem Namen und Adresse führen will. Rechtliche Beurteilung gehört nicht in dieses Dokument. |
| 7 | Umgang mit Urheberrecht an amtlichen Texten | Live-Gang. | Offen. Die Artikel geben Inhalte in eigenen Worten wieder und verlinken die Quelle. Ob und wie weit wörtliche Übernahmen aus amtlichen Publikationen zulässig sind, ist noch zu klären. |

---

## 12. Architektur: Randbedingungen und Richtung

Du wählst die konkreten Werkzeuge. Verbindlich sind diese Randbedingungen und die Architekturrichtung weiter unten:

- Statische Ausgabe, kein Anwendungsserver zur Laufzeit.
- Artikelinhalte liegen als versionierte Dateien im Repository, nicht in einer externen Datenbank.
- Der Build und der Deploy sind reproduzierbar und laufen ohne manuelle Schritte.
- Jeder Schritt der Pipeline ist einzeln ausführbar und einzeln testbar: Ausgabe holen, Quellen auflösen, Artikel erzeugen, prüfen, publizieren. Ein Fehler in einem Schritt darf nicht bedeuten, dass die ganze Kette von vorne laufen muss.
- Die redaktionellen Regeln aus Abschnitt 6 und die Prüfungen aus Abschnitt 8 leben als Code oder als klar benannte Prompt-Bausteine im Repository, nicht als implizites Modellwissen.
- Geheimnisse (Mailzugang, API-Schlüssel) liegen nie im Repository.

### Architekturrichtung (entschieden am 2026-09-16)

Robin hat die Richtung festgelegt. Innerhalb dieser Richtung wählst du die konkreten Werkzeuge und Dienste und schlägst sie wie in Abschnitt 14 beschrieben vor.

**Speicher und Anzeige: Dateien im Repository plus Index beim Build.**
Pro Ausgabe liegen der Artikel als Markdown und die Geschäfte als JSON (Abschnitt 9) im Repository. Ein Static Site Generator baut daraus Startseite, Artikelseiten, Archiv, Feed und Sitemap. Beim Build werden die JSON-Dateien zusätzlich in eine SQLite-Datei geladen. Aus ihr entstehen die Archivseiten nach Thema und Art des Geschäfts als statische Seiten, und sie ist die spätere Datenbasis für Phase 3. Die Dateien im Repository bleiben die Quelle der Wahrheit, die SQLite-Datei wird bei jedem Build neu erzeugt.

**Eingang: eigene Empfangsadresse, die bei Eingang auslöst.**
Der Newsletter wird an eine eigene Adresse des Projekts abonniert. Ein Dienst für eingehende Mails, zum Beispiel Cloudflare Email Workers oder die Inbound-Funktion von Postmark, nimmt die Mail an und startet die Pipeline. Damit liegt kein Zugang zu Robins privatem Postfach in der Cloud, und ein Artikel entsteht ohne Wartezeit bis zu einem geplanten Lauf. Die Rohmail wird mit Message-ID abgelegt, damit die Idempotenz aus F1 und die Nachvollziehbarkeit aus Abschnitt 7 erhalten bleiben.

**Pipeline: Job in der Cloud.**
Die Pipeline läuft als Job beim Git-Hoster, zum Beispiel GitHub Actions, ausgelöst durch den Maileingang. Sie kategorisiert, löst Quellen auf, erzeugt den Artikel über die Claude-API, führt die Prüfungen aus Abschnitt 8 aus und committet Artikel und JSON. Der Commit löst Build und Deploy aus. Das entspricht Betriebsvariante A, mit einem Start durch das Ereignis statt durch einen Zeitplan. Variante C bleibt als Übergang möglich, weil Artikelformat und Ablage identisch sind.

**Später als Backup: aarau.ch beobachten.**
Ein geplanter Lauf prüft die Seite Politik und Verwaltung, Aktuelles auf neue News-IDs und meldet Einträge, zu denen keine Newsletter-Ausgabe eingegangen ist. Nicht Teil von Phase 1.

**Verworfen, mit Grund:**
- Datenbank mit dynamischem Frontend, zum Beispiel Postgres mit Next.js: ein dauernd laufender Dienst mit Ausfall- und Kostenrisiko, und nachgeladene Inhalte widersprechen den Anforderungen an Auffindbarkeit und Geschwindigkeit aus Abschnitt 7. Neu prüfen, wenn Phase 3 Abfragen braucht, die eine SQLite-Datei beim Build nicht abdeckt.
- Fertiges CMS wie Ghost oder WordPress: Hosting, Updates und Sicherheit fallen an, und die harten Prüfungen aus Abschnitt 8 lassen sich schlecht vor die Publikation schalten.
- Gmail-API mit Zeitplan als Haupteingang: bräuchte einen Zugang zu Robins ganzem Postfach in der Cloud. Bleibt nur für den einmaligen Backfill in Phase 2, der lokal laufen kann.
- aarau.ch als einzige Quelle: abhängig vom Seitenlayout der Stadt, deshalb nur als Backup.

### Betriebsvarianten, Entscheidungsgrundlage

**A: Zeitplan in der Cloud, zum Beispiel als geplanter Job beim Git-Hoster.**
Vorteil: läuft unabhängig davon, ob Robins Rechner an ist, das ist die Voraussetzung für den unbeaufsichtigten Betrieb aus Abschnitt 2. Protokolle sind zentral. Nachteil: der Mailzugang muss als Geheimnis in der Cloud liegen, und Debugging ist umständlicher als lokal.

**B: Zeitplan lokal auf dem Mac.**
Vorteil: einfachster Zugang zum Postfach, leicht zu debuggen, keine fremden Geheimnisspeicher. Nachteil: läuft nur wenn der Rechner läuft, damit ist das Zielbild "ohne aktives Zutun" nur eingeschränkt erfüllt.

**C: Wiederkehrende Aufgabe in Cowork, die den bestehenden Skill ausführt.**
Vorteil: der erprobte manuelle Workflow bleibt unverändert, Claude Code baut nur die Website und die Prüfungen. Schnellster Weg zu einem ersten publizierten Artikel. Nachteil: die Pipeline ist dann kein eigenständiges Programm, weniger testbar, und die Prüfungen aus Abschnitt 8 sind schwerer hart zu erzwingen.

Empfehlung zur Entscheidungsfindung: Variante C als Übergang und Variante A als Ziel sind kombinierbar, wenn Artikelformat und Ablageort von Anfang an gleich sind. Baue deshalb das Artikelformat und die Ablage so, dass die Quelle des Artikels austauschbar ist.

---

## 13. Risiken und Guardrails

- **Publikation ohne Freigabe.** Entschieden am 2026-09-10: autonome Publikation mit sichtbarem Disclaimer und Kontaktformular, statt eines manuellen Reviews vor jedem Artikel. Begründung: die meisten Fehler sind nach einer Meldung noch korrigierbar. Das ist eine bewusste, auf dieses Projekt begrenzte Ausnahme von der Regel "nichts ohne Freigabe veröffentlichen" aus `00_Reference/Governance Rules - Communication.md`.
- **Der nicht korrigierbare Fehler.** Die Referendumsfrist ist der eine Fall, der nach Ablauf nicht mehr heilbar ist. Deshalb die harte Regel in Abschnitt 6 und die blockierende Prüfung in Abschnitt 8.
- **Falsche Zuordnung eines Geschäfts zu einer Person.** Eine falsch zugeordnete Urheberschaft trifft eine namentlich genannte Person. Deshalb: Urheberschaft nur übernehmen, wenn die Quelle sie ausdrücklich nennt, nie aus dem Kontext erschliessen.
- **Extraktionsfehler bei Zahlen.** Beträge und Zahlen werden gegen die Quelle geprüft, nicht aus dem Fliesstext des Newsletters übernommen.
- **Quellenverfügbarkeit.** Wenn die Stadt eine Seite verschiebt, laufen alte Artikel ins Leere. Deshalb werden Quell-URLs strukturiert abgelegt (Abschnitt 9), damit ein späterer Massenfix möglich ist.
- **Stiller Ausfall des Eingangs.** Läuft das Abo an der eigenen Empfangsadresse aus oder fällt der Maildienst aus, kommt nichts an und es entsteht auch kein Fehler. Deshalb die Benachrichtigung bei ausbleibenden Ausgaben in F1 und später das Backup über aarau.ch (Abschnitt 12).
- **Anschein von Amtlichkeit.** Die Seite darf nicht wie ein Angebot der Stadt Aarau aussehen. Kein Stadtwappen, keine Farben oder Marken der Stadt, klarer Hinweis auf die private Urheberschaft im Impressum und im Footer.

---

## 14. Arbeitsauftrag an Claude Code

1. Lies dieses Dokument vollständig und stelle Rückfragen zu allem, was du für den Bau brauchst und was hier offen ist. Frage lieber einmal zu viel als eine Annahme still zu treffen.
2. Schlage den Stack innerhalb der Architekturrichtung aus Abschnitt 12 vor: Static Site Generator, Artikelformat, Hosting, Dienst für eingehende Mails, Formulardienst. Mit Begründung und mit den Nachteilen, nicht nur mit den Vorteilen. Warte auf die Bestätigung, bevor du baust.
3. Lege im Repository eine `CLAUDE.md` an, welche die redaktionellen Regeln aus Abschnitt 6, die Prüfungen aus Abschnitt 8 und die Datenanforderung aus Abschnitt 9 als verbindliche Projektregeln führt.
4. Baue Phase 1 in der Reihenfolge: Artikelformat und Website zuerst, mit den bestehenden Beispielartikeln als Inhalt, dann die Prüfungen, dann die Pipeline. So steht die publizierbare Seite, bevor die Automatik dazukommt.
5. Halte jeden getroffenen Architekturentscheid kurz schriftlich fest, inklusive der verworfenen Alternative.
6. Baue nichts aus Phase 3. Erfülle nur Abschnitt 9.

---

_Erstellt am 2026-09-10 aus `97_Skills/aarau-newsletter-artikel/SKILL.md`, den Projektdateien in `Venture Lab/26Q3 Aarau Politik-Newsletter/` und den drei Beispielartikeln im selben Ressourcenordner. Wenn du diese Datei überarbeitest, ergänze hier eine datierte Notiz: `[YYYY-MM-DD] was geändert wurde`._

_[2026-09-16] Die drei Beispielartikel liegen neu im selben Ressourcenordner des Projekts. Die Pfadangaben in Abschnitt 0 sind entsprechend auf Dateinamen gekürzt._

_[2026-09-16] Architekturrichtung festgelegt: Abschnitt 12 um Speicher, Eingang, Pipeline, Backup und verworfene Alternativen ergänzt. F1 auf eine eigene Empfangsadresse umgestellt, Risiko "Stiller Ausfall des Eingangs" in Abschnitt 13 aufgenommen, Abschnitte 0, 11 und 14 nachgeführt._

_[2026-09-16] Rückfragen beantwortet und Stack bestätigt (Abschnitt 14, Schritte 1–2), Phase 1a gebaut. Zwei bewusste Abweichungen vom Wortlaut dieses Dokuments, beide von Robin im Rückfragen-Gespräch entschieden und in `docs/entscheide/` begründet: (1) Slugs verwenden reines ASCII (ä→ae, ö→oe, ü→ue) statt Umlauten wie in F4/Abschnitt 7 verlangt, siehe `docs/entscheide/2026-09-16-slug-regel.md`; Inhalte, Überschriften und Metadaten behalten Umlaute unverändert. (2) Artikel führen keinen Personenautor (kein `meta name="author"`, kein `author: Person` im JSON-LD) statt "Robin Schmid" wie in den Templates in `97_Skills/aarau-newsletter-artikel/SKILL.md`; JSON-LD führt stattdessen `publisher` als Organisation, siehe `docs/entscheide/2026-09-16-kein-personenautor.md`. Die Referendumsfrist-Regel in Abschnitt 6 bleibt unverändert in Kraft. Name/Domain: `5000ratshuus.ch` als Favorit für Offene Entscheidung 1, noch nicht endgültig (Kauf/Verfügbarkeit offen). Vollständiger Stack-Entscheid in `docs/entscheide/2026-09-16-stack.md`._
