# Art des Geschäfts beschreibt das Verfahren, nicht den Gegenstand

**Datum:** 2026-09-27
**Kontext:** Archiv nach Art (`/archiv/art/<art>/`) und Filter „Art des
Geschäfts“ auf der Startseite, nach den ersten 22 Geschäften

## Entscheid

`art` sagt, wer entscheidet oder auf welchem Weg ein Eintrag entsteht. Feste
Liste `GESCHAEFT_ARTEN` in [`src/lib/schema.ts`](../../src/lib/schema.ts),
in dieser Reihenfolge (auch die Anzeigereihenfolge):

| Wert | Label | Wann |
|---|---|---|
| `volksabstimmung` | Volksabstimmung | Ergebnis einer Urnenabstimmung |
| `ratsbeschluss` | Beschluss Einwohnerrat | Sachvorlage des Einwohnerrats: Budget, Kredit, Reglement, Bevölkerungsanliegen, Kenntnisnahme |
| `wahl` | Wahl | Wahl im oder durch den Einwohnerrat |
| `motion` | Motion | Motion eines Ratsmitglieds |
| `postulat` | Postulat | Postulat eines Ratsmitglieds |
| `buergermotion` | Bürgermotion | Bürgermotion |
| `stadtrat` | Stadtrat | Beschluss oder Mitteilung des Stadtrats, auch eine Vorlage, die er erst an den Einwohnerrat überweist |
| `auflage` | Auflage & Mitwirkung | öffentliche Auflage, Projektauflage, Mitwirkungsverfahren |
| `sonstiges` | Sonstiges | nur, wenn nichts davon passt |

`kredit` und `reglement` fallen weg. Der Gegenstand steht im Titel, das
Sachgebiet in den Themen-Tags (siehe
[`2026-09-23-themen-vokabular.md`](2026-09-23-themen-vokabular.md)).

## Warum

Die alte Liste aus Abschnitt 9 des Entwicklungsdokuments mischte zwei Achsen:
Instrumente (Wahl, Motion, Postulat, Bürgermotion) und Gegenstände (Kredit,
Reglement). Ein Kredit konnte vom Einwohnerrat oder an der Urne beschlossen
sein, die Art verriet das nicht. Gleichzeitig landeten 11 von 22 Geschäften
unter „Sonstiges“, vor allem Stadtrats-Mitteilungen und öffentliche Auflagen.

„Beschluss Einwohnerrat“ statt „Entscheid“: Wahlen und Motionen sind auch
Entscheide des Einwohnerrats. Das Label meint nur die Sachvorlagen.

Auflagen und Mitwirkungen sind eine eigene Art, weil man dort selbst etwas
einreichen kann. Für Leserinnen und Leser ist das ein anderer Anlass als eine
blosse Mitteilung.

## Folgen

- Alle bestehenden `geschaefte.json` wurden umgestellt. Die Archivseiten
  `/archiv/art/kredit/` und `/archiv/art/reglement/` gibt es nicht mehr.
- Die Pipeline-Regeln in `scripts/pipeline/prompts.ts` beschreiben die
  Zuordnung, das Enum im Zielformat kommt direkt aus `GESCHAEFT_ARTEN`.
- `quellen[].typ: "reglement"` bleibt: Das ist der Typ des verlinkten
  Dokuments, nicht die Art des Geschäfts.
