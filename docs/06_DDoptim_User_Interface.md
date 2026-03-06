# DDoptim — User Interface

**Version:** 3.1  
**Date:** February 27, 2026  
**Status:** Implemented

---

## 1. Application Layout

The application uses a standard CommWise layout with a fixed header, a controls bar, a metrics bar, and a main content area that switches between four views.

```
┌─────────────────────────────────────────────────┐
│ App Header (logo, info, settings)                │
├─────────────────────────────────────────────────┤
│ Controls Bar (Line 1 + Line 2)                   │
├─────────────────────────────────────────────────┤
│ Metrics Dashboard (4 KPI cards)                  │
├─────────────────────────────────────────────────┤
│                                                   │
│  Main View Area (one active at a time):           │
│    • Network View (D3.js tree)                    │
│    • Table View (sortable, filterable)            │
│    • Scenarios View (list + comparison chart)     │
│    • Profiles View (buffer profile CRUD)          │
│                                                   │
├─────────────────────────────────────────────────┤
│ Detail Panel (right sidebar, opens on node click) │
└─────────────────────────────────────────────────┘
```

---

## 2. Controls Bar (DIV 105)

Two-line responsive layout for laptop screens (≥1366px):

**Line 1 (left-aligned):**
- Load Model button (opens modal)
- Model Name display (inline editable)
- Scenario selector dropdown
- View toggle: 📊 Network | 📋 Table | 📦 Scenarios | 🎛️ Profiles
- Color by: Type | Location toggle buttons
- Show Locations toggle switch
- Focus mode button + active badge

**Line 2 (right-aligned):**
- Load from Datamart button
- Export JSON button
- Import JSON button
- Auto-Position button (RLT, green, prominent)
- Optimize button (OPT, blue)

---

## 3. Network View

### Technology
D3.js v7.8.5 hierarchical tree layout, loaded dynamically from CDN.

### Layout
- Finished goods at top, raw materials at bottom
- Horizontal spacing adapts to prevent overlap (min 220px between nodes)
- Multiple root nodes supported (sorted by shared children affinity)

### Visual Features

| Feature | Description |
|---------|-------------|
| **Node coloring** | By type (default) or by location. Centralized TYPE_CONFIG with auto-color for unknown types (deterministic HSL hash). |
| **Dynamic legend** | Shows only node types/locations present in the loaded model. Includes link type section (BOM: solid, Transport: dashed). |
| **Buffer indicators** | Trapezoid icon on buffered nodes |
| **ADU badges** | Blue rectangle showing independentADU on demand-facing nodes |
| **BOM quantity labels** | Edge labels showing quantity per parent. Hidden on transport links. |
| **Shared node dedup** | Nodes with multiple parents shown once. Secondary links connect additional parents. Badge shows parent count (e.g., "3×"). |
| **Collapse/expand** | +/− button at bottom of parent nodes. Click to hide/show subtree. |
| **Focus mode** | Select a node → filter to show only its ancestors and descendants. Badge shows focused node name. |
| **Tooltips** | Two-column tooltip on hover: attributes on left, buffer zone visualization on right. Shows location below product name. |
| **Zoom/Pan** | Mouse wheel zoom, click-and-drag pan. View preserved during buffer operations. |

### Color-by Modes

- **Type** (default): Each node type gets a distinct color from TYPE_CONFIG
- **Location**: Each unique location value gets a color from a palette. Useful for multi-warehouse models.

Persisted in localStorage. Legend updates dynamically on toggle.

---

## 4. Table View

### Columns (16 total)

| Column | Type | Sortable | Width |
|--------|------|----------|-------|
| Location | text | ✓ | 100px |
| Product | text | ✓ | 150px |
| Description | text | ✓ | 150px |
| Type | enum | ✓ | 120px |
| Lead Time | number | ✓ | 80px |
| CLT | number | ✓ | 70px |
| DLT | number | ✓ | 70px |
| Independent ADU | number | ✓ | 100px |
| Calculated ADU | number | ✓ | 100px |
| Has Buffer | boolean | ✓ | 80px |
| Buffer Locked | boolean | ✓ | 80px |
| Buffer Profile | enum | ✓ | 80px |
| Customer Tolerance | number | ✓ | 100px |
| Missing Tolerance | number | ✓ | 100px |
| LT Exceeding | number | ✓ | 100px |
| Unit Cost | number | ✓ | 100px |

### Sorting
- Click header: ascending → descending → clear
- Single-column sort
- Null values always sort last

### Filtering (Excel-style)

Funnel icon (🔻) next to each column header. Click to open type-specific dropdown:

