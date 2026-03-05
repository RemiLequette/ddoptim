# DDOptim Commwise Sync (JavaScript)

JavaScript starter to work on a Commwise app locally, version the code with Git, and prepare a push back to Commwise.

## Goal

- Edit Commwise blocks locally in `commwise/blocks`
- Generate a local HTML preview
- Generate a JSON payload to apply changes on the Commwise side
- Keep a pull report with timestamp + pulled block list in `commwise/`

## Installation

```bash
npm install
copy config\\commwise.example.json config\\commwise.json
```

Then edit `config/commwise.json` with your `appId`.

## Commwise App URL

- App ID: `13866`
- URL: `https://commwise.b2wise.com/mcp-c3-ddoptim-buffer-positioning-optimizer`

## Local Mirrored Assets

- Downloaded logo: `.local/wp-content/uploads/2025/06/WiseyLogo.png`
- Local preview uses this copy to avoid missing WordPress references.

## One-Step Live Refresh

```bash
npm run sync:pull:live
```

What it does:
- Reads `commwise/live/app-13866-full.txt` (or `livePullSourcePath` from `config/commwise.json`)
- Syncs blocks into `commwise/blocks`
- Removes block files that no longer exist in the source
- Updates pull tracking files:
   - `commwise/last-pull.json`
   - `commwise/pull-log.md`
- Regenerates `.local/preview.html`

Notes:
- This command assumes the latest full export file exists at `commwise/live/app-<appId>-full.txt`.
- Optional config override in `config/commwise.json`:
   - `"livePullSourcePath": "path/to/app-<id>-full.txt"`

## Structure

- `commwise/blocks/`: Git-friendly source files
- `commwise/live/`: source full exports used for live pull
- `commwise/artifacts/`: generated payloads for push
- `commwise/last-pull.json`: latest pull metadata
- `commwise/pull-log.md`: pull history (timestamp + block list)
- `src/commwise-blocks.js`: read/write/compose engine
- `scripts/sync-pull.js`: imports a full export (`.txt`) or snapshot (`.json`) into local block files
- `scripts/sync-pack.js`: packs local blocks into a JSON payload
- `scripts/sync-push.js`: prepares the MCP push command
- `scripts/preview.js`: generates `.local/preview.html`

## Block Naming Convention

`<type>.<position>.<ext>`

Examples:
- `style.00100.css`
- `div.00200.html`
- `script.00300.js`
- `data.00400.sql`

## Recommended Workflow

1. **Pull** from Commwise and save a full export file to `commwise/live/app-<id>-full.txt`, then:
   ```bash
   npm run sync:pull:live
   ```
2. Edit blocks in `commwise/blocks`
3. Generate a preview:
   ```bash
   npm run preview
   ```
4. Pack for push:
   ```bash
   npm run sync:pack
   npm run sync:push
   ```
5. Ask Copilot to apply the generated payload through Commwise MCP tools

## Tests

```bash
npm test
```
