import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { erzeugeFavicon } from "../src/lib/og-bild";

/**
 * Schreibt public/favicon.svg und public/favicon.ico im Stil des Logos
 * (src/lib/og-bild.ts). Nur bei einer Designänderung neu ausführen:
 * npm run build:favicon
 */
const { svg, png } = await erzeugeFavicon();
const publicDir = join(process.cwd(), "public");
writeFileSync(join(publicDir, "favicon.svg"), svg);

// ICO-Container mit eingebetteten PNGs (16, 32, 48 px), von allen Browsern unterstützt.
const groessen = [16, 32, 48];
const bilder = groessen.map((g) => Buffer.from(png(g)));
const kopf = Buffer.alloc(6);
kopf.writeUInt16LE(0, 0);
kopf.writeUInt16LE(1, 2);
kopf.writeUInt16LE(bilder.length, 4);
let offset = 6 + 16 * bilder.length;
const eintraege = bilder.map((bild, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(groessen[i], 0);
  e.writeUInt8(groessen[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(bild.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += bild.length;
  return e;
});
writeFileSync(join(publicDir, "favicon.ico"), Buffer.concat([kopf, ...eintraege, ...bilder]));
console.log("public/favicon.svg und public/favicon.ico geschrieben.");
