# DDoptim Scenario Management - Design Document

**Project:** DDoptim - DDMRP Buffer Positioning Optimizer  
**Feature:** Scenario Management System  
**Version:** 2.0  
**Date:** February 16, 2026  
**Status:** Implementation Ready

---

## 1. Executive Summary

### 1.1 Purpose

Design a comprehensive scenario management system that enables users to:

- Create and save multiple buffer positioning strategies using **generic parameterized modifications**
- Compare scenarios quantitatively with metrics and visual comparisons
- Explore what-if analyses through **transformation recipes** (node selectors + operators + values)
- Make informed strategic decisions based on trade-off analysis
- Maintain a **baseline configuration** for comparison and reset capability

### 1.2 Context

From DDoptim_requirements.md Section 2.5:

> Scenario management enables comparison of different buffer positioning strategies under varying assumptions (demand, lead times, constraints). Users can define parameterized modifications to nodes using a generic structure that reuses the filter engine.

### 1.3 Key Design Principles

1. **Generic modification structure**: Node selectors (filters or explicit IDs) + attribute + operator + value
2. **Baseline preservation**: Original configuration always available via snapshot for reset
3. **JSON-based persistence**: Scenarios stored in model JSON, **not localStorage**
4. **Parameterized transformations**: Reuse filter engine for flexible node selection
5. **Non-destructive workflow**: Switching scenarios always restores baseline first
6. **Sequential application**: Modifications apply in order, last wins on conflicts
7. **Full recalculation**: After applying modifications, recalculate ADU, CLT, DLT, buffers, metrics

---

## 2. Core Concepts

### 2.1 What is a Scenario?

A **scenario** is a named set of **parameterized modifications** that transform the baseline network configuration:

- **Node selector** (filters or explicit IDs) → defines which nodes to modify
- **Attribute** → which property to change (ADU, lead time, buffer status, etc.)
- **Operator** → how to change it (=, +, -, *, /)
- **Value** → the new or delta value to apply

**Key Insight**: Scenarios are **transformation recipes**, not complete data snapshots. This makes them:
- ✅ Compact (only store deltas, not full network state)
- ✅ Composable (multiple modifications can apply sequentially)
- ✅ Reusable (same modification logic across different base networks)
- ✅ Flexible (leverage filter engine for powerful node selection)

**Example modification:**
```javascript
{
  nodeSelector: {
    filters: [{ column: "type", operator: "equals", value: "purchased_international" }]
  },
  attribute: "leadTime",
  operator: "-",
  value: 3,
  label: "-3 days LT",
  rationale: "Supplier improvement project"
}
```

### 2.2 Baseline Concept

The **Baseline** is a special scenario with zero modifications that represents the original network configuration:

- **Always present** (cannot be deleted, `isBaseline: true` flag)
- **Stored in JSON** as `scenarios[0]`
- **Snapshot captured** at model load into `window.DDOptim.scenarios.baselineSnapshot`
- **Used for reset** when switching scenarios:
  1. Restore all nodes to baseline snapshot
  2. Apply scenario modifications in order
  3. Recalculate network (ADU, CLT, DLT, buffers, metrics)

**Why snapshot?**
- Allows quick restoration without parsing modifications
- Ensures perfect baseline fidelity (no accumulated rounding errors)
- Independent of scenario modification history

### 2.3 Generic Modification Structure

Each modification consists of:

```javascript
{
  // === NODE SELECTION ===
  nodeSelector: {
    nodeIds: ["velo", "roue"],    // Optional: explicit node IDs (array)
    filters: [                     // Optional: filter criteria (same as table filters)
      { 
        column: "type", 
        operator: "equals", 
        value: "purchased_international" 
      }
    ]
    // Rules:
    // - Empty (no nodeIds, no filters) → ALL nodes
    // - Both specified → Union (nodeIds OR matching filters)
    // - Filters use same structure as table filtering system
  },
  
  // === TRANSFORMATION ===
  attribute: "independentADU",     // What to modify (see MODIFIABLE_ATTRIBUTES)
  operator: "+",                   // How to modify: "=" | "+" | "-" | "*" | "/"
  value: 10,                       // Value to apply (type depends on attribute)
  
  // === METADATA (Optional) ===
  label: "+10 ADU",                // Short UI label
  rationale: "Spare parts demand"  // Justification/documentation
}
```

### 2.4 Scenario Use Cases

| Use Case                  | Modification Examples                                     |
| ------------------------- | --------------------------------------------------------- |
| **Growth Planning**       | Multiply finished goods ADU × 1.5, reduce tolerance to 2 days |
| **Supplier Optimization** | Subtract 3 days from international supplier lead times    |
| **Strategic Buffers**     | Set hasBuffer=false for ALL, then true for 3 specific nodes |
| **Profile Change**        | Change all international suppliers from AI to AL profile  |
| **Cost Analysis**         | Multiply unit costs × 1.2 (inflation scenario)           |
| **Lead Time Targets**     | Divide customer tolerance ÷ 2 (aggressive targets)       |

