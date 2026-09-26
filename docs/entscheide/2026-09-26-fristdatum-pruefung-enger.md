# Fristdatum-Prüfung: nur Referendumsfristen blockieren

**Datum:** 2026-09-26
**Kontext:** Der Pipeline-Lauf zum Newsletter vom 26.09. (Ausschreibung
Taxi-Betriebsbewilligung) ist abgebrochen. In der `ogDescription` stand ein
Datum (26. Oktober 2026) neben dem Wort „Frist“. Gemeint war die
Bewerbungsfrist der Ausschreibung, keine Referendumsfrist. Die Prüfung in
`assertKeinFristdatum()` ([`src/lib/content.ts`](../../src/lib/content.ts))
suchte nur nach „Frist“ im Umkreis von 80 Zeichen und konnte die beiden nicht
unterscheiden. Der Prompt verbietet nur das Datum der Referendumsfrist, das
Modell hatte sich also an die Regel gehalten.

## Entscheid

Andere Fristen (Bewerbung, Eingabe, Einsprache, Mitwirkung) dürfen mit Datum
im Artikel stehen. Die Prüfung arbeitet in zwei Stufen:

- **Streng**, wenn ein Referendum im Spiel ist: Für die Felder eines
  Geschäfts (`titel`, `ereignis`, `kurztext`) gilt das, wenn das Geschäft
  `referendumspflichtig` ist. Für `description`, `ogDescription` und den
  Fliesstext gilt es, wenn irgendein Geschäft der Ausgabe
  referendumspflichtig ist. Dann blockiert wie bisher jedes Datum neben
  „Frist“.
- **Sonst** blockiert nur ein Datum neben „Referendum“ (nicht
  „referendumspflichtig“) oder „Unterschrift“.

Der Prompt (`REFERENDUMSFRIST_REGEL` in
[`scripts/pipeline/prompts.ts`](../../scripts/pipeline/prompts.ts)) sagt
dasselbe, damit das Modell nichts schreibt, was die Prüfung blockiert.

## Warum

- Die Regel aus Abschnitt 6 gilt der Referendumsfrist. Ausschreibungen und
  Mitwirkungsverfahren nennen oft eine Frist. Ohne Datum wäre diese Angabe
  wertlos, und die Ausgabe würde grundlos blockiert.
- Die strenge Stufe bleibt dort, wo eine Verwechslung möglich ist: Bei einem
  referendumspflichtigen Geschäft kann „die Frist läuft bis …“ die
  Referendumsfrist meinen, auch wenn „Referendum“ nicht danebensteht.

## Restrisiko

Ein Datum der Referendumsfrist rutscht durch, wenn alle drei Bedingungen
gleichzeitig zutreffen: Kein Geschäft der Ausgabe ist als
referendumspflichtig markiert, im Umkreis von 80 Zeichen steht weder
„Referendum“ noch „Unterschrift“, und das Modell hat das Datum trotz Prompt
übernommen. Das halten wir für unwahrscheinlich genug.

## Nachweis

`npm run demo:fristdatum-block` prüft neben dem ursprünglichen Nachweis auch
beide Stufen: Eine Bewerbungsfrist mit Datum geht bei einem nicht
referendumspflichtigen Geschäft durch und blockiert bei einem
referendumspflichtigen.
