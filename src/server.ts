import "dotenv/config";
import express from "express";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { generateDuckDescription } from "../openrouter.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

const publicDir = path.resolve(process.cwd(), "public");
const breedFile = path.resolve(process.cwd(), "duck_breeds.txt");

let duckBreeds: string[] = [];

async function loadDuckBreeds() {
  const raw = await readFile(breedFile, "utf8");
  duckBreeds = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (duckBreeds.length === 0) {
    throw new Error("duck_breeds.txt is empty.");
  }
}

function pickRandomBreed(): string {
  const index = Math.floor(Math.random() * duckBreeds.length);
  return duckBreeds[index];
}

async function fetchDuckImage(): Promise<string> {
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

app.use(express.static(publicDir));

app.get("/api/duck-name", (_req, res) => {
  try {
    const name = pickRandomBreed();
    res.json({ name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/duck", async (_req, res) => {
  try {
    const name = pickRandomBreed();
    const warnings: string[] = [];

    const [imageResult, descriptionResult] = await Promise.allSettled([
      fetchDuckImage(),
      generateDuckDescription(name)
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

    res.json({ name, imageUrl, description, warnings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

loadDuckBreeds()
  .then(() => {
    app.listen(port, () => {
      console.log(`Duck selector running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
