import { pickRandomDuckBreed } from "../../src/shared/duck-breeds.js";

export async function onRequestGet(): Promise<Response> {
  try {
    return Response.json({ name: pickRandomDuckBreed() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