### 2.5 Scenario Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. LOAD MODEL                                       │
│    - Parse JSON (includes scenarios array)          │
│    - Initialize window.currentNetwork               │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 2. CAPTURE BASELINE SNAPSHOT                        │
│    - Deep clone all modifiable node attributes      │
│    - Store in window.DDOptim.scenarios.baseline...  │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 3. LOAD CURRENT SCENARIO                            │
│    - Read currentScenarioId from JSON               │
│    - If not baseline: apply modifications           │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ USER INTERACTION                                    │
│    - Switch scenarios (dropdown)                    │
│    - Create new scenario                            │
│    - Modify current scenario                        │
│    - Compare scenarios                              │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 4. SWITCH SCENARIO (User selects different one)    │
│    - Check for unsaved changes → warn               │
│    - Restore baseline snapshot                      │
│    - Apply new scenario modifications               │
│    - Recalculate network                            │
│    - Update UI                                      │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 5. SAVE MODEL (Export JSON)                         │
│    - Include scenarios array                        │
│    - Include currentScenarioId                      │
└─────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Scenario Object Structure

```javascript
{
  // === IDENTITY ===
  id: "string",                    // "scenario_" + timestamp + "_" + random
  name: "string",                  // User-friendly name (max 50 chars, unique)
  description: "string",           // Optional context (max 200 chars)
  created: "ISO8601",              // Creation timestamp
  lastModified: "ISO8601",         // Last modification timestamp
  
  // === SPECIAL FLAGS ===
  isBaseline: boolean,             // true for baseline scenario only (cannot delete)
  
  // === MODIFICATIONS (ordered array) ===
  modifications: [
    {
      nodeSelector: {
        nodeIds: ["velo", "roue"],           // Optional
        filters: [FilterObject, ...]         // Optional (same as table filters)
      },
      attribute: "independentADU",           // Attribute name (see MODIFIABLE_ATTRIBUTES)
      operator: "+",                         // "=" | "+" | "-" | "*" | "/"
      value: 10,                             // Type depends on attribute
      label: "+10 ADU",                      // Optional: short UI label
      rationale: "Spare parts demand"        // Optional: justification
    }
  ],
  
  // === CALCULATED METRICS (computed on load, not stored initially) ===
  metrics: {
    // Inventory
    totalInventoryValue: number,
    inventoryByLevel: {
      finished: number,
      intermediate: number,
      component: number,
      purchased: number
    },
    
    // Service
    customerToleranceCoverage: number,    // % products meeting tolerance
    missingCustomerTolerance: number,     // Sum of gaps (days)
    avgDLT: number,
    maxDLT: number,
    avgCLT: number,
    avgBufferImpact: number,              // avgCLT - avgDLT
    
    // Buffers
    bufferCount: number,
    buffersByType: {
      finished: number,
      intermediate: number,
      component: number,
      purchased: number
    },
    
    // Timestamp
    calculatedAt: "ISO8601"
  }
}
```

### 3.2 Modifiable Attributes (Constants)

```javascript
const MODIFIABLE_ATTRIBUTES = {
  // === NUMERIC (support all operators: =, +, -, *, /) ===
  independentADU: { 
    type: 'number', 
    min: 0,
    label: 'Independent ADU',
    unit: 'units/day'
  },
  leadTime: { 
    type: 'number', 
    min: 0,
    label: 'Lead Time',
    unit: 'days'
  },
  customerTolerance: { 
    type: 'number', 
    min: 0,
    label: 'Customer Tolerance',
    unit: 'days'
  },
  moq: { 
    type: 'number', 
    min: 0,
    label: 'MOQ',
    unit: 'units'
  },
  orderCycle: { 
    type: 'number', 
    min: 0,
    label: 'Order Cycle',
    unit: 'days'
  },
  unitCost: { 
    type: 'number', 
    min: 0,
    label: 'Unit Cost',
    unit: '€'
  },
  
  // === BOOLEAN (only operator =) ===
  hasBuffer: { 
    type: 'boolean',
    label: 'Has Buffer'
  },
  bufferLocked: { 
    type: 'boolean',
    label: 'Buffer Locked'
  },
  
  // === ENUM (only operator =) ===
  bufferProfile: { 
    type: 'enum',
    label: 'Buffer Profile',
    values: ['F', 'I', 'U', 'AL', 'AI']
  },
  type: { 
    type: 'enum',
    label: 'Node Type',
    values: [
      'finished_product',
      'intermediate', 
      'machined',
      'purchased_local',
      'purchased_international'
    ]
  },
  
  // === TEXT (only operator =) ===
  bufferRationale: { 
    type: 'text',
    label: 'Buffer Rationale',
    maxLength: 200
  }
};

// Operators allowed per attribute type
const OPERATORS_BY_TYPE = {
  number: ['=', '+', '-', '*', '/'],
  boolean: ['='],
  enum: ['='],
  text: ['=']
};
```

### 3.3 Storage in JSON Model

```javascript
// window.currentNetwork structure (loaded from JSON)
{
  nodes: Map<nodeId, NodeObject>,
  profiles: Map<profileName, ProfileObject>,
  metadata: { name, version },
  filterPresets: [...],           // Existing feature
  
  // === NEW: SCENARIOS ===
  scenarios: [                    // Array of Scenario objects
    {
      id: "baseline",
      name: "Baseline",
      description: "Original network configuration",
      isBaseline: true,           // Special flag: cannot be deleted
      modifications: [],          // Empty for baseline
      created: "ISO8601",
      lastModified: "ISO8601"
    },
    {
      id: "scenario_1708012345678_abc123",
      name: "Growth Scenario",
      description: "50% demand increase + 2-day tolerance",
      isBaseline: false,
      modifications: [
        {
          nodeSelector: {
            filters: [{ column: "type", operator: "equals", value: "finished_product" }]
          },
          attribute: "independentADU",
          operator: "*",
          value: 1.5,
          label: "+50% demand"
        },
        {
          nodeSelector: {
            filters: [{ column: "type", operator: "equals", value: "finished_product" }]
          },
          attribute: "customerTolerance",
          operator: "=",
          value: 2,
          label: "2-day tolerance"
        }
      ],
      created: "ISO8601",
      lastModified: "ISO8601",
      metrics: null  // Calculated on load
    }
  ],
  
  currentScenarioId: "baseline"   // Active scenario ID
}
```

