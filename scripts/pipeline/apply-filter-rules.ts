/**
 * Feste Filterregeln vor der Kategorisierung durch Claude. Die Muster in
 * filter-regeln.json sind Teilstrings des Betreffs (ohne Beachtung von
 * Gross-/Kleinschreibung, bewusst keine Regex). "Nie" schlägt "immer": im
 * Zweifel lieber nichts publizieren. Greift keine Regel, entscheidet Claude.
 * Siehe docs/entscheide/2026-09-25-pipeline-filterregeln.md.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface FilterRegeln {
  immerAufnehmen: string[];
  nieAufnehmen: string[];
}

export interface RegelTreffer {
  entscheid: "aufnehmen" | "aussortieren";
  muster: string;
}

const REGEL_DATEI = fileURLToPath(new URL("./filter-regeln.json", import.meta.url));

function istStringListe(wert: unknown): wert is string[] {
  return Array.isArray(wert) && wert.every((m) => typeof m === "string" && m.trim() !== "");
}

export function ladeFilterRegeln(pfad = REGEL_DATEI): FilterRegeln {
  const roh: unknown = JSON.parse(readFileSync(pfad, "utf-8"));
  if (typeof roh !== "object" || roh === null) {
    throw new Error(`${pfad}: kein JSON-Objekt.`);
  }
  const { immerAufnehmen, nieAufnehmen } = roh as Record<string, unknown>;
  if (!istStringListe(immerAufnehmen) || !istStringListe(nieAufnehmen)) {
    throw new Error(`${pfad}: "immerAufnehmen" und "nieAufnehmen" müssen Listen nicht-leerer Texte sein.`);
  }
  return { immerAufnehmen, nieAufnehmen };
}

export function pruefeFilterRegeln(betreff: string, regeln: FilterRegeln): RegelTreffer | null {
  const b = betreff.toLowerCase();
  const nie = regeln.nieAufnehmen.find((m) => b.includes(m.toLowerCase()));
  if (nie) return { entscheid: "aussortieren", muster: nie };
  const immer = regeln.immerAufnehmen.find((m) => b.includes(m.toLowerCase()));
  if (immer) return { entscheid: "aufnehmen", muster: immer };
  return null;
}
