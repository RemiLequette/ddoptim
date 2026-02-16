import path from "node:path";
import { loadBlocksFromDir } from "../src/commwise-blocks.js";
import { BLOCK_DIR, CONFIG_PATH, EXPORT_DIR, readJsonFile, writeJsonFile } from "./utils.js";

async function main() {
  const config = await readJsonFile(CONFIG_PATH);
  const blocks = await loadBlocksFromDir(BLOCK_DIR);

  if (!config?.appId) {
    throw new Error("config/commwise.json doit contenir appId.");
  }

  const now = new Date().toISOString();
  const payload = {
    appId: config.appId,
    workspaceName: config.workspaceName ?? "commwise-app",
    generatedAt: now,
    blocks
  };

  const outputPath = path.join(EXPORT_DIR, `app-${config.appId}-payload.json`);
  await writeJsonFile(outputPath, payload);

  console.log(`Payload généré: ${outputPath}`);
  console.log("Utilise ce fichier pour un push Commwise via MCP.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
