import {
  generateDuckDescription,
  type OpenRouterEnv
} from "../../openrouter.js";
import { pickRandomDuckBreed } from "./duck-breeds.js";

export interface DuckPayload {
  name: string;
  imageUrl: string;
  description: string;
  warnings: string[];
}

export async function fetchDuckImage(): Promise<string> {
  const response = await fetch("https://random-d.uk/api/v2/random");

  if (!response.ok) {
    throw new Error(`Duck image API error ${response.status}`);
  }

  const data = (await response.json()) as { url?: string };

  if (!data.url) {
    throw new Error("Duck image API response missing url");
  }

  return data.url;
}

export async function generateDuckPayload(env?: OpenRouterEnv): Promise<DuckPayload> {
  const name = pickRandomDuckBreed();
  const warnings: string[] = [];

  const [imageResult, descriptionResult] = await Promise.allSettled([
    fetchDuckImage(),
    generateDuckDescription(name, env)
  ]);

  const imageUrl =
    imageResult.status === "fulfilled" ? imageResult.value : "/duck-placeholder.svg";
  const description =
    descriptionResult.status === "fulfilled"
      ? descriptionResult.value
      : `${name} has a bright bill, smooth feathers, and a confident little waddle.`;

  if (imageResult.status === "rejected") {
    const reason =
      imageResult.reason instanceof Error
        ? imageResult.reason.message
        : "Unknown duck image API error";
    warnings.push(reason);
  }

  if (descriptionResult.status === "rejected") {
    const reason =
      descriptionResult.reason instanceof Error
        ? descriptionResult.reason.message
        : "Unknown OpenRouter error";
    warnings.push(reason);
  }

  return { name, imageUrl, description, warnings };
}
