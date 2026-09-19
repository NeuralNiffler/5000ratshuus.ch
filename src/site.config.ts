/**
 * Zentrale Seitenkonfiguration. Name und Domain sind laut Entwicklungsdokument
 * Abschnitt 11 noch nicht endgültig entschieden (Favorit: 5000ratshuus.ch).
 * Alles, was von Name oder Domain abhängt, liest von hier statt Werte zu wiederholen.
 */
export const siteConfig = {
  /** Sichtbarer Seitenname, z. B. im Header, Footer und in Meta-Angaben. */
  name: "5000ratshuus.ch",
  /** Basis-URL ohne abschliessenden Slash. Für RSS, Sitemap, JSON-LD und og:url. */
  baseUrl: "https://5000ratshuus.ch",
  /** Kurzbeschreibung der Seite für Meta-Description der Startseite und RSS. */
  description:
    "Ein quellenverlinkter Blog zur Aarauer Kommunalpolitik: Einwohnerrats-Beschlüsse, Budget und Planung der Stadt Aarau, aufbereitet aus dem städtischen Newsletter und verlinkt auf die amtlichen Originalquellen.",
  /** Sprache gemäss Abschnitt 7: de-CH durchgehend. */
  lang: "de-CH",
  /** Pfad zur Kontaktseite, für Footer- und Disclaimer-Links. */
  contactPath: "/kontakt/",
  /** Disclaimer-Text, verbindlich laut Entwicklungsdokument F5. */
  disclaimer:
    "Diese Seite wird KI-gestützt betrieben. Fehler können vorkommen, bei Auffälligkeiten bitte über das Kontaktformular melden.",
  /** Hinweis auf die private, nicht-amtliche Urheberschaft (Abschnitt 13). */
  privateNotice:
    "Diese Seite ist ein privates Projekt und steht in keiner Verbindung zur Stadt Aarau. Sie ist kein amtliches Angebot der Stadt.",
} as const;
