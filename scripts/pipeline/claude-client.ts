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
export async function rufeClaudeJsonAuf(prompt: string, opts?: { maxTokens?: number; modell?: string }): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY fehlt (Umgebungsvariable, als GitHub-Actions-Secret zu hinterlegen).");
  }

  const response = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: opts?.modell ?? process.env.ANTHROPIC_MODEL ?? STANDARD_MODEL,
      max_tokens: opts?.maxTokens ?? STANDARD_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude-API-Fehler ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { content?: { type: string; text?: string }[] };
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("Unerwartete Claude-API-Antwort: kein Text-Block im content-Array.");
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
