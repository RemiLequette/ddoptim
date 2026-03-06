# DDoptim — Buffer Profiles Management

**Version:** 1.0  
**Date:** February 27, 2026  
**Status:** Implemented (SCRIPTS 1380, 1385)

---

## 1. Overview

The Buffer Profiles view provides a dedicated CRUD interface for managing DDMRP buffer profiles. Users can create, edit, rename, duplicate, and delete profiles, with live tracking of which nodes use each profile and automatic propagation of changes (rename, delete) to affected nodes.

---

## 2. Data Model

### Profile Structure (normalised format)

```javascript
{
  variabilityFactor: number,      // 0–1. Controls Red zone size.
  dltThresholds: {
    C: number,                    // days — short/medium DLT boundary
    M: number                     // days — medium/long DLT boundary (must be > C)
  },
  leadTimeFactors: {
    short:  number,               // 0–1, applied when DLT ≤ C
    medium: number,               // 0–1, applied when C < DLT ≤ M
    long:   number                // 0–1, applied when DLT > M
  }
}
```

### Storage

Profiles are stored in `window.DDOptim.model.bufferProfiles` as a plain object keyed by profile code:

```javascript
window.DDOptim.model.bufferProfiles = {
  "F":  { variabilityFactor: 0.25, dltThresholds: { C: 1, M: 3 }, leadTimeFactors: { short: 0.7, medium: 0.5, long: 0.25 } },
  "AI": { variabilityFactor: 0.7,  dltThresholds: { C: 1, M: 5 }, leadTimeFactors: { short: 0.7, medium: 0.5, long: 0.25 } },
  ...
}
```

On first access (before any edit), this object is populated by converting `window.BUFFER_PROFILES` (SCRIPT 300, flat format) to the normalised format. After any edit, `model.bufferProfiles` is the authoritative live store.

### Legacy Format Conversion (SCRIPT 300 → normalised)

| Flat field (SCRIPT 300) | Normalised field |
|------------------------|-----------------|
| `variabilityFactor` | `variabilityFactor` |
| `dlt_threshold_short` | `dltThresholds.C` |
| `dlt_threshold_medium` | `dltThresholds.M` |
| `leadTimeFactor_short` | `leadTimeFactors.short` |
| `leadTimeFactor_medium` | `leadTimeFactors.medium` |
| `leadTimeFactor_long` | `leadTimeFactors.long` |

### Default Profiles

| Code | Description | variabilityFactor | C | M |
|------|-------------|------------------|---|---|
| F | Fabriqués (Manufactured) | 0.25 | 1 | 3 |
| I | Intermédiaires (Semi-finished) | 0.25 | 1 | 3 |
| U | Usinés (Machined) | 0.5 | 1 | 5 |
| AL | Achetés Local | 0.5 | 1 | 3 |
| AI | Achetés International | 0.7 | 1 | 5 |

---

## 3. User Interface

### Layout

Split panel (fixed, no resize divider):
- **Left panel (280px)**: Profile list + Add button
- **Right panel (flex)**: Edit form, or empty state ("Select a profile to edit")

### Profile List

- Sorted: default profiles first (F, I, U, AL, AI order), then custom alphabetically
- Each item: profile code + usage badge (blue if used by ≥ 1 node, gray otherwise)
- Click to select → loads edit form. If form has unsaved changes, confirms before switching.

### Edit Form Sections

| Section | Fields | Notes |
|---------|--------|-------|
| Identity | Code | Always editable. Info hint shown when used by nodes. |
| Variability | variabilityFactor | 0–1 |
| DLT Thresholds | C, M | C < M enforced by validation |
| Lead Time Factors | short, medium, long | 0–1 each, 3-column grid |
| Usage panel | (collapsible) | Count of nodes using this profile + clickable node list |

### Dirty Tracking

Save and Reset buttons disabled until any field is modified. All 7 input fields (`code`, `vf`, `dlt-c`, `dlt-m`, `ltf-short`, `ltf-medium`, `ltf-long`) trigger dirty state on `input` event.

### Info Hint (Rename)

