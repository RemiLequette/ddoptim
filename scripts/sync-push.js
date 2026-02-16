import path from "node:path";
import { CONFIG_PATH, EXPORT_DIR, readJsonFile } from "./utils.js";

async function main() {
  const config = await readJsonFile(CONFIG_PATH);
  const payloadPath = path.join(EXPORT_DIR, `app-${config.appId}-payload.json`);

  console.log("Push Commwise prêt.");
  console.log(`- App ID: ${config.appId}`);
  console.log(`- Payload: ${payloadPath}`);
  console.log("Étape suivante: demander à Copilot d'appliquer ce payload via les outils MCP Commwise.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
