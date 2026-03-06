import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAlgorithmContext } from "../../src/algorithms/index.js";

export async function loadFixture(relativePath) {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const content = await readFile(absolutePath, "utf8");
  return JSON.parse(content);
}

export async function createContextFromFixture(relativePath) {
  const fixture = await loadFixture(relativePath);
  return createAlgorithmContext(fixture);
}

export function bufferedNodeIds(context) {
  return [...context.nodes.values()]
    .filter((node) => node.hasBuffer)
    .map((node) => node.id)
    .sort();
}
