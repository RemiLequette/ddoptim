import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAlgorithmContext } from "./model-utils.js";

export async function loadModelJson(modelPath) {
  const resolvedPath = path.resolve(modelPath);
  const content = await readFile(resolvedPath, "utf8");
  return JSON.parse(content);
}

export async function loadModelContext(modelPath) {
  const model = await loadModelJson(modelPath);
  return createAlgorithmContext(model);
}
