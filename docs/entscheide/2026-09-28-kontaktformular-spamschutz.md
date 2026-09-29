# Spamschutz im Kontaktformular: Turnstile und markierender Inhaltsfilter

**Datum:** 2026-09-28
**Kontext:** Am 28.09.2026 kam trotz Honeypot eine englische Werbemail
("Videos ab $195 USD") über das Kontaktformular.

## Entscheid

Drei Schichten im Kontakt-Worker (`workers/kontakt/`):

1. **Honeypot** `website` (unverändert): Anfrage wird still verworfen.
2. **Cloudflare Turnstile**: Die Kontaktseite lädt das Turnstile-Widget, der
   Worker prüft das Token (`cf-turnstile-response`) über `siteverify`. Kein
   gültiges Token → Weiterleitung auf `/kontakt/fehler/pruefung/`, kein
   Versand. Fail closed: Ist Cloudflare nicht erreichbar, wird ebenfalls
   nicht versendet.
3. **Inhaltsfilter** (`workers/kontakt/src/spam.ts`): Heuristiken für
   englischen Text, Dollarbeträge, Verkaufsphrasen, viele Links. Ab zwei
   Treffern bekommt der Betreff `[Spam?]` und der Text eine Zeile mit den
   Gründen. Die Mail wird **trotzdem zugestellt**.

Site-Key in `src/site.config.ts` (öffentlich), Secret-Key als Worker-Secret
`TURNSTILE_SECRET`.

## Warum

- **Turnstile trotz "kein Framework-JS im Browser":** Turnstile ist ein
  Prüf-Widget, kein UI-Framework, und wird nur auf `/kontakt/` geladen. Alle
  anderen Seiten bleiben ohne Skript. Ohne JavaScript lässt sich das Formular
  nicht mehr absenden; ein `<noscript>`-Hinweis sagt das.
- **Markieren statt verwerfen:** Eine echte Fehlermeldung zu einem Artikel
  (Entwicklungsdokument F5) darf nicht in einem Filter verschwinden. Englisch
  oder ein Link allein ist legitim, deshalb erst ab zwei Gründen. In Gmail
  lässt sich `[Spam?]` per Filter in ein Label verschieben.
- **Fehlerseiten statt `?fehler=`:** Das Formular zeigte bisher bei einem
  Fehler kommentarlos wieder das leere Formular. Je Grund eine statische Seite
  unter `/kontakt/fehler/<grund>/` funktioniert ohne Skript.

## Verworfen

- **Rate-Limit pro IP:** hilft gegen Fluten, nicht gegen einzelne Werbemails.
- **Nur Gmail-Filter:** Spam käme weiterhin an, Pflege von Hand.
- **Inhaltsfilter, der verwirft:** Risiko, echte Meldungen zu verlieren.
