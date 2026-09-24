// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { siteConfig } from "./src/site.config.ts";
import { getLastmodMap } from "./src/lib/sitemap.ts";

/** Seiten, die nicht in die Sitemap gehören (tragen zusätzlich noindex). */
const OHNE_SITEMAP = ["/kontakt/danke/", "/404/"];

/** @type {Map<string, string> | undefined} */
let lastmodMap;

// https://astro.build/config
export default defineConfig({
  site: siteConfig.baseUrl,
  integrations: [
    sitemap({
      filter: (page) => !OHNE_SITEMAP.some((pfad) => new URL(page).pathname === pfad),
      serialize(item) {
        lastmodMap ??= getLastmodMap();
        const lastmod = lastmodMap.get(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
