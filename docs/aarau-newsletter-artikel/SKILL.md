---
name: aarau-newsletter-artikel
description: "Baut einen quellenverlinkten HTML-Blogartikel aus einer Ausgabe des Newsletters der Stadt Aarau (kommunikation@aarau.ch), z.B. bei neuen Einwohnerrats-Beschlüssen, Medienmitteilungen oder amtlichen Publikationen."
---

# Aarau Newsletter Artikel

## Zweck

Aus einer Ausgabe des Newsletters der Stadt Aarau (kommunikation@aarau.ch) einen strukturierten, quellenverlinkten HTML-Artikel für Robins persönlichen Blog zur Aarauer Kommunalpolitik bauen. Der Newsletter ist nur der Aufhänger, nicht die Quelle: Ziel ist immer der Link auf die tiefstmögliche Originalquelle, nicht auf die Newsletter-Mail oder nur die Zusammenfassungsseite.

Hintergrund: Die Stadt Aarau veröffentlicht politisch relevante Inhalte (Ratsbeschlüsse, Budget, öffentliche Auflagen) nur als einzelne News-Meldungen tief unter Politik & Verwaltung → Aktuelles, ohne Übersichtsseite, RSS oder Suche. Ohne den Newsletter sind diese Meldungen praktisch nicht auffindbar.

## Workflow

1. Newsletter-Ausgabe(n) in Gmail suchen: `from:kommunikation@aarau.ch`, bei Bedarf mit Datumsfilter oder Betreffsstichwort eingrenzen. Threads zuerst mit search_threads finden, dann nur die relevanten mit get_thread (messageFormat PLAIN_TEXT) laden. Nicht das ganze Postfach durchladen.
2. Kategorie erkennen: Medienmitteilungen, Amtliche Publikationen oder Baugesuche. Baugesuche und einzelne Routine-Publikationen (z.B. einzelne Einbürgerungsgesuche) werden nicht zu Artikeln. Nur echte politische Substanz: Beschlüsse, Budget/Finanzen, Planung, Vernehmlassungen/öffentliche Auflagen.
3. Den in der Mail verlinkten Kurzlink (aarau.ch/short/...) auflösen und die amtliche Seite vollständig extrahieren, nicht nur zusammenfassen lassen. Bei einer Liste mit mehreren Beschlüssen (z.B. "sieben Punkte") wirklich alle einzeln herausholen, nicht nur Beispiele nennen.
4. Tiefste verfügbare Quelle suchen. Bei Einwohnerrats-Geschäften die passende Sitzungsseite "Sitzungen Einwohnerrat [Jahr]" nach dem Sitzungsdatum durchsuchen, dort liegen die einzelnen Botschaften als PDF pro Geschäft. Prioritätsreihenfolge für den "Details zum Geschäft"-Link: Botschaft-PDF oder Reglementstext > amtliche Publikation als Fallback, wenn kein spezifischeres Dokument existiert.
5. Formatvariante wählen: Template A für Ausgaben mit mehreren Geschäften (z.B. eine Beschlussliste einer Ratssitzung), Template B für Einzelthema-Mitteilungen (z.B. eine einzelne Medienmitteilung wie eine Budget-Ankündigung). Beide Templates unten im Wortlaut.
6. Artikel bauen und als HTML-Datei ausliefern (SendUserFile). Dies ist aktuell ein manueller Test-Workflow für einzelne Ausgaben, kein automatisiertes Publizieren mehrerer Ausgaben am Stück.

## Kategorisierungsregeln (aus der Praxis gelernt)