**Key points:**
- ❌ **NO localStorage** - scenarios persist ONLY in JSON model
- ✅ Baseline always present as `scenarios[0]` with `isBaseline: true`
- ✅ `currentScenarioId` indicates which scenario is active
- ✅ Export/import includes full scenarios array

### 3.4 Runtime State (In-Memory)

```javascript
// window.DDOptim.scenarios (runtime state)
{
  baselineSnapshot: {              // Deep clone of baseline node attributes
    "velo": {
      independentADU: 40,
      leadTime: 5,
      customerTolerance: 5,
      hasBuffer: false,
      bufferProfile: "F",
      // ... all modifiable attributes
    },
    "roue": { ... },
    // ... for all nodes
  },
  
  currentScenarioId: "baseline",   // Matches window.currentNetwork.currentScenarioId
  hasUnsavedChanges: false         // Track if current state differs from saved scenario
}
```

**Baseline snapshot:**
- Captured once at model load (after parsing JSON)
- Contains only modifiable attributes (not structure, not calculated values)
- Used to restore network before applying different scenario
- Independent of scenario modifications (pure baseline state)

---

## 4. Core Algorithms

### 4.1 Baseline Capture (at Model Load)

```javascript
/**
 * Capture baseline snapshot
 * Called once after loading model JSON
 */
function captureBaseline() {
  console.log('[Scenario Manager] Capturing baseline snapshot...');
  
  const snapshot = {};
  
  for (const [nodeId, node] of window.currentNetwork.nodes.entries()) {
    snapshot[nodeId] = {
      // Numeric attributes
      independentADU: node.independentADU,
      leadTime: node.leadTime,
      customerTolerance: node.customerTolerance,
      moq: node.moq,
      orderCycle: node.orderCycle,
      unitCost: node.unitCost,
      
      // Boolean attributes
      hasBuffer: node.hasBuffer,
      bufferLocked: node.bufferLocked,
      
      // Enum attributes
      bufferProfile: node.bufferProfile,
      type: node.type,
      
      // Text attributes
      bufferRationale: node.bufferRationale
      
      // NOTE: children/parents NOT included (immutable structure)
      // NOTE: calculatedADU, CLT, DLT, etc. NOT included (recalculated)
    };
  }
  
  window.DDOptim.scenarios.baselineSnapshot = snapshot;
  console.log('[Scenario Manager] ✓ Baseline captured:', Object.keys(snapshot).length, 'nodes');
}
```

### 4.2 Baseline Restoration

```javascript
/**
 * Restore all nodes to baseline state
 * Called before applying a different scenario
 */
function restoreBaseline() {
  console.log('[Scenario Manager] Restoring baseline...');
  
  const snapshot = window.DDOptim.scenarios.baselineSnapshot;
  if (!snapshot) {
    console.error('[Scenario Manager] No baseline snapshot available!');
    return false;
  }
  
  // Restore all modifiable attributes from snapshot
  for (const [nodeId, savedAttrs] of Object.entries(snapshot)) {
    const node = window.currentNetwork.nodes.get(nodeId);
    if (node) {
      // Restore each attribute
      node.independentADU = savedAttrs.independentADU;
      node.leadTime = savedAttrs.leadTime;
      node.customerTolerance = savedAttrs.customerTolerance;
      node.moq = savedAttrs.moq;
      node.orderCycle = savedAttrs.orderCycle;
      node.unitCost = savedAttrs.unitCost;
      node.hasBuffer = savedAttrs.hasBuffer;
      node.bufferLocked = savedAttrs.bufferLocked;
      node.bufferProfile = savedAttrs.bufferProfile;
      node.type = savedAttrs.type;
      node.bufferRationale = savedAttrs.bufferRationale;
    }
  }
  
  console.log('[Scenario Manager] ✓ Baseline restored');
  return true;
}
```

### 4.3 Node Selection

