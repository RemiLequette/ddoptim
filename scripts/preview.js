import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadBlocksFromDir, composePreviewHtml } from "../src/commwise-blocks.js";
import { BLOCK_DIR, ROOT } from "./utils.js";

async function main() {
  const blocks = await loadBlocksFromDir(BLOCK_DIR);
  const html = composePreviewHtml(blocks);

  const outDir = path.join(ROOT, ".local");
  const outFile = path.join(outDir, "preview.html");

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, html, "utf8");

  console.log(`Preview généré: ${outFile}`);
  console.log("Ouvre le fichier dans ton navigateur pour tester localement.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
