import type { APIRoute } from "astro";
import { getAllAusgaben, getArtikelPfad } from "../../lib/content";
import { formatDatumLesbar } from "../../lib/format";
import { erzeugeLogo, erzeugeOgBild, type OgBildInhalt } from "../../lib/og-bild";
import { siteConfig } from "../../site.config";

/**
 * Vorschaubilder als statische PNGs: eines pro Artikel unter
 * /og/<jahr>/<monat>/<slug>.png, dazu /og/standard.png für alle übrigen
 * Seiten und /og/logo.png für publisher.logo im JSON-LD.
 */
type Props = { art: "logo" } | { art: "bild"; inhalt: OgBildInhalt };

export function getStaticPaths() {
  const artikel = getAllAusgaben().map((ausgabe) => {
    const { jahr, monat, slug } = getArtikelPfad(ausgabe);
    const { headline, kategorie, datePublished } = ausgabe.frontmatter;
    return {
      params: { pfad: `${jahr}/${monat}/${slug}` },
      props: {
        art: "bild",
        inhalt: {
          titel: headline,
          oberzeile: kategorie,
          unterzeile: formatDatumLesbar(datePublished),
        },
      } satisfies Props,
    };
  });
  return [
    ...artikel,
    {
      params: { pfad: "standard" },
      props: {
        art: "bild",
        inhalt: { titel: "Aarauer Kommunalpolitik, mit Link zur amtlichen Quelle", oberzeile: siteConfig.name },
      } satisfies Props,
    },
    { params: { pfad: "logo" }, props: { art: "logo" } satisfies Props },
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const p = props as Props;
  const png = p.art === "logo" ? await erzeugeLogo() : await erzeugeOgBild(p.inhalt);
  return new Response(png as BodyInit, { headers: { "Content-Type": "image/png" } });
};
