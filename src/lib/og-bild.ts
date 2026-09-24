import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { siteConfig } from "../site.config";

/**
 * Vorschaubilder (og:image, JSON-LD image) als PNG, beim Build erzeugt.
 * satori setzt ein einfaches Layout-Objekt zu SVG, resvg rastert es zu PNG.
 * Beides läuft rein in Node, ohne Browser und ohne Bilddienst im Betrieb.
 *
 * Bewusst kein Wappen und kein Stadtlogo: Die Seite darf nicht amtlich
 * wirken (Entwicklungsdokument Abschnitt 13).
 */

export const OG_BREITE = 1200;
export const OG_HOEHE = 630;

/** Farben aus den hellen Tokens in src/styles/global.css. */
const FARBE = {
  bg: "#faf8f4",
  ink: "#1c1a17",
  sub: "#5a564e",
  line: "#e4ded2",
  accent: "#8a5a2b",
};

const require = createRequire(import.meta.url);
const schrift = (gewicht: 400 | 600) =>
  readFileSync(
    require.resolve(`@fontsource/source-serif-4/files/source-serif-4-latin-${gewicht}-normal.woff`),
  );

let schriften: { name: string; data: Buffer; weight: 400 | 600; style: "normal" }[] | undefined;
function ladeSchriften() {
  schriften ??= [
    { name: "Source Serif 4", data: schrift(400), weight: 400, style: "normal" },
    { name: "Source Serif 4", data: schrift(600), weight: 600, style: "normal" },
  ];
  return schriften;
}

/** Minimaler Ersatz für JSX, satori nimmt React-Element-förmige Objekte. */
type Knoten = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Knoten => ({
  type,
  props: { style, children },
});

async function zuPng(knoten: Knoten, breite: number, hoehe: number): Promise<Uint8Array> {
  const svg = await satori(knoten as never, { width: breite, height: hoehe, fonts: ladeSchriften() });
  return new Resvg(svg, { fitTo: { mode: "width", value: breite } }).render().asPng();
}

export interface OgBildInhalt {
  titel: string;
  /** Zeile über dem Titel, z. B. Kategorie. */
  oberzeile?: string;
  /** Zeile unter dem Titel, z. B. das Publikationsdatum. */
  unterzeile?: string;
}

export function erzeugeOgBild({ titel, oberzeile, unterzeile }: OgBildInhalt): Promise<Uint8Array> {
  // Lange Titel verkleinern, damit sie in höchstens vier Zeilen passen.
  const titelGroesse = titel.length > 110 ? 50 : titel.length > 70 ? 58 : 68;

  const knoten = el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: FARBE.bg,
      borderTop: `16px solid ${FARBE.accent}`,
      padding: "64px 80px 56px",
      fontFamily: "Source Serif 4",
      color: FARBE.ink,
    },
    [
      el("div", { display: "flex", flexDirection: "column" }, [
        oberzeile
          ? el(
              "div",
              {
                fontSize: 28,
                color: FARBE.accent,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 28,
              },
              oberzeile,
            )
          : null,
        el("div", { fontSize: titelGroesse, fontWeight: 600, lineHeight: 1.15 }, titel),
      ]),
      el(
        "div",
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderTop: `2px solid ${FARBE.line}`,
          paddingTop: 24,
          fontSize: 30,
          color: FARBE.sub,
        },
        [
          el("div", { fontWeight: 600, color: FARBE.ink }, siteConfig.name),
          unterzeile ? el("div", {}, unterzeile) : null,
        ],
      ),
    ],
  );
  return zuPng(knoten, OG_BREITE, OG_HOEHE);
}

/** Quadratisches Logo für publisher.logo im JSON-LD: Wortmarke, kein Stadtsymbol. */
export function erzeugeLogo(): Promise<Uint8Array> {
  const groesse = 512;
  const knoten = el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: FARBE.accent,
      color: FARBE.bg,
      fontFamily: "Source Serif 4",
      fontWeight: 600,
    },
    [el("div", { fontSize: 170, lineHeight: 1 }, "5000"), el("div", { fontSize: 72 }, "ratshuus")],
  );
  return zuPng(knoten, groesse, groesse);
}

/**
 * Favicon im Stil des Logos, nur "5000" (bei 16 px wäre "ratshuus" nicht
 * lesbar). Die Schrift wird von satori in Pfade umgewandelt, deshalb sieht
 * das SVG ohne installierte Schrift überall gleich aus. Erzeugt einmalig
 * über scripts/erzeuge-favicon.ts, das Ergebnis liegt in public/.
 */
export async function erzeugeFavicon(): Promise<{ svg: string; png: (groesse: number) => Uint8Array }> {
  const groesse = 64;
  const knoten = el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: FARBE.accent,
      borderRadius: 12,
      color: FARBE.bg,
      fontFamily: "Source Serif 4",
      fontWeight: 600,
      fontSize: 27,
      letterSpacing: -0.5,
    },
    "5000",
  );
  const svg = await satori(knoten as never, { width: groesse, height: groesse, fonts: ladeSchriften() });
  const png = (ziel: number) => new Resvg(svg, { fitTo: { mode: "width", value: ziel } }).render().asPng();
  return { svg, png };
}
