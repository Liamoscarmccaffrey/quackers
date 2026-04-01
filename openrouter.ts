const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "arcee-ai/trinity-mini:free";

export interface OpenRouterEnv {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  VITE_OPENROUTER_API_KEY?: string;
  VITE_OPENROUTER_MODEL?: string;
}

function getRuntimeEnv(): OpenRouterEnv {
  if (typeof process === "undefined" || !process.env) {
    return {};
  }

  return process.env;
}

function parseModels(rawModel: string | undefined): string[] {
  if (!rawModel) {
    return [DEFAULT_MODEL];
  }

  const parsed = rawModel
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : [DEFAULT_MODEL];
}

export function getOpenRouterConfig(env: OpenRouterEnv = getRuntimeEnv()) {
  const apiKey = env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY;
  const models = parseModels(env.OPENROUTER_MODEL || env.VITE_OPENROUTER_MODEL);

  return { apiKey, models };
}

function extractTextContent(content: string | Array<{ text?: string }> | undefined): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join(" ")
      .trim();
  }

  return "";
}

function parseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const slice = text.slice(start, end + 1);

  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function normalizeSentence(sentence: string): string {
  let cleaned = sentence.trim();
  if (!cleaned) {
    return "";
  }

  cleaned = cleaned
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([A-Za-z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(
      /\b(glossy|silky|smooth|bright|dark|light|soft|shiny|crisp)(green|blue|red|white|brown|black|golden|silver)\b/gi,
      "$1 $2"
    );

  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }

  return cleaned;
}

function normalizeDescription(text: string): string {
  const normalized = normalizeSentence(text);
  return normalized;
}

function getDescriptionFromModelText(rawText: string): string {
  const parsed = parseJsonObject(rawText);

  if (parsed && typeof parsed === "object") {
    const appearance =
      typeof (parsed as { appearance?: unknown }).appearance === "string"
        ? (parsed as { appearance: string }).appearance
        : "";
    const personality =
      typeof (parsed as { personality?: unknown }).personality === "string"
        ? (parsed as { personality: string }).personality
        : "";

    const sentenceA = normalizeSentence(appearance);
    const sentenceB = normalizeSentence(personality);
    const combined = `${sentenceA} ${sentenceB}`.trim();
    if (combined) {
      return combined;
    }
  }

  return normalizeDescription(rawText);
}

async function requestDuckDescription(apiKey: string, model: string, duckName: string): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a playful duck expert. Output only valid JSON. Keep wording clear, with proper spacing."
        },
        {
          role: "user",
          content:
            `Write exactly two short sentences for a duck named '${duckName}'. ` +
            `Return only JSON with keys "appearance" and "personality". ` +
            `Use complete English words with standard spaces.`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[${model}] OpenRouter error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  const text = extractTextContent(content);
  if (text) {
    return getDescriptionFromModelText(text);
  }

  throw new Error(`[${model}] OpenRouter response did not include text content.`);
}

export async function generateDuckDescription(
  duckName: string,
  env: OpenRouterEnv = getRuntimeEnv()
): Promise<string> {
  const { apiKey, models } = getOpenRouterConfig(env);

  if (!apiKey) {
    throw new Error("Missing OpenRouter API key.");
  }

  const failures: string[] = [];

  for (const model of models) {
    try {
      return await requestDuckDescription(apiKey, model, duckName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown OpenRouter error";
      failures.push(message);
    }
  }

  throw new Error(`All OpenRouter models failed. ${failures.join(" | ")}`);
}