```javascript
/**
 * Select nodes based on nodeSelector
 * Returns array of nodes matching criteria
 */
function selectNodes(network, selector) {
  const allNodes = Array.from(network.nodes.values());
  
  // Case 1: Empty selector → ALL nodes
  if ((!selector.nodeIds || selector.nodeIds.length === 0) && 
      (!selector.filters || selector.filters.length === 0)) {
    console.log('[Scenario Engine] Empty selector → selecting ALL nodes');
    return allNodes;
  }
  
  let selectedNodes = [];
  
  // Case 2: Explicit node IDs
  if (selector.nodeIds && selector.nodeIds.length > 0) {
    const explicitNodes = selector.nodeIds
      .map(id => network.nodes.get(id))
      .filter(Boolean);  // Remove undefined (invalid IDs)
    selectedNodes = [...selectedNodes, ...explicitNodes];
    console.log('[Scenario Engine] Selected', explicitNodes.length, 'nodes by ID');
  }
  
  // Case 3: Filter criteria (reuse filterEngine.applyFilters)
  if (selector.filters && selector.filters.length > 0) {
    const filteredNodes = window.DDOptim.filterEngine.applyFilters(
      allNodes,
      selector.filters
    );
    selectedNodes = [...selectedNodes, ...filteredNodes];
    console.log('[Scenario Engine] Selected', filteredNodes.length, 'nodes by filters');
  }
  
  // Remove duplicates (Union: nodeIds OR filters)
  const uniqueNodes = [];
  const seen = new Set();
  for (const node of selectedNodes) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      uniqueNodes.push(node);
    }
  }
  
  console.log('[Scenario Engine] Total unique nodes selected:', uniqueNodes.length);
  return uniqueNodes;
}
```

### 4.4 Apply Single Modification

```javascript
/**
 * Apply a single modification to a node
 * Validates attribute, operator, and applies transformation
 */
function applyModification(node, modification) {
  const { attribute, operator, value } = modification;
  
  // Validate attribute exists
  if (!(attribute in MODIFIABLE_ATTRIBUTES)) {
    console.warn('[Scenario Engine] Unknown attribute:', attribute);
    return;
  }
  
  const attrDef = MODIFIABLE_ATTRIBUTES[attribute];
  
  // Validate operator for attribute type
  const allowedOps = OPERATORS_BY_TYPE[attrDef.type];
  if (!allowedOps.includes(operator)) {
    console.warn('[Scenario Engine] Invalid operator', operator, 'for type', attrDef.type);
    return;
  }
  
  // Apply transformation
  switch (operator) {
    case '=':
      node[attribute] = value;
      break;
      
    case '+':
      node[attribute] = (node[attribute] || 0) + value;
      break;
      
    case '-':
      node[attribute] = (node[attribute] || 0) - value;
      break;
      
    case '*':
      node[attribute] = (node[attribute] || 0) * value;
      break;
      
    case '/':
      if (value !== 0) {
        node[attribute] = (node[attribute] || 0) / value;
      } else {
        console.warn('[Scenario Engine] Division by zero ignored for node', node.id);
      }
      break;
  }
  
  // Apply constraints (e.g., min value)
  if (attrDef.min !== undefined && node[attribute] < attrDef.min) {
    console.warn('[Scenario Engine] Value', node[attribute], 'below min', attrDef.min, 
                 'for', attribute, 'on node', node.id, '- clamping to min');
    node[attribute] = attrDef.min;
  }
  
  // Log transformation
  console.log('[Scenario Engine] Applied', attribute, operator, value, 'to node', node.id, 
              '→ new value:', node[attribute]);
}
```

### 4.5 Apply Complete Scenario

```javascript
/**
 * Apply scenario modifications to network
 * Returns true if successful
 */
function applyScenario(scenario) {
  console.log('[Scenario Manager] Applying scenario:', scenario.name);
  console.log('[Scenario Manager] Modifications count:', scenario.modifications.length);
  
  // Apply each modification in order (last wins on conflicts)
  for (let i = 0; i < scenario.modifications.length; i++) {
    const mod = scenario.modifications[i];
    console.log('[Scenario Manager] Applying modification', i + 1, ':', mod.label || mod.attribute);
    
    // Select target nodes
    const targetNodes = selectNodes(window.currentNetwork, mod.nodeSelector);
    
    if (targetNodes.length === 0) {
      console.warn('[Scenario Manager] No nodes selected for modification', i + 1);
      continue;
    }
    
    // Apply to each selected node
    for (const node of targetNodes) {
      applyModification(node, mod);
    }
  }
  
  console.log('[Scenario Manager] ✓ All modifications applied');
  return true;
}
```

### 4.6 Full Recalculation Pipeline

```javascript
/**
 * Recalculate all derived values
 * Same pipeline as after manual changes
 */
function recalculateNetwork() {
  console.log('[Scenario Manager] Recalculating network...');
  
  // Run full calculation pipeline
  window.propagateADU();           // SCRIPT 500: ADU propagation
  window.calculateCLT();           // SCRIPT 600: CLT calculation
  window.calculateDLT();           // SCRIPT 700: DLT calculation
  window.calculateDeliveryLT();    // SCRIPT 620: Delivery lead time
  window.calculateBufferSizes();   // SCRIPT 400: Buffer sizing
  
  // Update metrics display
  if (window.DDOptim.updateMetricsDisplay) {
    window.DDOptim.updateMetricsDisplay();
  }
  
  console.log('[Scenario Manager] ✓ Network recalculated');
}
```

### 4.7 Load Scenario (Main Workflow)