| Column Type | Filter UI |
|-------------|----------|
| Text | Contains / equals / starts with / ends with |
| Enum | Multi-select checkboxes with counts |
| Number | Range (min/max) / greater / less / equals |
| Boolean | All / yes only / no only |

**Active filters bar**: Shows badges for each active filter with × to remove. "Clear All" button. Row count: "Showing X of Y nodes".

### Filter Presets

Save/load named filter combinations. Stored in model's `filterPresets` array. Persisted through JSON export/import.

### Row Click
Opens the same detail panel as clicking a node in the network view.

---

## 5. Scenarios View

### Layout

Split panel:
- **Left panel (40%)**: Scenario table + modifications detail panel (resizable divider)
- **Right panel (60%)**: D3.js comparison bar chart

### Scenario Table Columns

| Column | Content |
|--------|---------|
| Checkbox | Select for comparison |
| Name | Icon (📊 baseline / 📋 custom) + name + ⭐ if active |
| Inventory | Total inventory value |
| Buffers | Buffer count |
| Missing (d) | Missing customer tolerance days |
| LT Exceed (d) | Lead time exceeding |
| Actions | ✏️ Rename, 🗑️ Delete (icon buttons) |

### Protection Rules

- **Baseline scenario**: Rename and delete disabled
- **Active scenario**: Delete disabled (must switch to another first)

### Modifications Detail Panel

Flat table below the scenario list showing modifications for the selected (clicked) scenario:

| Node | Attribute | Baseline | New Value |
|------|-----------|----------|-----------|

### Comparison Chart

D3.js horizontal bar chart. Select 2+ scenarios via checkboxes to compare:
- Total Inventory Value
- Buffer Count
- Missing Customer Tolerance
- LT Exceeding Tolerance

---

## 6. Profiles View (🎛️)

Buffer profiles management view — fourth tab in the view toggle.

### Layout

Split panel (fixed, no resize):
- **Left panel (280px)**: Profile list + Add button
- **Right panel (flex)**: Edit form or empty state

### Profile List

Sorted: default profiles first (F, I, U, AL, AI), then custom alphabetically. Each item shows:
- Profile code
- Usage badge: number of nodes using this profile (blue if > 0, gray if 0)

Clicking a profile selects it and loads the edit form. If there are unsaved changes, a confirmation is shown before switching.

### Edit Form

| Section | Fields |
|---------|--------|
| **Identity** | Code (always editable — renaming propagates to all nodes using this profile) |
| **Variability** | Variability Factor (0–1, controls Red zone size) |
| **DLT Thresholds** | C: short/medium boundary (days), M: medium/long boundary (days, must be > C) |
| **Lead Time Factors** | Short / Medium / Long (0–1 each, three-column grid) |

**Info hint**: When a profile is used by nodes, a blue hint reads *"ℹ️ Used by X nodes — renaming will update them"*.

**Dirty tracking**: Save and Reset buttons are disabled until a field is changed.

### Usage Panel

Collapsible section at the bottom of the edit form. Shows the count of nodes using this profile and a list of those nodes (product + location). Clicking a node navigates to the Network view and selects that node.

### Action Buttons

| Button | Behaviour |
|--------|-----------|
| 💾 Save | Validates form, applies changes, renames profile code in all nodes if changed, triggers buffer sizing recalculation cascade |
| ↩ Reset | Discards unsaved changes, reloads form from current profile |
| 📋 Duplicate | Creates a copy with suffix `_COPY` (or `_COPY2`, etc.), selects it |
| 🗑️ Delete | If 0 nodes: confirm dialog. If nodes exist: replacement modal (choose another profile or "Leave unassigned") |
| + Add | Creates new profile with code `NEW` (or `NEW2`, etc.), pre-fills from selected profile or defaults, sets dirty |

### Delete Replacement Modal

When deleting a profile used by nodes:
- Lists all other profiles as radio options
- Plus "Leave unassigned (null)" option
- Confirm button disabled until a replacement is chosen
- On confirm: updates all affected nodes, removes profile, triggers recalculation

### Recalculation Cascade (on Save)

After saving a profile: recalculates `bufferSizing` for all buffered nodes using that profile, then updates metrics dashboard, table view, and network visualization.

### Data Source

Profiles are read from `window.BUFFER_PROFILES` (SCRIPT 300, flat format) on first access and normalised into `window.DDOptim.model.bufferProfiles` (structured format with `dltThresholds` and `leadTimeFactors`). After any edit, `model.bufferProfiles` is the live store.

---