- Eine Bürgermotion ist ein Bevölkerungsanliegen, keine gewöhnliche Motion. Sie gehört in die Bevölkerungsanliegen-Gruppe, auch wenn sie wie eine Motion benannt ist.
- Nur Motionen und Postulate von amtierenden Ratsmitgliedern gehören in die Gruppe "Motionen & Postulate".
- Ein Referendumsstatus-Badge nur setzen, wenn die Quelle das explizit so nennt. Abschliessend entschiedene Geschäfte bekommen nur dann einen Status (gewählt / überwiesen / nicht überwiesen / aufgenommen / abgeschrieben), wenn die Quelle ihn nennt.
- Die Referendumsfrist wird nie als konkretes Datum im Artikel angezeigt, auch wenn die Quelle sie nennt. Nur der Referendumspflichtig-Status (Ja/Nein) wird gezeigt, für das genaue Datum wird auf die Originalquelle verwiesen. Grund: ein falsch übertragenes Datum könnte jemanden eine echte Unterschriftenfrist verpassen lassen, das ist im Gegensatz zu anderen Fehlern nachträglich nicht mehr korrigierbar. Entschieden im Projekt `Venture Lab/26Q3 Aarau Politik-Newsletter/`, siehe dessen `CLAUDE.md`.
- Themen-Tags (nur aus der festen Liste `THEMEN` in `src/lib/schema.ts`, 1–3 pro Geschäft, Sachgebiet statt Vorgang) immer direkt beim jeweiligen Geschäft zeigen: im Fliesstext-Artikel als Tag-Liste am Ende des Geschäfts, in Tabellen als eigene Spalte. Nie als lose Tag-Wolke ohne Zuordnung zu einem Geschäft, das verwirrt mehr als es hilft.
- Zahlen aus einem Budget oder Politikplan sind Prognosen, keine Ist-Zahlen. Mit dem Badge "Budgetiert, nicht effektiv" (Klasse `badge forecast`) kennzeichnen.
- Währungsangaben prüfen: Aarauer Zahlen sind immer in Franken, nie Euro. Ein "€"-Zeichen in extrahierten Rohdaten ist ein Extraktionsfehler und wird zu "Fr."/"Franken" korrigiert, nicht übernommen.

## Schreibregeln

- Kein einleitender Lead-Satz unter der Überschrift. Die Meta-Zeile deckt die Kerninfo bereits ab, ein zusätzlicher Fliesstext-Teaser ist redundant.
- Fliesstext nur für das, was noch NICHT in Meta-Zeile, Badges oder einer Kennzahlen-Box steht. Keine Wiederholung von Zahlen oder Fakten, die schon sichtbar sind.
- Möglichst kurze, einfache, klare Sprache. Ein bis zwei knappe Sätze pro Geschäft im Fliesstext reichen fast immer, kein Blabla.
- Der "Details zum Geschäft hier"-Link kommt so weit oben wie möglich im Abschnitt, nicht erst nach der Erklärung. Der Newsletter ist nur der Aufhänger, die Quelle soll so schnell wie möglich erreichbar sein.
- Keine erfundenen Fakten, keine unmarkierten Annahmen. Bei Unsicherheit (z.B. unklarer Grund, warum etwas "abgeschrieben" wurde) das explizit als offen benennen statt zu spekulieren.
- Keine interaktive Inline-Suche/Filter auf einzelnen Artikeln. Auffindbarkeit läuft über Meta-Tags, Keywords und JSON-LD (schema.org NewsArticle) für Suchmaschinen und über mehrere Artikel hinweg, nicht über ein JS-Suchfeld auf einer einzelnen Seite.
- Deutsch (Schweiz), Umlaute als ö/ä/ü ausgeschrieben, kein Eszett.

## Politischer Kontext (aktuell nicht angewendet)

Robin verortet sich politisch leicht rechts der Mitte, klar liberal, mit einer Grundüberzeugung für einen schlanken Staat und schnelle Prozesse. Referendumspflicht schätzt er als liberales Prinzip, sieht aber, dass sie auch Prozesse verzögern kann, wo eigentlich gesunder Menschenverstand reichen würde.

Diese Haltung fliesst aktuell NICHT in die Artikel ein, sie bleiben faktisch und neutral. Sie ist hier nur als Kontext für eine mögliche spätere Einordnungs-/Meinungsebene festgehalten. Nicht ungefragt Kommentar oder Wertung einbauen, nur auf explizite Anweisung in einer künftigen Session.

## Publikation (Autonomer Betrieb)

Dieses Vorhaben ist als Projekt `Venture Lab/26Q3 Aarau Politik-Newsletter/` erfasst, inklusive der Risikoabwägung zu unbeaufsichtigter Publikation. Kurzfassung des Entscheids vom 2026-09-10 (Details und Begründung in dessen `CLAUDE.md` und `MEMORY.md`):

