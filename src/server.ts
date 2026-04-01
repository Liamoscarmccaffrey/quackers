import "dotenv/config";
import express from "express";
import path from "node:path";
import { pickRandomDuckBreed } from "./shared/duck-breeds.js";
import { generateDuckPayload } from "./shared/duck-service.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

const publicDir = path.resolve(process.cwd(), "public");

app.use(express.static(publicDir));

app.get("/api/duck-name", (_req, res) => {
  try {
    const name = pickRandomDuckBreed();
    res.json({ name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/duck", async (_req, res) => {
  try {
    const duck = await generateDuckPayload();
    res.json(duck);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Duck selector running on http://localhost:${port}`);
});
