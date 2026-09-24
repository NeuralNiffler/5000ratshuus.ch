import type { Ausgabe } from "./schema";
import { getArtikelPfad, getArtikelUrl, getCitations, getOgBildUrl } from "./content";
import { OG_BREITE, OG_HOEHE } from "./og-bild";
import { siteConfig } from "../site.config";

/**
 * JSON-LD-Objekte (schema.org) für alle Seitentypen. Reines TS ohne Astro,
 * damit Prüfung 7 in src/lib/checks.ts dieselben Objekte prüft, die auch
 * gerendert werden, statt ihre Form nachzubauen.
 */

export type JsonLdObjekt = Record<string, unknown>;

export interface Brotkrume {
  name: string;
  /** Pfad relativ zur Domain, z. B. "/archiv/". */
  pfad: string;
}

export const absoluteUrl = (pfad: string): string => new URL(pfad, siteConfig.baseUrl).toString();

export const LOGO_PFAD = "/og/logo.png";
export const STANDARD_BILD_PFAD = "/og/standard.png";

const ORGANISATION_ID = `${siteConfig.baseUrl}/#organisation`;

/**
 * Herausgeberin ist die Seite selbst, keine Person und nicht die Stadt Aarau
 * (docs/entscheide/2026-09-16-kein-personenautor.md, Abschnitt 13).
 */
function organisation(): JsonLdObjekt {
  return {
    "@type": "Organization",
    "@id": ORGANISATION_ID,
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PFAD), width: 512, height: 512 },
  };
}

/** Startseite: Website und Herausgeberin. Keine SearchAction, die Seite hat keine Suche. */
export function websiteJsonLd(): JsonLdObjekt {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.baseUrl}/#website`,
        name: siteConfig.name,
        url: siteConfig.baseUrl,
        description: siteConfig.description,
        inLanguage: siteConfig.lang,
        publisher: { "@id": ORGANISATION_ID },
      },
      { ...organisation(), description: siteConfig.description },
    ],
  };
}

export function artikelJsonLd(ausgabe: Ausgabe): JsonLdObjekt {
  const { frontmatter, dateModified } = ausgabe;
  const url = absoluteUrl(getArtikelUrl(ausgabe));
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: frontmatter.headline,
    description: frontmatter.description,
    url,
    mainEntityOfPage: url,
    image: {
      "@type": "ImageObject",
      url: absoluteUrl(getOgBildUrl(ausgabe)),
      width: OG_BREITE,
      height: OG_HOEHE,
    },
    datePublished: frontmatter.datePublished,
    dateModified,
    inLanguage: siteConfig.lang,
    articleSection: frontmatter.kategorie,
    keywords: frontmatter.keywords.join(", "),
    isAccessibleForFree: true,
    publisher: organisation(),
    contentLocation: { "@type": "Place", name: "Aarau" },
    ...(frontmatter.about.length > 0
      ? { about: frontmatter.about.map((name) => ({ "@type": "Thing", name })) }
      : {}),
    isBasedOn: frontmatter.quelleAmtlich,
    citation: getCitations(ausgabe),
  };
}

/** Brotkrumen eines Artikels: Startseite → Archiv → Jahr → Artikel. */
export function artikelBrotkrumen(ausgabe: Ausgabe): Brotkrume[] {
  const { jahr } = getArtikelPfad(ausgabe);
  return [
    { name: "Startseite", pfad: "/" },
    { name: "Archiv", pfad: "/archiv/" },
    { name: jahr, pfad: `/archiv/datum/${jahr}/` },
    { name: ausgabe.frontmatter.headline, pfad: getArtikelUrl(ausgabe) },
  ];
}

export function brotkrumenJsonLd(krumen: Brotkrume[]): JsonLdObjekt {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: krumen.map((k, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: k.name,
      item: absoluteUrl(k.pfad),
    })),
  };
}

/** Archivseiten (Thema, Art, Datum). */
export function sammlungJsonLd(name: string, description: string, pfad: string): JsonLdObjekt {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(pfad),
    inLanguage: siteConfig.lang,
    isPartOf: { "@type": "WebSite", url: siteConfig.baseUrl, name: siteConfig.name },
  };
}
