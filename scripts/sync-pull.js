import path from "node:path";
import { readFile, readdir, unlink } from "node:fs/promises";
import iconv from "iconv-lite";
import { writeBlocksToDir } from "../src/commwise-blocks.js";
import { BLOCK_DIR, CONFIG_PATH, EXPORT_DIR, readJsonFile, writeJsonFile } from "./utils.js";

function countMojibakeSignals(text) {
  if (!text) {
    return 0;
  }

  const pattern = /[ÃÂâð]/g;
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function repairMojibake(text) {
  if (typeof text !== "string" || text.length === 0) {
    return text;
  }

  if (/[\uD800-\uDFFF]/.test(text)) {
    return text;
  }

  if (/[^\u0000-\u017f]/.test(text)) {
    return text;
  }

  const originalScore = countMojibakeSignals(text);
  if (originalScore === 0) {
    return text;
  }

  const candidate = iconv.decode(iconv.encode(text, "win1252"), "utf8");
  if (candidate.includes("�")) {
    return text;
  }

  const candidateScore = countMojibakeSignals(candidate);

  if (candidateScore < originalScore) {
    return candidate;
  }

  return text;
}

function normalizeBlockEncoding(blocks) {
  return blocks.map((block) => ({
    ...block,
    content: repairMojibake(block.content ?? "")
  }));
}

function parseFullTextExport(content) {
  const headerRegex = /^=== BLOCK:\s*(\d{7})\s*\|\s*(.*?)\s*===\s*$/gm;
  const matches = [...content.matchAll(headerRegex)];
  const sectionByPrefix = {
    0: "meta",
    1: "style",
    2: "div",
    3: "script",
    4: "data",
    5: "diagnostics"
  };

  const blocks = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];

    const rawPosition = current[1];
    const blockTitle = current[2] ?? "";
    const sectionPrefix = Number(rawPosition.slice(0, 2));
    const code_type = sectionByPrefix[sectionPrefix];
    const position = Number(rawPosition.slice(2));

    if (!code_type) {
      continue;
    }

    if (/\[SYSTEM\]/i.test(blockTitle)) {
      continue;
    }

    const bodyStart = current.index + current[0].length;
    const bodyEnd = next ? next.index : content.length;
    const blockContent = content
      .slice(bodyStart, bodyEnd)
      .replace(/^\r?\n/, "")
      .replace(/\r?\n+$/, "");

    blocks.push({
      code_type,
      position,
      content: blockContent
    });
  }

  return blocks;
}

async function cleanExistingBlockFiles(blockDir) {
  const entries = await readdir(blockDir, { withFileTypes: true });
  const blockFilePattern = /^(meta|style|div|script|data|diagnostics)\.(\d{5,})\.(txt|css|html|js|sql)$/i;

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => blockFilePattern.test(fileName))
      .map((fileName) => unlink(path.join(blockDir, fileName)))
  );
}

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

  const resolvedSourcePath = path.resolve(sourcePath);
  const extension = path.extname(resolvedSourcePath).toLowerCase();

  let blocks;
  if (extension === ".txt") {
    const fullExportText = await readFile(resolvedSourcePath, "utf8");
    blocks = parseFullTextExport(fullExportText);
  } else {
    const snapshot = await readJsonFile(resolvedSourcePath);
    if (!Array.isArray(snapshot.blocks)) {
      throw new Error("Le snapshot doit contenir un tableau blocks.");
    }

    if (snapshot.blocks.some((block) => typeof block.content === "string")) {
      blocks = snapshot.blocks;
    } else {
      throw new Error("Ce snapshot ne contient pas le contenu des blocs. Utilise un export complet .txt (app-<id>-full.txt).");
    }
  }

  blocks = normalizeBlockEncoding(blocks);

  await cleanExistingBlockFiles(BLOCK_DIR);
  await writeBlocksToDir(BLOCK_DIR, blocks);
  console.log(`Blocs importés dans ${BLOCK_DIR}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