- Disclaimer plus Kontaktformular ("Diese Seite wird KI-gestützt betrieben, Fehler sind möglich, bitte über das Kontaktformular melden") ist die Grundregel für autonome Publikation ohne Robins Review. Die meisten Fehler sind nach einer Meldung noch korrigierbar.
- Einzige Ausnahme: die Referendumsfrist wird nie als konkretes Datum gezeigt (siehe Kategorisierungsregeln oben), weil eine falsche Frist durch nachträgliches Melden nicht mehr korrigierbar ist.
- Diese Regel ist eine bewusste, auf dieses Projekt begrenzte Ausnahme von der generellen Cowork-Guardrail "Never send or post without approval" (`00_Reference/Governance Rules - Communication.md`).

## Offen

- Ob und wie künftige Artikel mit erkennbarer Einordnung geschrieben werden (siehe politischer Kontext oben).
- Wie die Auswahl über die laufenden Newsletter-Ausgaben organisiert wird (z.B. regelmässige Sichtung, welcher Rückstand an alten Ausgaben aufgearbeitet wird).
- Konkrete Umsetzung von Disclaimer und Kontaktformular, sobald eine echte Website existiert (aktuell nur einzelne HTML-Dateien als Test-Output).

## Template A: Mehrere Geschäfte (Beschlussliste)

Für Newsletter-Ausgaben mit mehreren Geschäften, z.B. eine Beschlussliste einer Ratssitzung. Platzhalter in `{{...}}` ersetzen, wiederholbare Blöcke sind als Kommentar markiert. CSS-Variablen und Grundstile sind mit Template B identisch, für einheitliches Aussehen über alle Artikel hinweg nicht verändern.