## 7. Detail Panel (Sidebar)

Opens on the right when a node is clicked (in any view). Sections:

| Section | Content |
|---------|---------|
| **Header** | Product name, description, location, type badge |
| **Lead Times** | Lead Time (editable), CLT, DLT (read-only) |
| **Demand** | Independent ADU (editable), Calculated ADU (read-only) |
| **Buffer** | hasBuffer toggle, bufferLocked toggle, bufferProfile dropdown, bufferRationale text |
| **Constraints** | MOQ (editable), Order Cycle (editable), Unit Cost (editable) |
| **Customer** | Customer Tolerance (editable, only when independentADU > 0), Missing CLT, LT Exceeding |
| **Buffer Sizing** | Yellow/Green/Red zones (when buffer sizing is connected) |

All editable fields trigger immediate recalculation cascade: ADU → CLT → DLT → delivery metrics → buffer sizing → UI refresh.

---

## 8. Auto-Position Modal (DIV 108) — RLT

Triggered by the Auto-Position button. Shows:

1. **Summary**: Buffers to add / remove / locked (preserved)
2. **Change list**: Per-node detail with justification (remainingTime value)
3. **Execution log**: Iteration count, propagation trace
4. **Actions**: Apply (green) / Cancel (gray)

Apply button disabled when no changes proposed.
Cancel restores the snapshot taken before algorithm execution.

---

## 9. OPT Modal (SCRIPT 935)

Triggered by the Optimize button. Two possible states:

**Launch modal:**
- Budget field (numeric, currency units) or "No limit" checkbox
- Pre-filled with `scenario.budgetMax` if previously set
- Run / Cancel

**Infeasibility error modal (Phase 0 failure):**
- Table of infeasible `toleranceMandatory` nodes with minimum achievable delivery LT, required tolerance, and cause (locked buffer or budget)
- Suggestions for resolution

**Results modal:**
- f0/f1/f2 before → after summary
- Coverage status (mandatory nodes, all demand nodes)
- Per-node buffer changes with phase attribution (Coverage / Reduction / Swap)
- Budget status (if defined)
- "Save as new scenario" (with editable name) / Cancel

---

## 10. Metrics Dashboard (DIV 107)

Four KPI cards displayed below the controls bar:

| KPI | Description | Status |
|-----|-------------|--------|
| Total Inventory Value | Sum of all buffer inventoryValue | ⚠️ Needs buffer sizing integration |
| Buffer Count | Number of nodes with hasBuffer=true | ✅ |
| Missing Customer Tolerance | Sum of missingCustomerLeadTime across all demand nodes | ✅ |
| LT Exceeding Tolerance | ADU-weighted average of ltExceeding | ✅ |

---

## 11. Load from Datamart (DIV 360)

Modal dialog for importing real B2WISE data:

1. Fetches distinct warehouse locations via DataMart query
2. Displays checkbox list: warehousecode + description + part count
3. "Select All" toggle
4. Load button disabled until selection made
5. On load: DatamartImporter runs 3 Athena queries (nodes, BOM, transfers)
6. Progress indicator during import
7. After import: model loaded, customer tolerance set to 0 (manual entry required)

---

## 12. CommWise Block Structure

### Style Blocks

| Block | Content |
|-------|---------|
| STYLE 100 | App Header styles |
| STYLE 103 | Model Name Bar styles |
| STYLE 106 | Load Model Modal styles |
| STYLE 107 | Metrics Bar styles |
| STYLE 108 | Auto-Position Modal styles |
| STYLE 200 | Layout (full-height network) |
| STYLE 300 | Network Visualization + Tooltip styles |
| STYLE 400 | Control/Detail Panel styles |
| STYLE 450 | Focus Mode styles |
| STYLE 600 | Tabular View styles |
| STYLE 610 | Datamart Modal styles |
| STYLE 650 | Column Filter styles |
| STYLE 700 | Scenarios View styles |
| STYLE 710 | Buffer Profiles View styles |

### HTML Blocks

| Block | Content |
|-------|---------|
| DIV 100 | App Header |
| DIV 105 | Controls Bar (two-line layout, 4-tab view toggle) |
| DIV 106 | Load Model Modal |
| DIV 107 | Metrics Dashboard |
| DIV 108 | Auto-Position Preview Modal (RLT) |
| DIV 200 | Network + Table + Scenarios + Profiles containers |
| DIV 210 | Buffer Profiles View (list panel + edit panel + delete modal) |
| DIV 300 | Detail Panel Sidebar |
| DIV 360 | Datamart Import Modal |

### Script Blocks

