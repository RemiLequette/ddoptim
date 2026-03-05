import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const ROOT = process.cwd();
export const COMMWISE_DIR = path.join(ROOT, "commwise");
export const BLOCK_DIR = path.join(ROOT, "commwise", "blocks");
export const CONFIG_PATH = path.join(ROOT, "config", "commwise.json");
export const LIVE_DIR = path.join(COMMWISE_DIR, "live");
export const ARTIFACT_DIR = path.join(COMMWISE_DIR, "artifacts");
export const PULL_REPORT_PATH = path.join(COMMWISE_DIR, "last-pull.json");
export const PULL_LOG_PATH = path.join(COMMWISE_DIR, "pull-log.md");

export async function readJsonFile(filePath) {
  const text = await readFile(filePath, "utf8");
  const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return JSON.parse(normalized);
}

export async function writeJsonFile(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
