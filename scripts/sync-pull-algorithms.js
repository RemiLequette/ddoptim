import path from "node:path";
import { access, readdir, readFile, unlink } from "node:fs/promises";
import { serializeBlockFilename, writeBlocksToDir } from "../src/commwise-blocks.js";
import {
  CONFIG_PATH,
  LIVE_DIR,
  ROOT,
  readJsonFile,
  writeJsonFile
} from "./utils.js";

const DEFAULT_REQUIRED_BLOCKS = [
  "script.00400.js",
  "script.00407.js",
  "script.00500.js",
  "script.00600.js",
  "script.00620.js",
  "script.00650.js",
  "script.00660.js",
  "script.00661.js",
  "script.00662.js",
  "script.00663.js",
  "script.00700.js"
];

const ALGORITHM_CONFIG_PATH = path.join(ROOT, "config", "algorithm-sync.json");
const ALGORITHM_EXAMPLE_PATH = path.join(ROOT, "config", "algorithm-sync.example.json");

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
    const sectionPrefix = Number(rawPosition.slice(0, 2));
    const codeType = sectionByPrefix[sectionPrefix];
    const position = Number(rawPosition.slice(2));

    if (!codeType) {
      continue;
    }

    const bodyStart = current.index + current[0].length;
    const bodyEnd = next ? next.index : content.length;
    const blockContent = content
      .slice(bodyStart, bodyEnd)
      .replace(/^\r?\n/, "")
      .replace(/\r?\n+$/, "");

    blocks.push({
      code_type: codeType,
      position,
      content: blockContent,
      file: serializeBlockFilename(codeType, position)
    });
  }

  return blocks;
}

async function cleanExistingBlockFiles(blockDir) {
  let entries = [];
  try {
    entries = await readdir(blockDir, { withFileTypes: true });
  } catch {
    return;
  }

  const blockFilePattern = /^(meta|style|div|script|data|diagnostics)\.(\d{5,})\.(txt|css|html|js|sql)$/i;

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => blockFilePattern.test(fileName))
      .map((fileName) => unlink(path.join(blockDir, fileName)))
  );
}

function normalizeRequiredBlocks(requiredBlocks) {
  if (!Array.isArray(requiredBlocks) || requiredBlocks.length === 0) {
    return [...DEFAULT_REQUIRED_BLOCKS];
  }

  return [...new Set(requiredBlocks.map((value) => String(value).trim()).filter(Boolean))];
}

async function readAlgorithmConfig() {
  try {
    await access(ALGORITHM_CONFIG_PATH);
    return await readJsonFile(ALGORITHM_CONFIG_PATH);
  } catch {
    return await readJsonFile(ALGORITHM_EXAMPLE_PATH);
  }
}

async function main() {
  const commwiseConfig = await readJsonFile(CONFIG_PATH);
  const algorithmConfig = await readAlgorithmConfig();

  if (!commwiseConfig?.appId) {
    throw new Error("config/commwise.json must define appId.");
  }

  const sourcePath = path.resolve(
    process.argv[2] ??
      algorithmConfig.sourcePath ??
      commwiseConfig.livePullSourcePath ??
      path.join(LIVE_DIR, `app-${commwiseConfig.appId}-full.txt`)
  );

  const outputDir = path.resolve(
    algorithmConfig.outputDir ?? path.join("commwise", "algorithm-blocks")
  );

  const requiredBlocks = normalizeRequiredBlocks(algorithmConfig.requiredBlocks);

  const fullExportText = await readFile(sourcePath, "utf8");
  const blocks = parseFullTextExport(fullExportText);
  const blockByFilename = new Map(blocks.map((block) => [block.file, block]));

  const selectedBlocks = [];
  const missingBlocks = [];

  for (const requiredFile of requiredBlocks) {
    const block = blockByFilename.get(requiredFile);
    if (block) {
      selectedBlocks.push(block);
    } else {
      missingBlocks.push(requiredFile);
    }
  }

  await cleanExistingBlockFiles(outputDir);
  await writeBlocksToDir(outputDir, selectedBlocks);

  const report = {
    appId: commwiseConfig.appId,
    pulledAt: new Date().toISOString(),
    source: sourcePath,
    outputDir,
    requiredCount: requiredBlocks.length,
    selectedCount: selectedBlocks.length,
    missingCount: missingBlocks.length,
    selectedBlocks: selectedBlocks.map((block) => block.file),
    missingBlocks
  };

  await writeJsonFile(path.join(outputDir, "algorithm-pull-report.json"), report);

  console.log(`Algorithm blocks synchronized to: ${outputDir}`);
  console.log(`Selected blocks: ${selectedBlocks.length}/${requiredBlocks.length}`);

  if (missingBlocks.length > 0) {
    console.warn(`Missing blocks (${missingBlocks.length}):`);
    for (const file of missingBlocks) {
      console.warn(`- ${file}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
