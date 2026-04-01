import { type OpenRouterEnv } from "../../openrouter.js";
import { generateDuckPayload } from "../../src/shared/duck-service.js";

interface PagesContext {
  env: OpenRouterEnv;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  try {
    const duck = await generateDuckPayload(context.env);
    return Response.json(duck);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
