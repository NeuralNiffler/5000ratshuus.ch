import { getAllAusgaben, getArtikelUrl } from "./content";
import { slugify } from "./format";
import { absoluteUrl } from "./jsonld";

/**
 * lastmod pro URL für die Sitemap (astro.config.mjs). Artikel: letzte
 * Korrektur, sonst Publikationsdatum. Archivseiten: jüngstes
 * Publikationsdatum der dort gelisteten Geschäfte, gleiche Gruppierung wie
 * src/lib/index-db.ts. Statische Seiten (Impressum usw.) bekommen keins.
 *
 * Direkt aus den Dateien gelesen statt aus dem SQLite-Index, weil die
 * Astro-Konfiguration auch dann geladen wird, wenn .build/ noch fehlt.
 */
export function getLastmodMap(): Map<string, string> {
  const lastmod = new Map<string, string>();
  const setzeJuengstes = (pfad: string, datum: string) => {
    const url = absoluteUrl(pfad);
    const bisher = lastmod.get(url);
    if (!bisher || datum > bisher) lastmod.set(url, datum);
  };

  for (const ausgabe of getAllAusgaben()) {
    setzeJuengstes(getArtikelUrl(ausgabe), ausgabe.dateModified);
    setzeJuengstes("/", ausgabe.dateModified);
    for (const g of ausgabe.geschaefte) {
      const [jahr, monat] = g.publikationsdatum.split("-");
      setzeJuengstes("/archiv/", g.publikationsdatum);
      setzeJuengstes(`/archiv/art/${g.art}/`, g.publikationsdatum);
      setzeJuengstes(`/archiv/datum/${jahr}/`, g.publikationsdatum);
      setzeJuengstes(`/archiv/datum/${jahr}/${monat}/`, g.publikationsdatum);
      for (const tag of g.tags) setzeJuengstes(`/archiv/thema/${slugify(tag)}/`, g.publikationsdatum);
    }
  }
  return lastmod;
}