```html
<!DOCTYPE html>
<html lang="de-CH">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{HEADLINE}}</title>
<meta name="description" content="{{META_DESCRIPTION}}">
<meta name="keywords" content="{{KEYWORDS_KOMMAGETRENNT}}">
<meta name="author" content="Robin Schmid">
<meta property="og:type" content="article">
<meta property="og:title" content="{{HEADLINE}}">
<meta property="og:description" content="{{OG_DESCRIPTION}}">
<meta property="article:published_time" content="{{PUBLISHED_DATE_ISO}}">
<!-- Pro Thema ein article:tag wiederholen, z.B. Bildung, Finanzen, Wohnen, Umwelt, Wahlen -->
<meta property="article:tag" content="{{TAG}}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "{{HEADLINE}}",
  "datePublished": "{{PUBLISHED_DATE_ISO}}",
  "dateModified": "{{PUBLISHED_DATE_ISO}}",
  "inLanguage": "de-CH",
  "author": { "@type": "Person", "name": "Robin Schmid" },
  "about": [ { "@type": "Thing", "name": "{{THEMA_1}}" } ],
  "isBasedOn": "{{AMTLICHE_PUBLIKATION_URL}}",
  "citation": [ "{{QUELLE_PDF_URL_1}}" ]
}
</script>
<style>
  :root{
    --bg:#faf8f4; --panel:#ffffff; --ink:#1c1a17; --sub:#5a564e;
    --line:#e4ded2; --accent:#8a5a2b; --accent-ink:#ffffff;
    --tag-bg:#f1ebdd; --tag-ink:#5a4522;
    --forecast-bg:#fbf1e0; --forecast-line:#e0b878;
    --done-bg:#eef1ec; --done-line:#b9c6b4;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --bg:#17140f; --panel:#211d17; --ink:#f0ece2; --sub:#b9b2a3;
      --line:#3a3327; --accent:#d99a52; --accent-ink:#1c1a17;
      --tag-bg:#332c1f; --tag-ink:#e3c48c;
      --forecast-bg:#2d2415; --forecast-line:#8a672f;
      --done-bg:#20241f; --done-line:#455040;
    }
  }
  *{box-sizing:border-box;}
  body{background:var(--bg); color:var(--ink); margin:0; padding-block:2.5rem; font-family:Georgia,'Iowan Old Style','Times New Roman',serif; line-height:1.55;}
  .wrap{max-width:760px; margin:0 auto; padding-inline:1.25rem;}
  .eyebrow{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; text-transform:uppercase; letter-spacing:.08em; font-size:.72rem; color:var(--sub); font-weight:600;}
  h1{font-size:1.9rem; line-height:1.25; margin:.4rem 0 1rem;}
  .meta-row{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.85rem; color:var(--sub); display:flex; gap:1rem; flex-wrap:wrap; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding-block:.6rem; margin-bottom:1.25rem;}
  nav.toc{background:var(--panel); border:1px solid var(--line); border-radius:.6rem; padding:1rem 1.25rem; margin-bottom:2rem; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.88rem;}
  nav.toc h2{font-size:.78rem; text-transform:uppercase; letter-spacing:.06em; color:var(--sub); margin:0 0 .5rem;}
  nav.toc ol{margin:0; padding-left:1.1rem;}
  nav.toc li{margin-bottom:.25rem;}
  nav.toc a{color:var(--ink);}
  section.group{margin-bottom:2.25rem;}
  section.group > h2{font-size:1.25rem; margin-bottom:.25rem;}
  section.group > .group-intro{color:var(--sub); font-size:.95rem; margin-top:0;}
  article.geschaeft{background:var(--panel); border:1px solid var(--line); border-radius:.7rem; padding:1.1rem 1.3rem; margin-bottom:1rem; scroll-margin-top:1rem;}
  article.geschaeft h3{font-size:1.08rem; margin:0 0 .4rem;}
  .badge{display:inline-block; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.72rem; font-weight:600; padding:.15rem .55rem; border-radius:999px; margin-bottom:.5rem;}
  .badge.ref{background:var(--forecast-bg); color:#8a5a12; border:1px solid var(--forecast-line);}
  .badge.done{background:var(--done-bg); color:#4b5c46; border:1px solid var(--done-line);}
  .source-link{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.88rem; margin:.15rem 0 .7rem;}
  .source-link a{color:var(--accent-ink); background:var(--accent); text-decoration:none; padding:.3rem .7rem; border-radius:.4rem; display:inline-block;}
  .source-link a:hover{filter:brightness(1.08);}
  .proposer{color:var(--sub); font-size:.88rem; margin:0 0 .5rem; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;}
  article.geschaeft p.body-text{margin:.4rem 0 .6rem;}
  .item-tags{list-style:none; display:flex; gap:.35rem; flex-wrap:wrap; padding:0; margin:.6rem 0 0;}
  .item-tags li{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.72rem; background:var(--tag-bg); color:var(--tag-ink); padding:.15rem .5rem; border-radius:999px;}
  .subgroup{margin-bottom:1.5rem;}
  .subgroup h3{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.85rem; text-transform:uppercase; letter-spacing:.05em; color:var(--sub); margin:0 0 .5rem;}
  table.geschaeft-table{width:100%; border-collapse:collapse; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.88rem; background:var(--panel); border:1px solid var(--line); border-radius:.5rem; overflow:hidden;}
  table.geschaeft-table th, table.geschaeft-table td{text-align:left; padding:.55rem .7rem; border-bottom:1px solid var(--line); vertical-align:top;}
  table.geschaeft-table thead th{font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; color:var(--sub); font-weight:600;}
  table.geschaeft-table tbody tr:last-child td{border-bottom:none;}
  table.geschaeft-table td.status{white-space:nowrap;}
  table.geschaeft-table td .badge{margin:0;}
  table.geschaeft-table td a{color:var(--accent); text-decoration:underline; white-space:nowrap;}
  table.geschaeft-table td .item-tags{margin:0;}
  footer{border-top:1px solid var(--line); margin-top:2rem; padding-top:1.25rem; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.82rem; color:var(--sub);}
  footer a{color:var(--sub);}
  footer .note{margin-top:.8rem; font-style:italic;}
</style>
</head>
<body>
<div class="wrap">

  <p class="eyebrow">Aufhänger: Newsletter der Stadt Aarau, {{NEWSLETTER_DATUM}} · {{KATEGORIE}}</p>
  <h1>{{HEADLINE}}</h1>

  <div class="meta-row">
    <span>Sitzung: <time datetime="{{SITZUNGSDATUM_ISO}}">{{SITZUNGSDATUM_LESBAR}}</time></span>
    <span>Publiziert: <time datetime="{{PUBLISHED_DATE_ISO}}">{{PUBLISHED_DATE_LESBAR}}</time></span>
  </div>

  <!-- TOC nur bei mehreren Geschäften. Referendumspflichtige einzeln verlinken, ALLE abschliessend entschiedenen zu EINEM Punkt zusammenfassen, der auf #abschliessend zeigt. -->
  <nav class="toc" aria-label="Inhalt dieser Ausgabe">
    <h2>Behandelte Geschäfte</h2>
    <ol>
      <li><a href="#{{ID_1}}">{{TITEL_1}}</a></li>
      <!-- weitere referendumspflichtige Geschäfte einzeln -->
      <li><a href="#abschliessend">Abschliessend entschiedene Geschäfte</a></li>
    </ol>
  </nav>

  <main>
    <!-- Abschnitt nur einfügen, wenn es referendumspflichtige Geschäfte gibt -->
    <section class="group" id="referendum">
      <h2>Referendumspflichtig</h2>
      <p class="group-intro">Wer mit {{ANZAHL_BESCHLUESSE}} nicht einverstanden ist, kann per Referendum eine Volksabstimmung erzwingen. Das genaue Datum der Unterschriftenfrist steht in der jeweiligen Originalquelle, oben bei jedem Geschäft verlinkt. Ohne genug Unterschriften treten sie danach automatisch in Kraft.</p>

      <!-- Ein <article> pro referendumspflichtigem Geschäft -->
      <article class="geschaeft" id="{{ID_1}}" data-tags="{{TAGS_1}}">
        <h3>{{TITEL_1}}</h3>
        <p class="source-link">Details zum Geschäft hier: <a href="{{QUELLE_URL_1}}" target="_blank" rel="noopener">{{QUELLE_LABEL_1}}</a></p>
        <p class="body-text">{{KURZTEXT_1}}</p>
        <ul class="item-tags"><li>{{TAG_A}}</li><li>{{TAG_B}}</li></ul>
      </article>
    </section>

    <!-- Alle abschliessend/rechtskräftig entschiedenen Geschäfte, gruppiert nach Art. Nur die Subgroups einfügen, die tatsächlich Geschäfte haben. -->
    <section class="group" id="abschliessend">
      <h2>Abschliessend entschieden</h2>
      <p class="group-intro">Diese Geschäfte sind bereits rechtskräftig, kein Referendum möglich. Nur Quelle, keine Einzeleinordnung.</p>

      <div class="subgroup">
        <h3>Wahlen</h3>
        <table class="geschaeft-table">
          <thead><tr><th>Geschäft</th><th>Ereignis</th><th>Themen</th><th>Quelle</th></tr></thead>
          <tbody>
            <tr id="{{ID}}" data-tags="{{TAGS}}">
              <td>{{GESCHAEFT_TEXT}}</td>
              <td class="status"><span class="badge done">{{STATUS}}</span></td>
              <td><ul class="item-tags"><li>{{TAG}}</li></ul></td>
              <td><a href="{{QUELLE_URL}}" target="_blank" rel="noopener">{{QUELLE_LABEL}}</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Nur Vorstösse von amtierenden Ratsmitgliedern. Spalten: Geschäft, Urheber/in, Ereignis, Themen, Quelle -->
      <div class="subgroup">
        <h3>Motionen &amp; Postulate</h3>
        <table class="geschaeft-table">
          <thead><tr><th>Geschäft</th><th>Urheber/in</th><th>Ereignis</th><th>Themen</th><th>Quelle</th></tr></thead>
          <tbody>
            <tr id="{{ID}}" data-tags="{{TAGS}}">
              <td>{{GESCHAEFT_TEXT}}</td>
              <td>{{URHEBER_PARTEI}}</td>
              <td class="status"><span class="badge done">{{STATUS}}</span></td>
              <td><ul class="item-tags"><li>{{TAG}}</li></ul></td>
              <td><a href="{{QUELLE_URL}}" target="_blank" rel="noopener">{{QUELLE_LABEL}}</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bürgermotionen (!) und echte Bevölkerungsanliegen. Eine Bürgermotion ist KEINE gewöhnliche Motion, gehört hierher. -->
      <div class="subgroup">
        <h3>Bevölkerungsanliegen</h3>
        <table class="geschaeft-table">
          <thead><tr><th>Geschäft</th><th>Urheber/in</th><th>Ereignis</th><th>Themen</th><th>Quelle</th></tr></thead>
          <tbody>
            <tr id="{{ID}}" data-tags="{{TAGS}}">
              <td>{{GESCHAEFT_TEXT}}</td>
              <td>{{URHEBER}}</td>
              <td class="status"><span class="badge done">{{STATUS}}</span></td>
              <td><ul class="item-tags"><li>{{TAG}}</li></ul></td>
              <td><a href="{{QUELLE_URL}}" target="_blank" rel="noopener">{{QUELLE_LABEL}}</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <footer>
    <p>Quelle: Amtliche Publikation der Stadt Aarau, veröffentlicht {{PUBLISHED_DATE_LESBAR}}, <a href="{{AMTLICHE_PUBLIKATION_URL}}" target="_blank" rel="noopener">{{AMTLICHE_PUBLIKATION_URL_LESBAR}}</a>. Alle Botschaften und Reglementstexte einzeln oben pro Geschäft verlinkt.</p>
    <p class="note">Erstellt aus der Newsletter-Ausgabe „{{NEWSLETTER_BETREFF}}" der Stadt Aarau (kommunikation@aarau.ch) vom {{NEWSLETTER_DATUM}}.</p>
    <p class="note">Diese Seite wird KI-gestützt betrieben. Fehler können vorkommen, bei Auffälligkeiten bitte über das <a href="{{KONTAKTFORMULAR_URL}}">Kontaktformular</a> melden.</p>
  </footer>

</div>
</body>
</html>
```

