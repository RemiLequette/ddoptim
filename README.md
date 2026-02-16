# DDOptim Commwise Sync (JavaScript)

JavaScript starter to work on a Commwise app locally, version the code with Git, and prepare a push back to Commwise.

## Goal

- Edit Commwise blocks locally in `commwise/blocks`
- Generate a local HTML preview
- Generate a JSON payload to apply changes on the Commwise side

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

## Structure

- `commwise/blocks/`: Git-friendly source files
- `src/commwise-blocks.js`: read/write/compose engine
- `scripts/sync-pull.js`: imports a JSON snapshot into local block files
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

1. **Pull** from Commwise to JSON (via MCP with Copilot), then:
   ```bash
   npm run sync:pull -- .local/exports/app-12345-snapshot.json
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