```javascript
/**
 * Load a scenario by ID
 * Restores baseline, applies modifications, recalculates
 */
function loadScenario(scenarioId) {
  console.log('[Scenario Manager] Loading scenario:', scenarioId);
  
  // 1. Check for unsaved changes
  if (window.DDOptim.scenarios.hasUnsavedChanges) {
    const confirm = window.confirm(
      'You have unsaved changes to the current scenario. ' +
      'Discard changes and load another scenario?'
    );
    if (!confirm) {
      console.log('[Scenario Manager] Load cancelled by user');
      return false;
    }
  }
  
  // 2. Find scenario
  const scenario = window.currentNetwork.scenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    console.error('[Scenario Manager] Scenario not found:', scenarioId);
    alert('Scenario not found: ' + scenarioId);
    return false;
  }
  
  // 3. Restore baseline FIRST
  if (!restoreBaseline()) {
    alert('Failed to restore baseline. Cannot load scenario.');
    return false;
  }
  
  // 4. Apply scenario modifications (if not baseline)
  if (scenarioId !== 'baseline' && scenario.modifications.length > 0) {
    if (!applyScenario(scenario)) {
      alert('Failed to apply scenario modifications.');
      return false;
    }
  }
  
  // 5. Recalculate everything
  recalculateNetwork();
  
  // 6. Update state
  window.DDOptim.scenarios.currentScenarioId = scenarioId;
  window.DDOptim.scenarios.hasUnsavedChanges = false;
  window.currentNetwork.currentScenarioId = scenarioId;
  
  // 7. Update UI
  updateScenarioUI();
  
  // 8. Refresh visualization
  if (window.renderVisualization) {
    window.renderVisualization();
  }
  
  console.log('[Scenario Manager] ✓ Scenario loaded successfully:', scenario.name);
  return true;
}
```

### 4.8 Calculate Scenario Metrics

```javascript
/**
 * Calculate aggregated metrics for current network state
 * Reuses existing metric calculation functions
 */
function calculateScenarioMetrics() {
  const nodes = Array.from(window.currentNetwork.nodes.values());
  
  // Calculate inventory
  const totalInventoryValue = nodes
    .filter(n => n.hasBuffer && n.bufferSizing)
    .reduce((sum, n) => sum + (n.bufferSizing.inventoryValue || 0), 0);
  
  const inventoryByLevel = {
    finished: 0,
    intermediate: 0,
    component: 0,
    purchased: 0
  };
  
  for (const node of nodes) {
    if (node.hasBuffer && node.bufferSizing) {
      const level = getNodeLevel(node.type);
      inventoryByLevel[level] += node.bufferSizing.inventoryValue || 0;
    }
  }
  
  // Calculate service metrics
  const customerNodes = nodes.filter(n => n.independentADU > 0);
  const meetingTolerance = customerNodes.filter(n => 
    n.dlt <= (n.customerTolerance || Infinity)
  ).length;
  const customerToleranceCoverage = customerNodes.length > 0 
    ? (meetingTolerance / customerNodes.length) * 100 
    : 100;
  
  const missingCustomerTolerance = customerNodes
    .reduce((sum, n) => sum + (n.missingCustomerLeadTime || 0), 0);
  
  const avgDLT = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + n.dlt, 0) / nodes.length
    : 0;
  
  const maxDLT = nodes.length > 0
    ? Math.max(...nodes.map(n => n.dlt))
    : 0;
  
  const avgCLT = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + n.clt, 0) / nodes.length
    : 0;
  
  const avgBufferImpact = avgCLT - avgDLT;
  
  // Calculate buffer counts
  const bufferedNodes = nodes.filter(n => n.hasBuffer);
  const bufferCount = bufferedNodes.length;
  
  const buffersByType = {
    finished: 0,
    intermediate: 0,
    component: 0,
    purchased: 0
  };
  
  for (const node of bufferedNodes) {
    const level = getNodeLevel(node.type);
    buffersByType[level]++;
  }
  
  return {
    totalInventoryValue,
    inventoryByLevel,
    customerToleranceCoverage,
    missingCustomerTolerance,
    avgDLT,
    maxDLT,
    avgCLT,
    avgBufferImpact,
    bufferCount,
    buffersByType,
    calculatedAt: new Date().toISOString()
  };
}

function getNodeLevel(nodeType) {
  if (nodeType === 'finished_product') return 'finished';
  if (nodeType === 'intermediate') return 'intermediate';
  if (nodeType === 'machined') return 'component';
  if (nodeType === 'purchased_local' || nodeType === 'purchased_international') return 'purchased';
  return 'component';
}
```

---

## 5. User Interface

### 5.1 Scenario Selector in Controls Bar (DIV 105)

**Location:** Model Selector Bar (DIV 105), after existing model selector

**HTML Structure:**
```html
<div class="scenario-selector">
  <label for="scenario-select">Scenario:</label>
  <select id="scenario-select" class="scenario-dropdown">
    <option value="baseline" selected>📊 Baseline</option>
    <!-- Populated dynamically from window.currentNetwork.scenarios -->
  </select>
  <button id="manage-scenarios-btn" class="btn-secondary" title="Manage scenarios">
    ⚙️ Manage
  </button>
</div>
```

**Styles (add to STYLE 100103):**
```css
.scenario-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 20px;
  padding-left: 20px;
  border-left: 1px solid var(--b2w-neutral-300);
}

.scenario-selector label {
  font-size: 14px;
  color: var(--b2w-neutral-600);
  font-weight: 500;
}

.scenario-dropdown {
  padding: 6px 12px;
  border: 1px solid var(--b2w-neutral-300);
  border-radius: 4px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  min-width: 200px;
  transition: border-color 0.2s;
}

.scenario-dropdown:hover {
  border-color: var(--b2w-primary-500);
}

.scenario-dropdown:focus {
  outline: none;
  border-color: var(--b2w-primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

#manage-scenarios-btn {
  padding: 6px 12px;
  font-size: 14px;
  white-space: nowrap;
}
```

