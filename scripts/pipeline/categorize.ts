/**
 * Schritt 11 der Pipeline (Umsetzungsplan Phase 1c): Ausgabe kategorisieren
 * und aussortieren, mit protokolliertem Grund. Baugesuche und
 * Routine-Publikationen werden nicht zu Artikeln (siehe
 * docs/aarau-newsletter-artikel/SKILL.md, Workflow-Schritt 2).
 */
import { rufeClaudeJsonAuf } from "./claude-client.ts";
import { buildKategorisierungsPrompt } from "./prompts.ts";

export const AUSGABE_KATEGORIEN = ["Medienmitteilung", "Amtliche Publikation", "Baugesuch", "unklar"] as const;
export type AusgabeKategorie = (typeof AUSGABE_KATEGORIEN)[number];

export interface KategorisierungsErgebnis {
  kategorie: AusgabeKategorie;
  relevant: boolean;
  grund: string;
}

function istGueltigeKategorie(wert: unknown): wert is AusgabeKategorie {
  return typeof wert === "string" && (AUSGABE_KATEGORIEN as readonly string[]).includes(wert);
}

export async function kategorisiereAusgabe(mailKlartext: string, betreff: string): Promise<KategorisierungsErgebnis> {
  const prompt = buildKategorisierungsPrompt(betreff, mailKlartext);
  const antwort = await rufeClaudeJsonAuf(prompt, { maxTokens: 500 });

  if (
    typeof antwort !== "object" ||
    antwort === null ||
    !("kategorie" in antwort) ||
    !("relevant" in antwort) ||
    !("grund" in antwort)
  ) {
    throw new Error(`Kategorisierungs-Antwort hat nicht die erwartete Form: ${JSON.stringify(antwort)}`);
  }

  const { kategorie, relevant, grund } = antwort as Record<string, unknown>;

  if (!istGueltigeKategorie(kategorie)) {
    throw new Error(`Unbekannte Kategorie in Antwort: ${JSON.stringify(kategorie)}`);
  }
  if (typeof relevant !== "boolean") {
    throw new Error(`"relevant" ist kein boolean: ${JSON.stringify(relevant)}`);
  }
  if (typeof grund !== "string" || grund.trim() === "") {
    throw new Error(`"grund" fehlt oder ist leer.`);
  }

  return { kategorie, relevant, grund };
}
