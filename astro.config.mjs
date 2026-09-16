// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { siteConfig } from "./src/site.config.ts";

// https://astro.build/config
export default defineConfig({
  site: siteConfig.baseUrl,
  integrations: [sitemap()],
});