**Behavior:**
- Dropdown populated on model load from `window.currentNetwork.scenarios`
- Baseline shown with 📊 icon, other scenarios with 📋 icon
- Selecting different scenario → calls `loadScenario(scenarioId)`
- "Manage" button → opens Scenario Manager modal

### 5.2 Scenario Manager Modal (Future Phase 2)

**Trigger:** Click "⚙️ Manage" button

**Features:**
- List all scenarios with metrics preview
- Create new scenario (from baseline or clone existing)
- Edit scenario name/description
- Delete scenario (except baseline)
- Compare 2-3 scenarios side-by-side

**Deferred to Phase 2** - focus on core functionality first

---

## 6. Implementation Phases

### Phase 1: Core Data & Baseline Management (Week 1)

**Day 1-2: Data Structures**
- [ ] Define `MODIFIABLE_ATTRIBUTES` constants (SCRIPT 1300)
- [ ] Define `OPERATORS_BY_TYPE` constants
- [ ] Create Scenario object structure in model
- [ ] Ensure baseline scenario in JSON export/import

**Day 3-4: Baseline Management**
- [ ] Implement `captureBaseline()` function
- [ ] Implement `restoreBaseline()` function
- [ ] Call captureBaseline() after model load
- [ ] Test baseline capture/restore with Weber Pignons

**Day 5: Integration**
- [ ] Update SCRIPT 1090 (Unified Model Loader) for scenarios
- [ ] Update SCRIPT 1150 (JSON Export) to include scenarios
- [ ] Update SCRIPT 1160 (JSON Import) to load scenarios
- [ ] Initialize `window.DDOptim.scenarios` state

**Validation:**
- Load model → baseline captured → restore baseline → verify all attributes match

### Phase 2: Scenario Application Engine (Week 2)

**Day 1-2: Node Selection**
- [ ] Implement `selectNodes()` function (SCRIPT 1310)
- [ ] Test with explicit IDs
- [ ] Test with filters
- [ ] Test with union (IDs + filters)
- [ ] Test with empty selector (all nodes)

**Day 3-4: Modification Application**
- [ ] Implement `applyModification()` function (SCRIPT 1320)
- [ ] Test all operators (=, +, -, *, /)
- [ ] Test constraint validation (min values)
- [ ] Test type checking (boolean, enum)

**Day 5: Full Pipeline**
- [ ] Implement `applyScenario()` function (SCRIPT 1330)
- [ ] Implement `recalculateNetwork()` wrapper
- [ ] Implement `loadScenario()` main function (SCRIPT 1340)
- [ ] Test full load scenario workflow

**Validation:**
- Create test scenario with 3 modifications → load → verify transformations applied

### Phase 3: UI Integration (Week 3)

**Day 1-2: Scenario Dropdown**
- [ ] Update DIV 105 HTML with scenario selector
- [ ] Add styles to STYLE 100103
- [ ] Implement `populateScenarioDropdown()` (SCRIPT 1350)
- [ ] Implement `updateScenarioUI()` function
- [ ] Attach onChange event to dropdown

**Day 3-4: Scenario Loading UX**
- [ ] Implement unsaved changes warning
- [ ] Add loading indicator during recalculation
- [ ] Update metrics dashboard after load
- [ ] Refresh visualization after load

**Day 5: Testing & Polish**
- [ ] Test scenario switching with Weber Pignons
- [ ] Test unsaved changes workflow
- [ ] Verify metrics update correctly
- [ ] Check visualization refresh

**Validation:**
- Switch between 3 scenarios → verify UI updates, metrics change, visualization refreshes

### Phase 4: Scenario CRUD (Week 4)

**Day 1-2: Create Scenario**
- [ ] Implement "New Scenario" function
- [ ] Prompt for name/description
- [ ] Validate unique name
- [ ] Initialize empty modifications array
- [ ] Add to scenarios list

**Day 3-4: Edit/Delete Scenarios**
- [ ] Implement "Delete Scenario" function
- [ ] Prevent deleting baseline
- [ ] Implement "Rename Scenario" function
- [ ] Implement "Clone Scenario" function

**Day 5: Scenario Manager Modal (Basic)**
- [ ] Create modal HTML structure
- [ ] List scenarios with metrics
- [ ] Basic CRUD operations in modal
- [ ] Modal styling

**Validation:**
- Create 3 scenarios → delete one → rename one → clone one → verify persistence

### Phase 5: Scenario Comparison (Week 5)

**Day 1-2: Comparison Engine**
- [ ] Implement `calculateScenarioMetrics()` function
- [ ] Store metrics in scenario object
- [ ] Implement delta calculation

**Day 3-4: Comparison UI**
- [ ] Create comparison modal
- [ ] Side-by-side metrics table
- [ ] Delta indicators (▲▼=)
- [ ] Chart visualizations

**Day 5: Export Comparison**
- [ ] Export comparison to CSV
- [ ] Export comparison to JSON
- [ ] Print-friendly comparison view

---

## 7. Testing Strategy

### 7.1 Unit Tests (Diagnostic Blocks)

**DIAGNOSTICS 1300: Baseline Capture/Restore**
```javascript
// Test: Capture baseline
captureBaseline();
const snapshot = window.DDOptim.scenarios.baselineSnapshot;
assert(snapshot !== null);
assert(Object.keys(snapshot).length === 27); // Weber Pignons node count

// Test: Restore baseline
const originalADU = window.currentNetwork.nodes.get('velo').independentADU;
window.currentNetwork.nodes.get('velo').independentADU = 999; // Modify
restoreBaseline();
assert(window.currentNetwork.nodes.get('velo').independentADU === originalADU);
```

