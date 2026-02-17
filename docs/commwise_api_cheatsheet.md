# CommWise API Cheat Sheet (MCP)

Practical guide for day-to-day work on DDOptim (`appID: 13866`).

## 1) Quick Mental Model

- **Webapp**: one CommWise page/application (`appID`).
- **Blocks**: typed units of code inside the app.
  - `meta`, `style`, `div`, `script`, `data`, `diagnostics`
- **Addressing**: every block is identified by `(code_type, position)`.
- **Writes**: require a `sessionId` (from `commwise_start_session`).

## 2) Safe Write Workflow (Always)

1. Start session with clear objective.
2. Inspect/list blocks first.
3. Apply inserts/updates/deletes.
4. Set `create_revision=true` **only on final write**.

---

## 3) Core Read APIs

### Verify access
- `commwise_verify_connection()`

### Inspect app metadata / content
- `commwise_inspect_webapp(appID, detail_level="metadata|titles|descriptions|code")`

### List blocks (positions, titles, comments)
- `commwise_list_blocks(appID, section_filter="all")`

### Dependency impact overview
- `commwise_dependency_graph(postID=appID, format="summary")`

### Diagnostics / troubleshoot items
- `commwise_get_diagnostics(appId="13866", includeTroubleshoot=true)`

---

## 4) Core Write APIs

### Start session (required for writes)
- `commwise_start_session(objective="...")`

### Insert one block
- `commwise_insert_block(sessionId, appID, code_type, position, block, create_revision=false)`

### Update existing block and/or app metadata
- `commwise_update_block(sessionId, appID, code_type, position, update, metadata, create_revision=false)`

### Delete one or more blocks
- `commwise_delete_blocks(sessionId, appID, blocks, create_revision=false)`

### Bulk text replace in specific blocks
- `commwise_replace_text(sessionId, appID, blocks, find_text, replace_text)`

### Copy blocks between apps
- `commwise_copy_block(sessionId, sourceAppID, targetAppID, blocks, options)`

---

## 5) Versioning / Recovery APIs

### Inspect historical version before restore
- `commwise_inspect_webapp_version(appID, versionId, includeBlocksHtml=true)`

### Restore app to a previous version
- `commwise_restore_webapp_version(sessionId, appID, versionId, metadata)`

---

## 6) DDOptim Daily Commands (Examples)

## A. Read current structure
- `commwise_verify_connection()`
- `commwise_list_blocks(appID=13866, section_filter="all")`
- `commwise_inspect_webapp(appID=13866, detail_level="titles")`

## B. Edit one script block safely
1. `commwise_start_session(objective="Adjust script 1090 model loader")`
2. `commwise_update_block(... code_type="script", position=1090, update={ code: "..." }, create_revision=false)`
3. Final change only: set `create_revision=true`

## C. Add diagnostic block
- `commwise_insert_diagnostic_block(appId=13866, diagnosticBlockId="my_check", diagnosticType="live", emitOnly=false)`

## D. Roll back quickly
1. `commwise_inspect_webapp_version(appID=13866, versionId=...)`
2. `commwise_restore_webapp_version(sessionId=..., appID=13866, versionId=..., metadata={ append_release_notes: true })`

---

## 7) Important Rules

- Never edit boundary/system blocks (`position 0` markers and close marker).
- Use pure content only in code fields:
  - no `<style>` tags in `style` blocks
  - no `<script>` tags in `script` blocks
- For multi-step work, avoid creating many revisions:
  - keep `create_revision=false` until final write.
- For risky edits, use:
  - list/inspect first
  - dependency graph summary
  - diagnostics after change

---

## 8) About Local Sync Scripts in This Repo

In this repository:
- `npm run sync:pull` reads a local export file and rebuilds `commwise/blocks`.
- `npm run sync:pull:live` also reads local `.local/exports/app-13866-full.txt`.
- These scripts do **not** call CommWise directly.

Use CommWise MCP to fetch/update app data, then use local scripts for file-based workflow.