| Block | Module |
|-------|--------|
| SCRIPT 75 | D3.js CDN Loader |
| SCRIPT 100 | CommWise API Client |
| SCRIPT 200 | Weber Pignons Network Data *(temporary test data)* |
| SCRIPT 300 | Buffer Profile Definitions (window.BUFFER_PROFILES, flat format) |
| SCRIPT 400 | DDMRP Buffer Sizing Calculator |
| SCRIPT 407 | Metrics Display Updater |
| SCRIPT 500 | ADU Propagation Engine |
| SCRIPT 600 | CLT Calculator |
| SCRIPT 620 | Delivery Lead Time Calculator |
| SCRIPT 650 | RLT Propagation Engine |
| SCRIPT 660 | OPT Engine — Phase 0 (Feasibility Check) |
| SCRIPT 661 | OPT Engine — Phases 1–2 (RLT Seed + Greedy Coverage) |
| SCRIPT 662 | OPT Engine — Phases 3–4 (Inventory Reduction + Swap Search) |
| SCRIPT 663 | OPT Orchestrator |
| SCRIPT 700 | DLT Calculator |
| SCRIPT 800 | Network Renderer (D3.js) |
| SCRIPT 850 | Focus Manager |
| SCRIPT 900 | UI Core Module (state, init) |
| SCRIPT 905 | Detail Panel Renderer |
| SCRIPT 910 | Basic Parameter Handlers |
| SCRIPT 915 | Constraint Handlers |
| SCRIPT 920 | Buffer Decision Handlers |
| SCRIPT 925 | Customer Lead Time Handler |
| SCRIPT 930 | Auto-Position UI Handlers (RLT) |
| SCRIPT 935 | OPT UI Handler (launch modal, error modal, results modal) |
| SCRIPT 1000 | Model Library *(temporary test data)* |
| SCRIPT 1090 | Unified Model Loader |
| SCRIPT 1100 | Load Model Modal Controller |
| SCRIPT 1150 | JSON Export Module |
| SCRIPT 1160 | JSON Import Module |
| SCRIPT 1165 | Export/Import Button Handlers |
| SCRIPT 1170 | Datamart Import Dialog |
| SCRIPT 1175 | Load from Datamart Button Handler |
| SCRIPT 1177 | DatamartImporter (loadNetwork) |
| SCRIPT 1200 | Initialization (test network startup) |
| SCRIPT 1210 | Filter Engine |
| SCRIPT 1220 | Sort Engine |
| SCRIPT 1230 | Filter UI Init & Events |
| SCRIPT 1232 | Filter UI Form Management |
| SCRIPT 1234 | Filter UI Operations |
| SCRIPT 1236 | Filter UI Display |
| SCRIPT 1240 | Table Event Handlers |
| SCRIPT 1250 | Debug Status Logger |
| SCRIPT 1260 | View Toggle Handler (4 views: network, table, scenarios, profiles) |
| SCRIPT 1270 | Table Renderer |
| SCRIPT 1280 | Column Filter Dropdown Controller |
| SCRIPT 1285 | Active Filters Bar Manager |
| SCRIPT 1290 | Filter Preset Manager |
| SCRIPT 1300 | Scenario Constants |
| SCRIPT 1305 | Baseline Snapshot Management |
| SCRIPT 1310 | Node Selection Engine |
| SCRIPT 1320 | Modification Application Engine |
| SCRIPT 1330 | Scenario Application Engine |
| SCRIPT 1335 | Scenarios View Renderer |
| SCRIPT 1337 | Scenarios Split Panel Resize |
| SCRIPT 1340 | Load Scenario Workflow |
| SCRIPT 1345 | Comparison Bar Chart (D3) |
| SCRIPT 1350 | Scenario UI Handler |
| SCRIPT 1355 | Scenarios Event Handlers |
| SCRIPT 1360 | Scenario Diff Engine |
| SCRIPT 1380 | Buffer Profiles View Renderer |
| SCRIPT 1385 | Buffer Profiles Event Handlers (CRUD) |

### Diagnostics Blocks

| Block | Type | Content |
|-------|------|---------|
| DIAGNOSTICS 20100 | ON_DEMAND | RLT Algorithm Test |
| DIAGNOSTICS 20200 | ON_DEMAND | ADU Propagation Validation |
| DIAGNOSTICS 20300 | ON_DEMAND | CLT/DLT Validation |

All diagnostic tests are ON_DEMAND (run manually from Help System panel). Tests auto-load the required test model before executing.

---

**Document Version:** 3.1  
**Last Updated:** February 27, 2026