**DIAGNOSTICS 1310: Node Selection**
```javascript
// Test: Select by explicit IDs
const nodes = selectNodes(window.currentNetwork, {
  nodeSelector: { nodeIds: ['velo', 'roue'] }
});
assert(nodes.length === 2);
assert(nodes[0].id === 'velo');

// Test: Select by filters
const intlNodes = selectNodes(window.currentNetwork, {
  nodeSelector: {
    filters: [{ column: 'type', operator: 'equals', value: 'purchased_international' }]
  }
});
assert(intlNodes.every(n => n.type === 'purchased_international'));

// Test: Empty selector (all nodes)
const allNodes = selectNodes(window.currentNetwork, { nodeSelector: {} });
assert(allNodes.length === 27);
```

**DIAGNOSTICS 1320: Apply Modification**
```javascript
// Test: Operator =
const node = window.currentNetwork.nodes.get('velo');
applyModification(node, { attribute: 'independentADU', operator: '=', value: 100 });
assert(node.independentADU === 100);

// Test: Operator +
applyModification(node, { attribute: 'independentADU', operator: '+', value: 10 });
assert(node.independentADU === 110);

// Test: Operator *
applyModification(node, { attribute: 'independentADU', operator: '*', value: 2 });
assert(node.independentADU === 220);

// Test: Min constraint
applyModification(node, { attribute: 'leadTime', operator: '=', value: -5 });
assert(node.leadTime === 0); // Clamped to min
```

**DIAGNOSTICS 1330: Apply Complete Scenario**
```javascript
// Test: Multi-modification scenario
const scenario = {
  id: 'test',
  name: 'Test',
  modifications: [
    {
      nodeSelector: { nodeIds: ['velo'] },
      attribute: 'independentADU',
      operator: '=',
      value: 50
    },
    {
      nodeSelector: { nodeIds: ['velo'] },
      attribute: 'customerTolerance',
      operator: '=',
      value: 2
    }
  ]
};

restoreBaseline();
applyScenario(scenario);

const velo = window.currentNetwork.nodes.get('velo');
assert(velo.independentADU === 50);
assert(velo.customerTolerance === 2);
```

### 7.2 Integration Tests

**Test Sequence: Complete Scenario Workflow**
1. Load Weber Pignons model
2. Verify baseline captured (27 nodes)
3. Create "Growth" scenario with 2 modifications
4. Load Growth scenario
5. Verify modifications applied (check specific nodes)
6. Verify metrics updated
7. Switch back to baseline
8. Verify network restored to original state
9. Export JSON
10. Verify scenarios array included
11. Import JSON
12. Verify scenarios restored correctly

**Test: Concurrent Modifications**
1. Create scenario with overlapping modifications:
   - Mod 1: Set all nodes independentADU = 0
   - Mod 2: Set 'velo' independentADU = 100
2. Load scenario
3. Verify: 'velo' has ADU = 100 (last wins)
4. Verify: Other nodes have ADU = 0

### 7.3 Edge Cases

**Case 1: Invalid Node ID**
- Scenario references node 'invalid_id'
- Expected: Warning logged, modification skipped, no crash

**Case 2: Empty Modifications Array**
- Scenario with `modifications: []`
- Expected: Loads successfully, equivalent to baseline

**Case 3: Division by Zero**
- Modification: operator="/", value=0
- Expected: Warning logged, operation skipped

**Case 4: Invalid Operator for Type**
- Modification: boolean attribute with operator "+"
- Expected: Warning logged, modification skipped

**Case 5: Filter Returns Zero Nodes**
- NodeSelector with filter that matches nothing
- Expected: Warning logged, modification applies to 0 nodes (no crash)

---

## 8. Success Metrics

### 8.1 Functional Requirements

**Must Have (Phase 1-3):**
- ✅ Baseline capture and restoration
- ✅ Load scenario from dropdown
- ✅ Apply modifications correctly (all operators)
- ✅ Full network recalculation after load
- ✅ Persist scenarios in JSON export/import
- ✅ Prevent data loss on scenario switch (unsaved changes warning)

**Should Have (Phase 4):**
- Create new scenario
- Delete scenario (except baseline)
- Clone scenario
- Rename scenario

**Nice to Have (Phase 5):**
- Compare 2-3 scenarios side-by-side
- Export comparison report
- Visual delta indicators

### 8.2 Performance Requirements

- Baseline capture: <200ms (for 27 nodes)
- Baseline restoration: <100ms
- Load scenario (3 modifications): <500ms (including recalculation)
- Switch scenarios: <1s total (restore + apply + recalculate + render)

### 8.3 Usability Requirements

- User can switch scenarios in 2 clicks (dropdown + select)
- Unsaved changes warning prevents accidental data loss
- Scenario names clearly visible in UI
- Loading indicator during recalculation
- No UI freeze during scenario loading

---

## 9. Example Scenarios

### Example 1: Growth Scenario

