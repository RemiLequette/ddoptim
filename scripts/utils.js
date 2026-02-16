import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const ROOT = process.cwd();
export const BLOCK_DIR = path.join(ROOT, "commwise", "blocks");
export const CONFIG_PATH = path.join(ROOT, "config", "commwise.json");
export const EXPORT_DIR = path.join(ROOT, ".local", "exports");

export async function readJsonFile(filePath) {
  const text = await readFile(filePath, "utf8");
  const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return JSON.parse(normalized);
}

export async function writeJsonFile(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