When `usageCount > 0`, a blue hint below the Code field reads:

> ℹ️ Used by X nodes — renaming will update them

The code field remains fully editable. On Save, all nodes whose `bufferProfile` matches the old code are updated to the new code.

---

## 4. CRUD Operations

### Save

1. Validate all fields (see Validation section)
2. Read new code from input
3. If code changed: delete old key from `model.bufferProfiles`, update `bufferProfile` on all affected nodes
4. Write new profile object under new code
5. Trigger recalculation cascade (see below)
6. Re-render list + edit panel

### Reset

Re-renders the edit panel from current saved profile values. Clears all dirty state.

### Duplicate

- Generates unique code: `<current>_COPY`, `<current>_COPY2`, …
- Deep-copies profile object
- Selects new profile (clean state, no dirty flag)

### Delete (0 nodes)

Simple `confirm()` dialog → removes profile from `model.bufferProfiles` → deselects.

### Delete (nodes exist)

Opens replacement modal:
- Lists all other profiles as radio options
- Plus "Leave unassigned (null)" option
- Confirm button disabled until selection made
- On confirm: updates `bufferProfile` on all affected nodes to replacement code (or null), removes profile, triggers recalculation for replacement profile (if not null)

### Add

- Generates unique code: `NEW`, `NEW2`, …
- Pre-fills from currently selected profile (deep copy) or from defaults if none selected
- Sets dirty = true immediately (unsaved until confirmed with Save)
- Focuses and selects the Code field for immediate rename

---

## 5. Validation

| Field | Rule |
|-------|------|
| Code | Required, `/^[A-Z0-9_]+$/`, unique (no other profile with same code) |
| variabilityFactor | 0 ≤ value ≤ 1 |
| C | integer ≥ 1 |
| M | integer ≥ 1, M > C |
| leadTimeFactors (×3) | 0 ≤ value ≤ 1 |

Errors displayed inline below each field. Save button remains disabled while any error exists.

---

## 6. Recalculation Cascade

Triggered after Save (for the modified/renamed profile code) and after Delete with replacement:

```
For each buffered node where bufferProfile === affectedCode:
  node.bufferSizing = calculateBufferSizing(node, profile)

→ updateMetricsDashboard()
→ renderTable()
→ NetworkRenderer.render(currentNetwork)
```

---

## 7. CommWise Blocks

| Block | Content |
|-------|---------|
| STYLE 710 | CSS: split panel, list items, edit form, usage panel, action buttons, delete modal |
| DIV 210 | HTML: left panel (list + Add), right panel (edit form + usage panel + footer), delete replacement modal |
| DIV 105 | Modified: added 🎛️ Profiles button to view toggle group |
| SCRIPT 1260 | Modified: extended to handle 'profiles' view (hide/show container, active button state, render call) |
| SCRIPT 1380 | Renderer: `renderProfilesView()`, `renderProfilesList()`, `renderProfileEditPanel()`, `renderUsagePanel()`, `getProfiles()`, `getAllNodes()`, dirty state management |
| SCRIPT 1385 | Event handlers: `handleSave`, `handleReset`, `handleDuplicate`, `handleDelete`, `openDeleteModal`, `executeDelete`, `handleAddProfile`, field dirty listeners |

### Key Functions Exposed

| Namespace | Function | Description |
|-----------|----------|-------------|
| `window.DDOptim` | `renderProfilesView()` | Called by View Toggle to render the full view |
| `window.DDOptim._profilesRenderer` | `renderProfilesList()` | Re-renders the left panel list |
| `window.DDOptim._profilesRenderer` | `renderProfileEditPanel()` | Re-renders the right panel form |
| `window.DDOptim._profilesRenderer` | `getProfiles()` | Returns normalised profiles (lazy-converts from BUFFER_PROFILES if needed) |
| `window.DDOptim._profilesRenderer` | `getAllNodes()` | Returns node array from Map/Array/Object |
| `window.DDOptim._profilesRenderer` | `setDirty(bool)` | Controls Save/Reset button enabled state |

---

**Document Version:** 1.0  
**Last Updated:** February 27, 2026
