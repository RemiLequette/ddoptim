import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const VALID_TYPES = ["style", "div", "script", "data", "diagnostics", "meta"];

export function parseBlockFilename(fileName) {
  const match = fileName.match(/^(meta|style|div|script|data|diagnostics)\.(\d{5})\.(txt|css|html|js|sql)$/i);
  if (!match) {
    return null;
  }

  return {
    code_type: match[1].toLowerCase(),
    position: Number(match[2]),
    extension: match[3].toLowerCase()
  };
}

export function getExtensionForType(codeType) {
  const map = {
    style: "css",
    div: "html",
    script: "js",
    data: "sql",
    diagnostics: "js",
    meta: "txt"
  };

  return map[codeType] ?? "txt";
}

export function serializeBlockFilename(codeType, position) {
  if (!VALID_TYPES.includes(codeType)) {
    throw new Error(`Type de bloc invalide: ${codeType}`);
  }

  const safePos = String(position).padStart(5, "0");
  const extension = getExtensionForType(codeType);
  return `${codeType}.${safePos}.${extension}`;
}

export function sortBlocks(blocks) {
  return [...blocks].sort((a, b) => {
    if (a.code_type === b.code_type) {
      return a.position - b.position;
    }

    return a.code_type.localeCompare(b.code_type);
  });
}

export async function loadBlocksFromDir(blockDir) {
  const entries = await readdir(blockDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  const blocks = [];
  for (const fileName of files) {
    const parsed = parseBlockFilename(fileName);
    if (!parsed) {
      continue;
    }

    const content = await readFile(path.join(blockDir, fileName), "utf8");
    blocks.push({
      code_type: parsed.code_type,
      position: parsed.position,
      content
    });
  }

  return sortBlocks(blocks);
}

export async function writeBlocksToDir(blockDir, blocks) {
  await mkdir(blockDir, { recursive: true });

  for (const block of blocks) {
    const fileName = serializeBlockFilename(block.code_type, block.position);
    const target = path.join(blockDir, fileName);
    await writeFile(target, block.content ?? "", "utf8");
  }
}

export function composePreviewHtml(blocks) {
  const style = blocks
    .filter((block) => block.code_type === "style")
    .sort((a, b) => a.position - b.position)
    .map((block) => block.content)
    .join("\n\n");

  const div = blocks
    .filter((block) => block.code_type === "div")
    .sort((a, b) => a.position - b.position)
    .map((block) => block.content)
    .join("\n\n");

  const script = blocks
    .filter((block) => ["script", "diagnostics"].includes(block.code_type))
    .sort((a, b) => a.position - b.position)
    .map((block) => block.content)
    .join("\n\n");

  const localizeWpContentPath = (value) =>
    value
      .replace(/(src|href)=(["'])\/wp-content\//gi, "$1=$2wp-content/")
      .replace(/url\((["']?)\/wp-content\//gi, "url($1wp-content/");

  const localizedStyle = localizeWpContentPath(style);
  const localizedDiv = localizeWpContentPath(div);

  const previewFallbackScript = String.raw`
      (function setupLocalAssetFallback() {
        const FALLBACK_SVG = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40"><rect width="160" height="40" rx="8" fill="#f2f4f7" stroke="#d0d5dd"/><text x="80" y="25" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#475467">CommWise Logo</text></svg>'
        );

        function isWordPressAssetPath(url) {
          return typeof url === "string" && /^\/?wp-content\//i.test(url.replace(/^https?:\/\/[^/]+\//i, ""));
        }

        function applyFallback(img) {
          if (!img || img.dataset.localFallbackApplied === "1") {
            return;
          }

          const src = img.getAttribute("src") || "";
          if (!isWordPressAssetPath(src)) {
            return;
          }

          img.dataset.localFallbackApplied = "1";
          img.dataset.localMissingAsset = src;
          img.src = FALLBACK_SVG;

          if (!img.alt || !img.alt.trim()) {
            img.alt = "Missing local asset";
          }

          console.warn("[preview] Missing local asset replaced:", src);
        }

        window.addEventListener(
          "error",
          function onAssetError(event) {
            const target = event && event.target;
            if (target && target.tagName === "IMG") {
              applyFallback(target);
            }
          },
          true
        );

        document.addEventListener("DOMContentLoaded", function onReady() {
          document.querySelectorAll("img[src]").forEach(function(img) {
            const src = img.getAttribute("src") || "";
            if (isWordPressAssetPath(src)) {
              img.addEventListener("error", function() {
                applyFallback(img);
              }, { once: true });
            }
          });
        });
      })();
    `;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Commwise Local Preview</title>
    <style>
  ${localizedStyle}
    </style>
  </head>
  <body>
  ${localizedDiv}
    <script>
${previewFallbackScript}

${script}
    </script>
  </body>
</html>`;
}
