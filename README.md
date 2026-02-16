# DDOptim Commwise Sync (JavaScript)

Base JavaScript pour travailler un app Commwise en local, versionner le code avec Git, puis préparer un push vers Commwise.

## Objectif

- Éditer les blocs Commwise localement dans `commwise/blocks`
- Générer un preview HTML local
- Géner un payload JSON pour appliquer les changements côté Commwise

## Installation

```bash
npm install
copy config\\commwise.example.json config\\commwise.json
```

Puis éditer `config/commwise.json` avec ton `appId`.

## Structure

- `commwise/blocks/` : source Git-friendly
- `src/commwise-blocks.js` : moteur de lecture/écriture/composition
- `scripts/sync-pull.js` : importe un snapshot JSON vers les fichiers de blocs
- `scripts/sync-pack.js` : pack les blocs locaux en payload JSON
- `scripts/sync-push.js` : prépare la commande de push via MCP
- `scripts/preview.js` : génère `.local/preview.html`

## Convention de nommage des blocs

`<type>.<position>.<ext>`

Exemples:
- `style.00100.css`
- `div.00200.html`
- `script.00300.js`
- `data.00400.sql`

## Workflow conseillé

1. **Pull** depuis Commwise vers JSON (via MCP avec Copilot), puis:
   ```bash
   npm run sync:pull -- .local/exports/app-12345-snapshot.json
   ```
2. Édite les blocs dans `commwise/blocks`
3. Génère un preview:
   ```bash
   npm run preview
   ```
4. Pack pour push:
   ```bash
   npm run sync:pack
   npm run sync:push
   ```
5. Demande à Copilot d'appliquer le payload généré via MCP Commwise

## Tests

```bash
npm test
```
