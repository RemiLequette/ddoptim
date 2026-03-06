# DDoptim — Scenario Management

**Version:** 2.0  
**Date:** February 26, 2026  
**Status:** Implemented

---

## 1. Overview

The scenario management system enables users to create, save, compare, and switch between different buffer positioning strategies. Scenarios are stored as **transformation recipes** — sets of modifications applied on top of a baseline snapshot — not as complete data copies.

### Key Design Principles

1. **Baseline reference**: The first scenario captured on model load is the immutable baseline
2. **Modification-based**: Scenarios store only what changed (sparse diffs), not full copies
3. **Non-destructive**: Switching scenarios restores baseline first, then applies modifications
4. **Auto-detection**: The diff engine auto-detects changes vs baseline when saving
5. **No localStorage**: All state is in-memory; persistence is via JSON export/import only

---

## 2. Core Concepts

### Baseline Snapshot

Captured once at model load (SCRIPT 1305). Stores all modifiable node attributes for every node. Used as the reference point for:
- Detecting user changes (diff engine)
- Restoring state when switching scenarios
- Exporting baseline values in JSON

### Modification Object

```javascript
{
  nodeSelector: {
    nodeIds: ["node1", "node2"]    // Explicit target nodes
    // OR filter criteria (reuses filter engine)
  },
  attribute: "hasBuffer",          // Which attribute to modify
  operator: "=",                   // =, +, -, *, /
  value: true                      // New value or operand
}
```

### Modifiable Attributes

| Attribute | Type | Operators | Constraints |
|-----------|------|-----------|-------------|
| independentADU | number | =, +, -, *, / | min: 0 |
| leadTime | number | =, +, -, *, / | min: 0 |
| hasBuffer | boolean | = | true/false |
| bufferLocked | boolean | = | true/false |
| bufferProfile | enum | = | F, I, U, AL, AI, null |
| moq | number | =, +, -, *, / | min: 0 |
| orderCycle | number | =, +, -, *, / | min: 0 |
| unitCost | number | =, +, -, *, / | min: 0 |
| customerTolerance | number | =, +, -, *, / | min: 0 |

### Scenario Object

```javascript
{
  id: "uuid",
  name: "Scenario Name",          // Unique, user-provided
  isBaseline: boolean,             // true for the first auto-captured scenario
  modifications: [ModificationObject, ...],
  metrics: {
    totalInventoryValue: number,
    bufferCount: number,
    totalMissingCustomerLeadTime: number,
    avgLtExceeding: number
  }
}
```

---

## 3. Workflow

### Creating a Scenario

1. User loads a model → baseline snapshot captured → baseline scenario created automatically
2. User makes changes (toggle buffers, change ADU, etc.) via detail panel
3. User clicks "Save Scenario" button
4. **If on baseline**: Always creates a new scenario (diff engine detects changes)
5. **If on custom scenario**: Modal offers "Update current" / "Save as new" / "Cancel"
6. Diff engine compares current network state to baseline → generates modifications
7. Metrics calculated and stored with scenario

### Loading a Scenario

1. User selects scenario from dropdown or scenarios view
2. System checks for unsaved changes (prompts if needed)
3. Baseline snapshot restored to network
4. Scenario modifications applied in order
5. Full recalculation pipeline runs (ADU → CLT → DLT → buffer sizing)
6. All views refreshed (network, table, scenarios)

### Scenario Lifecycle

```
Model Load → Baseline Captured → User Makes Changes → Save → Scenario Created
                                                        ↓
                                   Load Another Scenario ← Compare in Scenarios View
```

---

## 4. User Interface

### Scenario Selector (DIV 105)

Dropdown in the controls bar showing all scenarios. Current scenario indicated with ⭐.

### Scenarios View (third view tab alongside Network and Table)

**Split panel layout:**
- **Left panel (40%)**: Scenario table with columns: checkbox, name, inventory, buffers, missing tolerance, LT exceeding, actions (rename, delete)
- **Right panel (60%)**: D3.js comparison bar chart for selected scenarios
- **Below list**: Modifications detail panel (flat table: Node | Attribute | Baseline | New Value)

**Protection rules:**
- Baseline: rename and delete disabled
- Active scenario: delete disabled (must switch first)
- Duplicate button removed (save-as-new achieves same)

### Comparison Chart (SCRIPT 1345)

D3.js horizontal bar chart comparing 4 KPIs across selected scenarios (checkbox selection):
- Total Inventory Value
- Buffer Count
- Missing Customer Tolerance
- LT Exceeding Tolerance

---

## 5. Technical Architecture

### CommWise Blocks

| Block | Purpose |
|-------|---------|
| STYLE 700 | Scenarios view CSS (split panel, table, chart, detail panel) |
| DIV 200 | Scenarios container (inside main-view-container) |
| SCRIPT 1300 | Constants: MODIFIABLE_ATTRIBUTES, OPERATORS_BY_TYPE |
| SCRIPT 1305 | Baseline Snapshot Management (capture/restore) |
| SCRIPT 1310 | Node Selection Engine (by IDs or filter criteria) |
| SCRIPT 1320 | Modification Application Engine (apply single mod to node) |
| SCRIPT 1330 | Scenario Application Engine (apply all mods, full workflow) |
| SCRIPT 1335 | Scenarios View Renderer (list table, detail panel) |
| SCRIPT 1337 | Split Panel Drag Resize |
| SCRIPT 1340 | Load Scenario Workflow (restore → apply → recalculate → refresh) |
| SCRIPT 1345 | Comparison Bar Chart (D3.js) |
| SCRIPT 1350 | Scenario UI Handler (dropdown, save button, save modal) |
| SCRIPT 1355 | Scenarios Event Handlers (checkbox, rename, delete) |
| SCRIPT 1360 | Diff Engine (detect changes vs baseline, group modifications) |

### State Management

```javascript
window.DDOptim.scenarios = {
  list: [ScenarioObject, ...],
  currentScenarioId: "string" | null,
  baselineSnapshot: { nodeId: { attr: value, ... }, ... },
  hasUnsavedChanges: boolean
};
```

### JSON Persistence

Scenarios are included in JSON export/import:
- Export serializes baseline node values + all scenarios with modifications
- Import restores scenarios list and applies saved currentScenarioId
- Metrics recalculated on import (not trusted from file)

---

**Document Version:** 2.0  
**Last Updated:** February 26, 2026
