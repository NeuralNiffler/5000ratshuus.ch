import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getAllAusgaben, getArtikelUrl } from "../lib/content";
import { siteConfig } from "../site.config";

export const GET: APIRoute = async (context) => {
  const ausgaben = getAllAusgaben();
  return rss({
    title: siteConfig.name,
    description: siteConfig.description,
    site: context.site ?? siteConfig.baseUrl,
    items: ausgaben.map((ausgabe) => ({
      title: ausgabe.frontmatter.headline,
      pubDate: new Date(ausgabe.frontmatter.datePublished),
      description: ausgabe.frontmatter.description,
      link: getArtikelUrl(ausgabe),
      categories: ausgabe.frontmatter.keywords,
    })),
    customData: `<language>${siteConfig.lang}</language>`,
  });
};
