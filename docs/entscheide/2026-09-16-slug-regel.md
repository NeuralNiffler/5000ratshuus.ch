# Slug-Regel: ASCII statt Umlaute

**Datum:** 2026-09-16
**Kontext:** Bauauftrag Phase 1a (Website-Gerüst)

## Entscheid

Artikel-Slugs (und damit ein Teil der Artikel-URL) verwenden reines ASCII:
`ä → ae`, `ö → oe`, `ü → ue`, kein Eszett, keine sonstigen Sonderzeichen.
Durchgesetzt per Zod-Regex in [`src/lib/schema.ts`](../../src/lib/schema.ts)
(`asciiSlug`).

Beispiel: `einwohnerrat-beschluesse-24-08-2026`, nicht
`einwohnerrat-beschlüsse-24-08-2026`.

## Warum

Das Entwicklungsdokument verlangt in F4 und Abschnitt 7 durchgehend Umlaute,
ausdrücklich auch in Slugs. Robin hat das im Rückfragen-Gespräch vom
2026-09-16 explizit korrigiert: Slugs ohne Umlaute.

Praktischer Grund, der zu dieser Rückfrage führte: `ü` in einer URL wird beim
Teilen oft Prozent-kodiert (`%C3%BC`), was in Messengern, manchen Tools und
beim Abtippen fehleranfällig ist. Da Artikel-URLs laut F5 stabil bleiben
müssen und nie mehr geändert werden sollen, war das vor dem ersten Artikel zu
entscheiden, nicht nachträglich korrigierbar.

## Was NICHT betroffen ist

Nur die Slug-/URL-Ebene. Überschriften, Fliesstext, Tags, Meta-Angaben und
alle sonstigen Inhalte behalten Umlaute wie in Abschnitt 7 verlangt
(„Sprache und Zeichen: de-CH durchgehend, Umlaute ausgeschrieben").

## Verworfen

- **Umlaute direkt in der URL** (Entwicklungsdokument-Wortlaut): verworfen
  wegen der Encoding-Probleme beim Teilen von Links.
- **Automatische Transliteration ohne Entscheid** (z. B. `ü → u`, Umlaut
  einfach fallen lassen): verworfen, weil das zu verwirrenden oder
  kollidierenden Wörtern führen kann (`Schuler` vs. `Schüler`). `ae/oe/ue`
  ist die verbreitete, verlustfreie Schweizer Konvention.

## Nachführung im Entwicklungsdokument

Siehe datierte Notiz am Ende von
`docs/Entwicklungsdokument - Aarau Politik-Newsletter.md`.
