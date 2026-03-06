# DDoptim — Data Model

**Version:** 3.1  
**Date:** February 26, 2026

---

## 1. Network Node Structure

Each node represents a part at a specific location in the supply chain.

```javascript
{
  // Identity
  id: "string",                    // Unique identifier
                                   // Model Library: descriptive (e.g., "velo", "roue")
                                   // DataMart import: wwarehousepartid cast to string
  product: "string",               // Display name / part code (e.g., "Vélo", "Roue")
  description: "string",           // Human-readable description (optional, from partdescription)
  location: "string",              // Site/warehouse identifier (e.g., "plant", "shop 1")
  type: "string",                  // Node type for display and color-coding
                                   // Examples: "finished_product", "intermediate", "machined",
                                   // "purchased_local", "purchased_international"
                                   // Type values are free-form — used for display only, 
                                   // not referenced by any algorithm.
                                   // DataMart import uses itemtypecode directly.

  // BOM/Transport relationships — SINGLE SOURCE OF TRUTH: children array
  children: [
    {
      id: "string",               // Child node ID (always use .id, NOT .nodeId)
      quantity: number,            // Units per parent (default 1 for transport links)
      linkType: "bom" | "transport"
                                   // "bom" = manufacturing/assembly (default if absent)
                                   // "transport" = inter-location transfer link
    }
  ],
  // Parent relationships are computed as reverse index — never stored manually

  // Lead time
  leadTime: number,                // Days (this operation/procurement only)

  // Customer-facing attributes (customer-facing nodes only)
  customerTolerance: number,       // Days — max acceptable delivery time
                                   // Only meaningful when independentADU > 0
                                   // Not in DataMart — set manually in DDoptim
  toleranceMandatory: boolean,     // If true AND independentADU > 0: DLT ≤ customerTolerance
                                   // is a hard constraint for the OPT algorithm
                                   // OPT halts with error if infeasible (locked buffers or budget)
                                   // Default: false. Not used by RLT algorithm.
  visibilityHorizon: number,       // Days (not yet used in algorithms)

  // Demand data
  independentADU: number,          // Direct customer demand (units/day)
                                   // Non-zero for: finished products, spare parts
                                   // Zero for: pure intermediate components
                                   // DataMart source: adusales field

  // Buffer configuration
  bufferProfile: "F"|"I"|"U"|"AL"|"AI"|null,  // DDMRP buffer profile
  moq: number,                     // Minimum order quantity (default 0)
  orderCycle: number,              // Days (default 0)
  unitCost: number,                // Currency per unit

  // Buffer status (user-controlled)
  hasBuffer: boolean,              // Buffer on/off toggle
  bufferLocked: boolean,           // Lock: prevents auto-positioning changes
  bufferRationale: "string",       // Why this buffer exists (free text)

  // Calculated values (computed at runtime — read-only, not exported)
  calculatedADU: number,           // independentADU + Σ(parent.calculatedADU × qty)
  clt: number,                     // Cumulative Lead Time
  dlt: number,                     // Decoupled Lead Time
  requiredLeadTime: number,        // Runtime-only, used by RLT algorithm
  missingCustomerLeadTime: number, // MAX(0, DLT - customerTolerance)
  ltExceeding: number,             // MAX(0, customerTolerance - DLT)
  bufferSizing: {                  // Calculated DDMRP zones
    yellow: number,
    green: number,
    red: number,
    topOfYellow: number,
    topOfGreen: number,
    averageStock: number,
    inventoryValue: number
  }
}
```

### Key Conventions

- **Children array** is the single source of truth for BOM relationships. Parent relationships are computed as a reverse index during post-processing.
- **`id` field** is used consistently (not `nodeId`) across all children references.
- **`product`** is the display name (not `name` — renamed in v2.x).
- **`location`** supports multi-site models. Single-site models use a common value (e.g., "plant").
- **`linkType`** defaults to `"bom"` when absent for backward compatibility.
- **`type`** is used only for display/color-coding — no algorithm references it.
- **Calculated values** are never exported to JSON. They are recomputed on import.

---

## 2. Buffer Profile Structure

Five default profiles with configurable parameters:

```javascript
{
  "F": {  // Fabricated (make-to-stock)
    variabilityFactor: 0.5,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.5, medium: 0.4, long: 0.3 }
  },
  "I": {  // Intermediate
    variabilityFactor: 0.4,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.5, medium: 0.4, long: 0.3 }
  },
  "U": {  // Unique / machined
    variabilityFactor: 0.6,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.6, medium: 0.5, long: 0.4 }
  },
  "AL": { // Achat Local (purchased local)
    variabilityFactor: 0.3,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.4, medium: 0.3, long: 0.2 }
  },
  "AI": { // Achat International (purchased international)
    variabilityFactor: 0.7,
    dltThresholds: { C: 10, M: 30 },
    leadTimeFactors: { short: 0.6, medium: 0.5, long: 0.4 }
  }
}
```

