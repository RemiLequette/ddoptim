import path from "node:path";
import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { CONFIG_PATH, LIVE_DIR, readJsonFile } from "./utils.js";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  const config = await readJsonFile(CONFIG_PATH);

  if (!config?.appId) {
    throw new Error("config/commwise.json doit contenir appId.");
  }

  const sourcePath = path.resolve(
    config.livePullSourcePath ?? path.join(LIVE_DIR, `app-${config.appId}-full.txt`)
  );

  try {
    const info = await stat(sourcePath);
    console.log(`Using live source: ${sourcePath}`);
    console.log(`Source timestamp: ${info.mtime.toISOString()}`);
  } catch {
    throw new Error(
      `Missing live source: ${sourcePath}.\n` +
      `Save the latest full export to this path (or set livePullSourcePath in config/commwise.json).`
    );
  }

  await runCommand("npm", ["run", "sync:pull", "--", sourcePath]);
  await runCommand("npm", ["run", "preview"]);

  console.log("Live refresh complete: local blocks synced, pull report updated, and preview regenerated.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