## Template B: Einzelthema (Medienmitteilung)

Für Newsletter-Ausgaben mit nur einem Geschäft, z.B. eine einzelne Medienmitteilung wie eine Budget-Ankündigung. Kein TOC, keine Tabellen, dafür optional eine Kennzahlen-Box.

```html
<!DOCTYPE html>
<html lang="de-CH">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{HEADLINE}}</title>
<meta name="description" content="{{META_DESCRIPTION}}">
<meta name="keywords" content="{{KEYWORDS_KOMMAGETRENNT}}">
<meta name="author" content="Robin Schmid">
<meta property="og:type" content="article">
<meta property="og:title" content="{{HEADLINE}}">
<meta property="og:description" content="{{OG_DESCRIPTION}}">
<meta property="article:published_time" content="{{PUBLISHED_DATE_ISO}}">
<meta property="article:tag" content="{{TAG}}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "{{HEADLINE}}",
  "datePublished": "{{PUBLISHED_DATE_ISO}}",
  "dateModified": "{{PUBLISHED_DATE_ISO}}",
  "inLanguage": "de-CH",
  "author": { "@type": "Person", "name": "Robin Schmid" },
  "about": [ { "@type": "Thing", "name": "{{THEMA}}" } ],
  "isBasedOn": "{{QUELLE_URL}}",
  "citation": [ "{{QUELLE_PDF_URL}}" ]
}
</script>
<style>
  :root{
    --bg:#faf8f4; --panel:#ffffff; --ink:#1c1a17; --sub:#5a564e;
    --line:#e4ded2; --accent:#8a5a2b; --accent-ink:#ffffff;
    --tag-bg:#f1ebdd; --tag-ink:#5a4522;
    --forecast-bg:#fbf1e0; --forecast-line:#e0b878;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --bg:#17140f; --panel:#211d17; --ink:#f0ece2; --sub:#b9b2a3;
      --line:#3a3327; --accent:#d99a52; --accent-ink:#1c1a17;
      --tag-bg:#332c1f; --tag-ink:#e3c48c;
      --forecast-bg:#2d2415; --forecast-line:#8a672f;
    }
  }
  *{box-sizing:border-box;}
  body{background:var(--bg); color:var(--ink); margin:0; padding-block:2.5rem; font-family:Georgia,'Iowan Old Style','Times New Roman',serif; line-height:1.55;}
  .wrap{max-width:760px; margin:0 auto; padding-inline:1.25rem;}
  .eyebrow{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; text-transform:uppercase; letter-spacing:.08em; font-size:.72rem; color:var(--sub); font-weight:600;}
  h1{font-size:1.9rem; line-height:1.25; margin:.4rem 0 1rem;}
  .meta-row{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.85rem; color:var(--sub); display:flex; gap:1rem; flex-wrap:wrap; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding-block:.6rem; margin-bottom:1.25rem;}
  .source-link{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.88rem; margin:0 0 1rem;}
  .source-link a{color:var(--accent-ink); background:var(--accent); text-decoration:none; padding:.3rem .7rem; border-radius:.4rem; display:inline-block;}
  .source-link a:hover{filter:brightness(1.08);}
  .badge{display:inline-block; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.72rem; font-weight:600; padding:.15rem .55rem; border-radius:999px; margin-bottom:.5rem;}
  .badge.forecast{background:var(--forecast-bg); color:#8a5a12; border:1px solid var(--forecast-line);}
  .kennzahlen{background:var(--panel); border:1px solid var(--line); border-radius:.6rem; padding:.9rem 1.2rem; margin:0 0 1.25rem; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.88rem;}
  .kennzahlen dt{color:var(--sub); font-size:.76rem; margin-top:.5rem;}
  .kennzahlen dt:first-child{margin-top:0;}
  .kennzahlen dd{margin:0; font-size:1rem; font-family:Georgia,serif;}
  article.geschaeft p.body-text{margin:0 0 .8rem;}
  .item-tags{list-style:none; display:flex; gap:.35rem; flex-wrap:wrap; padding:0; margin:0 0 1.25rem;}
  .item-tags li{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.72rem; background:var(--tag-bg); color:var(--tag-ink); padding:.15rem .5rem; border-radius:999px;}
  footer{border-top:1px solid var(--line); margin-top:2rem; padding-top:1.25rem; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; font-size:.82rem; color:var(--sub);}
  footer a{color:var(--sub);}
  footer .note{margin-top:.8rem; font-style:italic;}
</style>
</head>
<body>
<div class="wrap">

  <p class="eyebrow">Aufhänger: Newsletter der Stadt Aarau, {{NEWSLETTER_DATUM}} · {{KATEGORIE}}</p>
  <h1>{{HEADLINE}}</h1>

  <div class="meta-row">
    <span>Publiziert: <time datetime="{{PUBLISHED_DATE_ISO}}">{{PUBLISHED_DATE_LESBAR}}</time></span>
    <!-- weitere Meta-Angaben nach Bedarf, z.B. Steuerfuss, Planperiode -->
  </div>

  <article class="geschaeft" id="{{ID}}">
    <p class="source-link">Details zum Geschäft hier: <a href="{{QUELLE_URL}}" target="_blank" rel="noopener">{{QUELLE_LABEL}}</a></p>

    <!-- Nur einfügen, wenn Zahlen budgetiert/prognostiziert statt effektiv sind -->
    <span class="badge forecast">Budgetiert, nicht effektiv</span>

    <!-- Nur bei Kennzahlen (Finanzen, Statistiken). Sonst ganz weglassen. -->
    <dl class="kennzahlen">
      <dt>{{KENNZAHL_LABEL_1}}</dt>
      <dd>{{KENNZAHL_WERT_1}}</dd>
    </dl>

    <!-- Nur was NICHT schon in Meta-Zeile, Badge oder Kennzahlen-Box steht. Kurz, klare Sprache, keine Wiederholung. -->
    <p class="body-text">{{KURZTEXT}}</p>

    <ul class="item-tags"><li>{{TAG_A}}</li><li>{{TAG_B}}</li></ul>
  </article>

  <footer>
    <p>Quelle: {{QUELLENTYP}} der Stadt Aarau, veröffentlicht {{PUBLISHED_DATE_LESBAR}}, <a href="{{QUELLE_URL}}" target="_blank" rel="noopener">{{QUELLE_URL_LESBAR}}</a>.</p>
    <p class="note">Erstellt aus der Newsletter-Ausgabe „{{NEWSLETTER_BETREFF}}" der Stadt Aarau (kommunikation@aarau.ch) vom {{NEWSLETTER_DATUM}}.</p>
    <p class="note">Diese Seite wird KI-gestützt betrieben. Fehler können vorkommen, bei Auffälligkeiten bitte über das <a href="{{KONTAKTFORMULAR_URL}}">Kontaktformular</a> melden.</p>
  </footer>

</div>
</body>
</html>
```