```javascript
{
  id: "scenario_1708012345678_abc123",
  name: "Growth - New Brand Launch",
  description: "50% demand increase for finished goods + aggressive 2-day lead time target",
  isBaseline: false,
  modifications: [
    {
      nodeSelector: {
        filters: [
          { column: "type", operator: "equals", value: "finished_product" }
        ]
      },
      attribute: "independentADU",
      operator: "*",
      value: 1.5,
      label: "+50% demand",
      rationale: "New brand adds 50% volume"
    },
    {
      nodeSelector: {
        filters: [
          { column: "type", operator: "equals", value: "finished_product" }
        ]
      },
      attribute: "customerTolerance",
      operator: "=",
      value: 2,
      label: "2-day tolerance",
      rationale: "Competitive requirement for new brand"
    }
  ],
  created: "2026-02-16T10:00:00Z",
  lastModified: "2026-02-16T10:00:00Z"
}
```

### Example 2: Supplier Improvement

```javascript
{
  id: "scenario_1708012345679_def456",
  name: "International Suppliers Optimization",
  description: "Reduce lead times by 3 days and improve variability profile",
  isBaseline: false,
  modifications: [
    {
      nodeSelector: {
        filters: [
          { column: "type", operator: "equals", value: "purchased_international" }
        ]
      },
      attribute: "leadTime",
      operator: "-",
      value: 3,
      label: "-3 days LT",
      rationale: "Supplier improvement project results"
    },
    {
      nodeSelector: {
        filters: [
          { column: "type", operator: "equals", value: "purchased_international" }
        ]
      },
      attribute: "bufferProfile",
      operator: "=",
      value: "AL",
      label: "Profile AL (Medium)",
      rationale: "Improved reliability → medium variability"
    }
  ],
  created: "2026-02-16T11:00:00Z",
  lastModified: "2026-02-16T11:00:00Z"
}
```

### Example 3: Conservative Inventory

```javascript
{
  id: "scenario_1708012345680_ghi789",
  name: "Conservative Inventory Policy",
  description: "Minimize buffers - only critical semi-finished",
  isBaseline: false,
  modifications: [
    {
      nodeSelector: {},  // Empty = ALL nodes
      attribute: "hasBuffer",
      operator: "=",
      value: false,
      label: "Clear all buffers",
      rationale: "Start from clean slate"
    },
    {
      nodeSelector: {
        nodeIds: ["roue", "e-cadre", "e-guidon"]
      },
      attribute: "hasBuffer",
      operator: "=",
      value: true,
      label: "Strategic buffers only",
      rationale: "Protect critical semi-finished assembly"
    }
  ],
  created: "2026-02-16T12:00:00Z",
  lastModified: "2026-02-16T12:00:00Z"
}
```

---

## 10. Open Questions - RESOLVED

1. **Naming convention des IDs**: `"scenario_" + timestamp + "_" + random` → ✅ **RESOLVED: YES**

2. **Unique name validation**: Empêcher les doublons de noms → ✅ **RESOLVED: YES**

3. **Deep clone strategy**: Utiliser `JSON.parse(JSON.stringify())` pour baseline → ✅ **RESOLVED: YES**

4. **Metrics calculation timing**: Calculer au chargement, pas à la sauvegarde → ✅ **RESOLVED: YES**

5. **Ordre d'application**: Modifications s'appliquent dans l'ordre → ✅ **RESOLVED: YES**

6. **Conflits**: Dernière modification gagne → ✅ **RESOLVED: YES**

7. **Validation**: Valider contraintes après application → ✅ **RESOLVED: YES**

8. **nodeSelector vide**: Aucun nodeIds ni filters → s'applique à TOUS → ✅ **RESOLVED: YES**

9. **Baseline snapshot timing**: Capturer au chargement du model ET quand baseline modifié → ✅ **RESOLVED: Capture uniquement au chargement initial**

10. **Storage**: Scénarios dans JSON model, PAS localStorage → ✅ **RESOLVED: YES**

---

## 11. Implementation Priority

**START HERE (Phase 1 - Week 1):**
1. Create SCRIPT 1300: Constants (MODIFIABLE_ATTRIBUTES, OPERATORS_BY_TYPE)
2. Create SCRIPT 1305: Baseline Management (captureBaseline, restoreBaseline)
3. Update SCRIPT 1090: Initialize scenarios on model load
4. Update SCRIPT 1150/1160: Export/import scenarios array

**Next (Phase 2 - Week 2):**
5. Create SCRIPT 1310: Node Selection (selectNodes)
6. Create SCRIPT 1320: Modification Application (applyModification)
7. Create SCRIPT 1330: Scenario Application (applyScenario)
8. Create SCRIPT 1340: Load Scenario (loadScenario, recalculateNetwork)

**Then (Phase 3 - Week 3):**
9. Update DIV 105: Add scenario dropdown HTML
10. Update STYLE 100103: Scenario selector styles
11. Create SCRIPT 1350: Scenario UI (populateScenarioDropdown, updateScenarioUI)
12. Implement dropdown onChange handler

---

**Document Version:** 2.0  
**Changes from v1.1:**
- Complete redesign with generic modification structure
- Removed localStorage (JSON-only persistence)
- Added baseline snapshot concept
- Added node selector with filter integration
- Added parameterized transformations (operators)
- Added detailed algorithms and code examples
- Added comprehensive testing strategy
- Added concrete scenario examples
- Resolved all open questions

**Status:** Ready for Implementation  
**Next Step:** Begin Phase 1 - Core Data & Baseline Management