When importing from DataMart, `ltvarfactoractual` (per-part actual lead time factor) can be used directly instead of deriving from DLT thresholds.

---

## 3. JSON Export/Import Format

### Standard JSON Structure

```json
{
  "metadata": {
    "name": "Model Name",
    "description": "Model description",
    "version": "1.0",
    "exportedAt": "2026-02-26T10:00:00Z",
    "exportedBy": "DDoptim v3.0"
  },
  "nodes": [
    {
      "id": "node_id",
      "product": "Display Name",
      "description": "Part description",
      "location": "plant",
      "type": "intermediate",
      "independentADU": 0,
      "leadTime": 5,
      "bufferProfile": "I",
      "hasBuffer": false,
      "bufferLocked": false,
      "bufferRationale": "",
      "moq": 0,
      "orderCycle": 0,
      "unitCost": 10.50,
      "customerTolerance": 0,
      "toleranceMandatory": false,
      "children": [
        { "id": "child_id", "quantity": 2, "linkType": "bom" }
      ]
    }
  ],
  "bufferProfiles": {
    "F": { ... }, "I": { ... }, "U": { ... }, "AL": { ... }, "AI": { ... }
  },
  "scenarios": [
    {
      "id": "uuid",
      "name": "Scenario Name",
      "isBaseline": false,
      "budgetMax": null,
      "modifications": [ ... ],
      "metrics": { ... }
    }
  ],
  "filterPresets": [
    {
      "id": "preset_id",
      "name": "Critical Components",
      "filters": [ ... ]
    }
  ]
}
```

### Export Behavior

- Exports **baseline** node values (not current scenario state)
- Includes all scenarios with their modifications
- Includes filter presets if any exist
- Excludes calculated values (ADU, CLT, DLT, buffer sizing)
- On import, all calculations are rerun and scenarios are replayed

### Backward Compatibility

The ModelLoader handles legacy formats:
- `node.name` → falls back to `node.product || node.name || node.id`
- `children[].nodeId` → normalized to `children[].id`
- Missing `linkType` → defaults to `"bom"`
- Missing `location` → defaults to `"plant"`
- Missing `description` → defaults to `""`
- Missing `toleranceMandatory` → defaults to `false`

---

## 4. Core Algorithms

### 4.1 ADU Propagation (SCRIPT 500) ✅

Top-down through BOM (parents before children):

```
For each node in topological order:
  dependentADU = Σ(parent.calculatedADU × quantity_per_parent)
  node.calculatedADU = node.independentADU + dependentADU
```

Seasonal adjustment applied to independentADU before propagation.

### 4.2 CLT Calculation (SCRIPT 600) ✅

Bottom-up, independent of buffers:

```
if leaf: node.clt = node.leadTime
else: node.clt = node.leadTime + MAX(child.clt for all children)
```

### 4.3 DLT Calculation (SCRIPT 700) ✅

Bottom-up, resets at buffers:

```
if hasBuffer: node.dlt = node.leadTime  (buffer decouples from upstream)
else if leaf: node.dlt = node.leadTime
else: node.dlt = node.leadTime + MAX(child.dlt for all children)
```

### 4.4 Delivery Lead Time Calculator (SCRIPT 620) ✅

For nodes with independentADU > 0:
- `missingCustomerLeadTime = MAX(0, DLT - customerTolerance)`
- `ltExceeding = MAX(0, customerTolerance - DLT)`

### 4.5 DDMRP Buffer Sizing (SCRIPT 400) ⚠️

Complete formulas implemented, not yet connected to UI events:
- Yellow zone = ADU × DLT
- Green zone = MAX(Yellow × leadTimeFactor, MOQ, ADU × orderCycle)
- Red zone = Green_delay × (1 + variabilityFactor)
- Average Stock = Red + Yellow + Green/2

### 4.6 RLT Auto-Positioning (SCRIPT 650) ✅

See separate document: `05_DDoptim_RLT_Algorithm.md`

### 4.7 OPT Inventory Minimization (SCRIPT 660) ⬜

See separate document: `07_DDoptim_OPT_Algorithm.md`

---

**Document Version:** 3.1  
**Last Updated:** February 26, 2026
