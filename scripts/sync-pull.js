import path from "node:path";
import { writeBlocksToDir } from "../src/commwise-blocks.js";
import { BLOCK_DIR, CONFIG_PATH, EXPORT_DIR, readJsonFile, writeJsonFile } from "./utils.js";

async function main() {
  const config = await readJsonFile(CONFIG_PATH);

  if (!config?.appId) {
    throw new Error("config/commwise.json doit contenir appId.");
  }

  const sourcePath = process.argv[2];
  if (!sourcePath) {
    const emptySnapshotPath = path.join(EXPORT_DIR, `app-${config.appId}-snapshot.example.json`);
    await writeJsonFile(emptySnapshotPath, {
      appId: config.appId,
      workspaceName: config.workspaceName ?? "commwise-app",
      generatedAt: new Date().toISOString(),
      blocks: []
    });

    console.log(`Aucun fichier source fourni.`);
    console.log(`Exemple créé: ${emptySnapshotPath}`);
    console.log("Commande attendue: npm run sync:pull -- .local/exports/app-<id>-snapshot.json");
    return;
  }

  const snapshot = await readJsonFile(path.resolve(sourcePath));
  if (!Array.isArray(snapshot.blocks)) {
    throw new Error("Le snapshot doit contenir un tableau blocks.");
  }

  await writeBlocksToDir(BLOCK_DIR, snapshot.blocks);
  console.log(`Blocs importés dans ${BLOCK_DIR}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
