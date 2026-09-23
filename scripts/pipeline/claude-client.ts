/**
 * Schlanker Claude-API-Client für die Pipeline (Kategorisierung,
 * Artikelgenerierung). Rohes `fetch` gegen die Messages API statt einer
 * neuen `@anthropic-ai/sdk`-Abhängigkeit, passend zum bisher schlanken
 * Abhängigkeitsbaum des Projekts (siehe Plan, Entscheid zu Punkt 5).
 */

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const STANDARD_MODEL = "claude-sonnet-5";
const STANDARD_MAX_TOKENS = 8000;

/**
 * Listenpreise in USD pro Million Tokens (Anthropic, Stand 2026-09-23). Nur
 * für die Kostenschätzung im Pipeline-Protokoll; verbindlich ist die
 * Abrechnung in der Anthropic Console. Unbekanntes Modell → keine Schätzung.
 */
const PREISE_USD_PRO_MIO: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

/**
 * Modelle, bei denen sich das Thinking nicht abschalten lässt. Die
 * Thinking-Tokens zählen zu max_tokens; ohne Reserve kann das Thinking das
 * Budget aufbrauchen, bevor ein Text-Block entsteht (bei der Kategorisierung
 * mit 500 Tokens fast sicher). Steuerbar ist nur der Aufwand (effort).
 * Standardmodell (Sonnet 5) ist bewusst nicht drin: dort bleibt der Request
 * unverändert.
 */
const IMMER_THINKING = new Set(["claude-opus-5-5"]);
const THINKING_RESERVE = 16000;

export type Effort = "low" | "medium" | "high";

export interface Verbrauch {
  aufrufe: number;
  inputTokens: number;
  outputTokens: number;
  /** Geschätzte Kosten in USD, null wenn für ein verwendetes Modell kein Preis hinterlegt ist. */
  geschaetztUsd: number | null;
  modelle: string[];
}

// Summe über alle Aufrufe dieses Prozesses. Ein Pipeline-Lauf ist ein
// Prozess, damit entspricht das genau dem Verbrauch pro Newsletter-Mail.
const verbrauch: Verbrauch = { aufrufe: 0, inputTokens: 0, outputTokens: 0, geschaetztUsd: 0, modelle: [] };

function erfasseVerbrauch(modell: string, inputTokens: number, outputTokens: number) {
  verbrauch.aufrufe += 1;
  verbrauch.inputTokens += inputTokens;
  verbrauch.outputTokens += outputTokens;
  if (!verbrauch.modelle.includes(modell)) verbrauch.modelle.push(modell);
  const preis = PREISE_USD_PRO_MIO[modell];
  verbrauch.geschaetztUsd =
    preis && verbrauch.geschaetztUsd !== null
      ? verbrauch.geschaetztUsd + (inputTokens * preis.input + outputTokens * preis.output) / 1_000_000
      : null;
}

/** Bisheriger Verbrauch aller Claude-Aufrufe in diesem Lauf. */
export function holeVerbrauch(): Verbrauch {
  return {
    ...verbrauch,
    modelle: [...verbrauch.modelle],
    geschaetztUsd: verbrauch.geschaetztUsd === null ? null : Math.round(verbrauch.geschaetztUsd * 10_000) / 10_000,
  };
}

/** Modelle antworten trotz Anweisung gelegentlich in einem ```json-Codeblock. */
function extrahiereJsonText(text: string): string {
  const codeblock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (codeblock ? codeblock[1] : text).trim();
}

/**
 * Ruft die Claude-API mit einem einzelnen User-Prompt auf und parst die
 * Antwort als JSON. Wirft hart, wenn der API-Key fehlt, die Antwort keinen
 * Text-Block enthält oder kein gültiges JSON ist — die aufrufenden Skripte
 * (categorize.ts, generate-article.ts) fangen das ab und protokollieren es,
 * committen aber nie auf Basis einer nicht parsbaren Antwort.
 */
export async function rufeClaudeJsonAuf(
  prompt: string,
  opts?: {
    /** Platz für die Antwort selbst; bei IMMER_THINKING-Modellen kommt die Thinking-Reserve dazu. */
    maxTokens?: number;
    modell?: string;
    /** Nur bei IMMER_THINKING-Modellen gesendet, Standard "medium". */
    effort?: Effort;
  },
): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY fehlt (Umgebungsvariable, als GitHub-Actions-Secret zu hinterlegen).");
  }

  const modell = opts?.modell ?? process.env.ANTHROPIC_MODEL ?? STANDARD_MODEL;
  const maxTokens = opts?.maxTokens ?? STANDARD_MAX_TOKENS;
  const immerThinking = IMMER_THINKING.has(modell);

  const response = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: modell,
      max_tokens: immerThinking ? maxTokens + THINKING_RESERVE : maxTokens,
      ...(immerThinking ? { output_config: { effort: opts?.effort ?? "medium" } } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude-API-Fehler ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  // Vor allen weiteren Prüfungen erfassen: auch eine unbrauchbare Antwort kostet.
  erfasseVerbrauch(modell, data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0);
  // Abgeschnitten oder abgelehnt: den Grund nennen, damit er im Fehler-Issue steht.
  if (data.stop_reason === "max_tokens" || data.stop_reason === "refusal") {
    throw new Error(`Claude-API-Antwort unvollständig (stop_reason: ${data.stop_reason}, Modell: ${modell}).`);
  }
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error(`Unerwartete Claude-API-Antwort: kein Text-Block im content-Array (stop_reason: ${data.stop_reason}).`);
  }

  const jsonText = extrahiereJsonText(textBlock.text);
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `Claude-API-Antwort ist kein gültiges JSON: ${err instanceof Error ? err.message : String(err)}\n` +
        `Antworttext: ${jsonText.slice(0, 500)}`,
    );
  }
}
