# DDoptim CommWise Application - Design Document Update

**Project:** DDoptim - DDMRP Buffer Positioning Optimizer  
**Platform:** CommWise Web App (Fully Autonomous)  
**Version:** 1.1 (Phase 1 MVP - In Development)  
**Date:** February 4, 2025  
**App ID:** 13866  
**URL:** https://commwise.b2wise.com/mcp-c3-ddoptim-buffer-positioning-optimizer

---

## IMPLEMENTATION STATUS UPDATE

### Phase 1: MVP (Core Functionality) - IN PROGRESS

**Completed Features (As of Feb 4, 2025):**

#### ✅ Network Visualization (Week 2)
- **Network graph rendering** using D3.js hierarchical tree layout
- **Node coloring by type:**
  - Finished Product: Blue (#3b82f6)
  - Intermediate: Green (#10b981)
  - Machined: Grey (#6b7280)
  - Purchased Local: Orange (#f59e0b)
  - Purchased International: Red (#ef4444)
- **Buffer status visual indicators:**
  - Trapezoid icon (30px wide top, 21px bottom, 20px height)
  - Three color bands (red/yellow/green zones)
  - Positioned at top-right corner of buffered nodes
  - Only visible when `hasBuffer: true`
- **Pan and zoom controls** (mouse drag and wheel)
- **Node selection** (click to highlight and open detail panel)

#### ✅ Model Library & Selector (Week 1-2)
- **4 Pre-built Models:**
  1. **Simple Chain** (3 nodes) - Linear supply chain: Supplier → Manufacturer → Customer
  2. **Simple Assembly** (3 nodes) - Convergent BOM: 2 Components → Assembly
  3. **Simple Distribution** (3 nodes) - Divergent: Source → 2 Customers
  4. **Weber Pignons** (27 nodes) - Full bicycle assembly case study
- **Model Selector UI:**
  - Dropdown menu with model descriptions
  - "Load Model" button
  - Status indicator showing load success/failure
  - Node count display
- **Model Data Structure:**
  - SCRIPT 1050-1080: Model library storage
  - SCRIPT 200: Weber Pignons network definition
  - Automatic format normalization (Array → Map)
  - Global `window.currentNetwork` for active model

#### ✅ Core Algorithms (Week 1)
- **ADU Propagation:** Top-down through BOM (SCRIPT 500)
  - Independent ADU (direct customer demand)
  - Calculated ADU (independent + dependent from parents)
  - Seasonal adjustment support
  - Spare parts demand integration
- **CLT Calculator:** Bottom-up cumulative lead time (SCRIPT 600)
  - Longest path from raw materials
  - Independent of buffer positioning
  - Baseline metric for comparison
- **DLT Calculator:** Bottom-up decoupled lead time (SCRIPT 600)
  - Resets at buffer positions
  - Used for buffer sizing (Yellow = ADU × DLT)
  - Recalculated on buffer changes

#### ✅ Buffer Control Panel (Week 3)
- **Node Details Display:**
  - Basic Information (Name, Type, Lead Time, Buffer Profile)
  - Buffer Status (Buffered/Not Buffered with visual indicator)
  - Constraints (MOQ, Order Cycle if applicable)
  - Demand Information (Calculated ADU, Customer Tolerance)
  - Economics (Unit Cost)
- **Panel Behavior:**
  - Opens on node click
  - Close button (X icon)
  - Collapsible sidebar
  - Reads from `window.currentNetwork` (works with model selector)
  - Handles both Map and Object node formats

#### ⚠️ Partially Implemented
- **Buffer Controls:**
  - UI elements present but not yet functional
  - Checkbox for "Add Strategic Buffer"
  - Profile dropdown (F, I, U, AL, AI)
  - MOQ/Cycle inputs
  - Rationale textarea
  - **TODO:** Connect to state management and trigger recalculations

---

## 2. UPDATED USER INTERFACE DESIGN

### 2.1 Current Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: DDoptim - Buffer Positioning Optimizer                     │
│ [Model Selector ▼: Weber Pignons] [Load Model] Status: ✓ Loaded    │
├───────────────────────────────────┬─────────────────────────────────┤
│                                   │                                 │
│  Network Visualization            │  Node Detail Panel              │
│  (Main area, 70% width)           │  (Right sidebar, 30% width)     │
│                                   │  [Collapsed by default]         │
│  - Hierarchical tree layout       │                                 │
│  - Color-coded nodes by type      │  When node selected:            │
│  - Buffer trapezoid icons         │  ┌──────────────────────────┐  │
│  - Pan/zoom enabled               │  │ [X] Close                │  │
│                                   │  ├──────────────────────────┤  │
│  Legend:                          │  │ Basic Information        │  │
│  ● Blue = Finished Product        │  │ - Name: Roue             │  │
│  ● Green = Intermediate           │  │ - Type: Intermediate     │  │
│  ● Grey = Machined                │  │ - Lead Time: 4 days      │  │
│  ● Orange = Purchased Local       │  │ - Profile: I             │  │
│  ● Red = Purchased Intl           │  ├──────────────────────────┤  │
│  🔺 = Buffered (RYG trapezoid)    │  │ Buffer Status            │  │
│                                   │  │ ● Not Buffered           │  │
│                                   │  ├──────────────────────────┤  │
│                                   │  │ Constraints              │  │
│                                   │  │ - MOQ: 200 units         │  │
│                                   │  ├──────────────────────────┤  │
│                                   │  │ Demand Information       │  │
│                                   │  │ - ADU: 104 units/day     │  │
│                                   │  ├──────────────────────────┤  │
│                                   │  │ Economics                │  │
│                                   │  │ - Unit Cost: €XX.XX      │  │
│                                   │  └──────────────────────────┘  │
│                                   │                                 │
└───────────────────────────────────┴─────────────────────────────────┘
```

### 2.2 Model Selector Component

**Location:** Header bar (DIV 100)

**Visual Design:**
```html
<div class="model-selector-container">
  <label for="modelSelect">Select Model:</label>
  <select id="modelSelect">
    <option value="">-- Choose a model --</option>
    <option value="simple_chain">Simple Chain (3 nodes)</option>
    <option value="simple_assembly">Simple Assembly (3 nodes)</option>
    <option value="simple_distribution">Simple Distribution (3 nodes)</option>
    <option value="weber_pignons">Weber Pignons (27 nodes)</option>
  </select>
  <button id="loadModelBtn" class="btn-primary">Load Model</button>
  <span id="modelStatus" class="model-status"></span>
</div>
```

**Behavior:**
- Default: No model selected, "-- Choose a model --" placeholder
- On selection: Button remains enabled
- On click "Load Model":
  - Status shows "Loading Weber Pignons..."
  - Model data fetched from window globals
  - Format normalized (Array/Object → Map)
  - ADU/CLT/DLT calculations performed
  - Network rendered with hierarchical layout
  - Status updates: "✓ Loaded: Weber Pignons (27 nodes)" (green text)
  - Previous model state completely replaced
- Error handling: "Model not found!" (red text) if data unavailable

**Implementation:**
- Event handler: SCRIPT 1100
- Model library: SCRIPT 1050-1080
- Format normalization: Converts arrays/objects to Map format
- Global state: `window.currentNetwork` updated on each load

### 2.3 Buffer Icon Visualization

**Purpose:** Visual indicator showing which nodes have strategic buffers positioned

**Design Specifications:**

**Shape:** Trapezoid
- Top width: 30px
- Bottom width: 21px  
- Height: 20px
- Position: Top-right corner of node (5px from right, 3px from top)

**Color Zones (three bands, each 1/3 height):**
```
┌──────────────────────┐  ← Top (Green Zone)
│    GREEN (#10b981)   │    Fill: #10b981
│   Stroke: #065f46    │    Stroke: #065f46 (1px)
├──────────────────────┤  
│   YELLOW (#fbbf24)   │  ← Middle (Yellow Zone)
│   Stroke: #92400e    │    Fill: #fbbf24
├──────────────────────┤    Stroke: #92400e (1px)
│     RED (#ef4444)    │  ← Bottom (Red Zone)
│   Stroke: #991b1b    │    Fill: #ef4444
└──────────────────────┘    Stroke: #991b1b (1px)
```

**Visibility Logic:**
```javascript
// Icon only renders when node.hasBuffer === true
if (node.hasBuffer) {
  addBufferIcon(nodeGroup, node);
}
```

**SVG Path Geometry:**
```javascript
// Trapezoid with wider top, narrower bottom
const trapezoidPath = `
  M ${iconX} ${iconY}                          // Top-left
  L ${iconX + iconWidth} ${iconY}              // Top-right
  L ${iconX + bottomWidth} ${iconY + iconHeight}  // Bottom-right
  L ${iconX + topOffset} ${iconY + iconHeight}    // Bottom-left
  Z
`;
```

**Implementation:**
- Location: SCRIPT 800 (NetworkRenderer)
- Function: `addBufferIcon(nodeGroup, node)`
- Integrated into render pipeline after node creation
- Re-renders when network updated

**User Experience:**
1. By default, no nodes show buffer icons (all `hasBuffer: false`)
2. When user toggles buffer ON for a node:
   - Trapezoid icon appears instantly at top-right
   - Three color bands visible (DDMRP red/yellow/green zones)
   - Icon persists across pan/zoom operations
3. When buffer toggled OFF:
   - Icon disappears immediately
   - Node returns to standard appearance

### 2.4 Node Detail Panel (Right Sidebar)

**Trigger:** Click any node in network visualization

**Panel Structure:**

```
┌───────────────────────────────────┐
│ [X] Close                         │ ← Close button
├───────────────────────────────────┤
│ ■ Basic Information               │ ← Section header
│   Name: Roue                      │
│   Type: [Intermediate]            │ ← Colored badge
│   Lead Time: 4 days               │
│   Buffer Profile: I               │
├───────────────────────────────────┤
│ ■ Buffer Status                   │
│   Status: ● Not Buffered          │ ← Visual indicator
│   (or)                            │
│   Status: ● Buffered              │
│   Rationale: "Protects wheel..."  │
├───────────────────────────────────┤
│ ■ Constraints                     │
│   MOQ: 200 units                  │
│   Order Cycle: 0 days             │
├───────────────────────────────────┤
│ ■ Demand Information              │
│   Calculated ADU: 104.0 units/day │
│   Customer Tolerance: N/A         │
├───────────────────────────────────┤
│ ■ Economics                       │
│   Unit Cost: €XX.XX               │
└───────────────────────────────────┘
```

**Section Visibility Logic:**
- Basic Information: Always visible
- Buffer Status: Always visible
- Constraints: Only if MOQ > 0 or orderCycle > 0
- Demand Information: Only if calculatedADU > 0 or customerTolerance exists
- Economics: Only if unitCost exists

**Data Source:**
```javascript
// Always reads from global state (updated by model selector)
const currentNetwork = window.currentNetwork;

// Handles both Map and Object formats
const node = currentNetwork.nodes.get 
  ? currentNetwork.nodes.get(nodeId) 
  : currentNetwork.nodes[nodeId];
```

**Implementation:**
- Location: SCRIPT 900 (UIHandlers)
- Function: `showNodeDetails(nodeId)`
- Format handling: Works with Map or Object node storage
- Panel open/close: CSS class toggle `.open`
- Close button: `closeDetailPanel()` function

**Type Badges (Color-coded):**
```css
.type-badge.finished-product    { background: #3b82f6; } /* Blue */
.type-badge.intermediate        { background: #10b981; } /* Green */
.type-badge.machined            { background: #6b7280; } /* Grey */
.type-badge.purchased-local     { background: #f59e0b; } /* Orange */
.type-badge.purchased-international { background: #ef4444; } /* Red */
```

**Buffer Status Indicators:**
```html
<!-- Not Buffered -->
<span class="buffer-status unbuffered">
  <span class="buffer-status-icon"></span> Not Buffered
</span>

<!-- Buffered -->
<span class="buffer-status buffered">
  <span class="buffer-status-icon"></span> Buffered
</span>
```

---

## 3. TECHNICAL IMPLEMENTATION DETAILS

### 3.1 Network Rendering Pipeline

**Step-by-step process when model loaded:**

1. **Model Selection** (User clicks "Load Model")
   - Event: SCRIPT 1100 listener fires
   - Action: Fetch model data from window globals

2. **Format Normalization**
   ```javascript
   function normalizeModel(modelData) {
     // Convert Array or Object to Map
     if (Array.isArray(modelData.nodes)) {
       const nodesMap = new Map();
       modelData.nodes.forEach(node => nodesMap.set(node.id, node));
       return { ...modelData, nodes: nodesMap };
     }
     // ... similar for Object format
   }
   ```

3. **Global State Update**
   ```javascript
   window.currentNetwork = normalizedModel;
   ```

4. **Algorithm Execution** (Automatic)
   - ADU Propagation: SCRIPT 500 `propagateADU()`
   - CLT Calculation: SCRIPT 600 `calculateCLT()`
   - DLT Calculation: SCRIPT 600 `calculateDLT()`

5. **Network Rendering** (SCRIPT 800)
   ```javascript
   NetworkRenderer.render(normalizedModel);
   ```

6. **Visualization Steps:**
   - Hierarchy preparation (D3 tree layout)
   - Node creation (SVG circles with labels)
   - Edge creation (BOM relationship lines)
   - **Buffer icon overlay** (for buffered nodes)
   - Zoom/pan behavior initialization
   - Click handlers for selection

### 3.2 Buffer Icon Integration

**Render Function Excerpt (SCRIPT 800):**

```javascript
render(network) {
  // ... node creation logic ...
  
  // Create node groups
  const nodeEnter = node.enter()
    .append('g')
    .attr('class', d => `node ${d.data.type}`)
    .on('click', (event, d) => selectNode(d.data.id));
  
  // Add circles
  nodeEnter.append('circle')
    .attr('r', 20)
    .attr('fill', d => getNodeColor(d.data.type));
  
  // Add labels
  nodeEnter.append('text')
    .attr('dy', 3)
    .attr('text-anchor', 'middle')
    .text(d => d.data.name);
  
  // ⭐ ADD BUFFER ICONS ⭐
  const bufferedNodes = network.nodes 
    ? Array.from(network.nodes.values()).filter(n => n.hasBuffer)
    : [];
  
  bufferedNodes.forEach(node => {
    const nodeGroup = svg.select(`.node-${node.id}`);
    if (!nodeGroup.empty()) {
      addBufferIcon(nodeGroup, node);
    }
  });
}

function addBufferIcon(nodeGroup, node) {
  const iconWidth = 30;
  const iconHeight = 20;
  const iconX = 15;   // 5px from right edge of 40px circle
  const iconY = -17;  // 3px from top
  
  // Green zone (top third)
  nodeGroup.append('path')
    .attr('d', /* trapezoid top band */)
    .attr('fill', '#10b981')
    .attr('stroke', '#065f46');
  
  // Yellow zone (middle third)
  nodeGroup.append('path')
    .attr('d', /* trapezoid middle band */)
    .attr('fill', '#fbbf24')
    .attr('stroke', '#92400e');
  
  // Red zone (bottom third)
  nodeGroup.append('path')
    .attr('d', /* trapezoid bottom band */)
    .attr('fill', '#ef4444')
    .attr('stroke', '#991b1b');
}
```

### 3.3 Node Selection Flow

**User clicks node → Detail panel opens:**

1. **Click Event** (SCRIPT 800)
   ```javascript
   .on('click', (event, d) => selectNode(d.data.id));
   ```

2. **Selection Handler** (SCRIPT 800)
   ```javascript
   function selectNode(nodeId) {
     // Highlight node visually
     // Trigger global callback
     if (window.DDoptim && window.DDoptim.onNodeSelect) {
       window.DDoptim.onNodeSelect(nodeId);
     }
   }
   ```

3. **Global Callback** (SCRIPT 900)
   ```javascript
   window.DDoptim.onNodeSelect = (nodeId) => {
     showNodeDetails(nodeId);
   };
   ```

4. **Panel Rendering** (SCRIPT 900)
   ```javascript
   function showNodeDetails(nodeId) {
     const currentNetwork = window.currentNetwork;
     const node = currentNetwork.nodes.get 
       ? currentNetwork.nodes.get(nodeId)
       : currentNetwork.nodes[nodeId];
     
     // Build HTML sections
     // Open panel
     panel.classList.add('open');
   }
   ```

---

## 4. DATA STRUCTURES

### 4.1 Node Object Structure

**Complete Node Definition:**

```javascript
{
  // Identity
  id: "string",                    // Unique identifier (e.g., "roue", "velo", "plateau")
  name: "string",                  // Display name (e.g., "Roue", "Vélo", "Plateau")
  
  // Classification
  type: "finished_product" | "intermediate" | "machined" | 
        "purchased_local" | "purchased_international",
  
  // BOM Relationships (Links)
  parents: [                       // Products that use this component
    { 
      nodeId: "string",           // Parent node ID
      quantity: number             // Units per parent (e.g., 2 wheels per bike)
    }
  ],
  
  // Lead Time & Operational Data
  leadTime: number,                // Days (procurement/manufacturing/assembly time)
  
  // Customer-Facing Attributes (Finished Goods Only)
  customerTolerance: number,       // Days - maximum acceptable lead time
  visibilityHorizon: number,       // Days - how far ahead orders are visible (optional)
  
  // Demand Data
  independentADU: number,          // Direct customer demand (finished goods + spare parts)
                                   // Non-zero for: finished products, spare parts
                                   // Zero for: pure intermediate components
  
  // Buffer Profile Assignment
  bufferProfile: "F" | "I" | "U" | "AL" | "AI" | null,
  
  // Constraints
  moq: number,                     // Minimum order quantity (default 0)
  orderCycle: number,              // Ordering frequency in days (default 0, e.g., 30 for monthly)
  
  // Economics
  unitCost: number,                // Currency (€)
  
  // Buffer Status (User-Controlled)
  hasBuffer: boolean,              // User decision: buffer this node or not
  bufferRationale: "string",       // Why this buffer exists (user notes)
  
  // Calculated Values (Runtime - Auto-Computed)
  calculatedADU: number,           // Total ADU = independentADU + Σ(parent.calculatedADU × qty)
  clt: number,                     // Cumulative Lead Time: longest path from raw materials
  dlt: number,                     // Decoupled Lead Time: longest path from buffers
  
  bufferSizing: {                  // DDMRP buffer zones (calculated when hasBuffer=true)
    yellow: number,                // Lead time demand (ADU × DLT)
    green: number,                 // Order size (max of delay/MOQ/cycle)
    red: number,                   // Safety stock (base + security)
    topOfYellow: number,           // Red + Yellow
    topOfGreen: number,            // Red + Yellow + Green
    averageStock: number,          // Top of Yellow + (Green / 2)
    inventoryValue: number         // Average Stock × Unit Cost
  }
}
```

**Example Node (Weber Pignons - Roue/Wheel):**

```javascript
{
  id: "roue",
  name: "Roue",
  type: "intermediate",
  parents: [
    { nodeId: "velo", quantity: 2 }  // 2 wheels per bike
  ],
  leadTime: 4,                       // 4 days wheel assembly
  customerTolerance: null,           // Not a finished product
  visibilityHorizon: null,
  independentADU: 0,                 // Not sold separately (pure intermediate)
  bufferProfile: "I",                // Intermediate profile
  moq: 200,                          // Minimum order: 200 wheels
  orderCycle: 0,                     // No cycle constraint
  unitCost: 50.00,                   // €50 per wheel
  hasBuffer: true,                   // Strategic buffer positioned here
  bufferRationale: "Protects wheel assembly bottleneck (2 per bike, many components, skilled labor)",
  
  // Calculated at runtime
  calculatedADU: 104,                // 52 bikes/day × 2 wheels = 104 wheels/day (summer)
  clt: 34,                           // 4 (wheel) + 30 (tire lead time) = 34 days
  dlt: 4,                            // Buffer decouples: only wheel assembly time
  
  bufferSizing: {
    yellow: 416,                     // 104 ADU × 4 DLT
    green: 208,                      // max(208 delay, 200 MOQ, 0 cycle)
    red: 260,                        // 208 base + 52 security
    topOfYellow: 676,                // 260 + 416
    topOfGreen: 884,                 // 260 + 416 + 208
    averageStock: 780,               // 676 + (208/2)
    inventoryValue: 39000            // 780 × €50
  }
}
```

### 4.2 Node Type Definitions

**Five Node Types with Distinct Characteristics:**

| Type | Purpose | Typical Lead Times | Buffer Profiles | Color Code | Examples (Weber Pignons) |
|------|---------|-------------------|-----------------|------------|--------------------------|
| `finished_product` | Customer-facing end products | 2-5 days | F | Blue (#3b82f6) | Vélo (bike) |
| `intermediate` | Semi-finished subassemblies | 2-7 days | I | Green (#10b981) | Roue, E-Cadre, E-Guidon, E-Selle |
| `machined` | Internal manufacturing | 8-15 days | U | Grey (#6b7280) | Plateau, Pignon, Chaine |
| `purchased_local` | Local suppliers | 2-7 days | AL | Orange (#f59e0b) | Cadre, Pédalier, Freins |
| `purchased_international` | International suppliers | 10-30 days | AI | Red (#ef4444) | Rayons, Pneus, Jantes |

**Key Distinctions:**

- **finished_product:** Always has `customerTolerance`, typically has `independentADU` > 0
- **intermediate:** Never has `customerTolerance`, typically `independentADU` = 0 (not sold separately)
- **machined:** May have `independentADU` > 0 if sold as spare parts
- **purchased_local/international:** Leaf nodes with no children, typically `independentADU` = 0

### 4.3 BOM Relationships (Links)

**Parent-Child Structure:**

Links are stored **inside child nodes** via the `parents` array:

```javascript
// Child node perspective
{
  id: "rayons",              // Spokes (child)
  parents: [
    { 
      nodeId: "roue",        // Wheel (parent)
      quantity: 72           // 72 spokes per wheel
    }
  ]
}
```

**Multiple Parents (Shared Components):**

```javascript
// Component used in multiple products
{
  id: "plateau",             // Chainring
  parents: [
    { nodeId: "velo", quantity: 1 },           // 1 per bike
    { nodeId: "velo_sport", quantity: 2 }      // 2 per sport bike (if multiple products)
  ]
}
```

**Convergent Assembly (Multiple Components → One Product):**

```javascript
// Wheel assembly requires multiple components
{
  id: "roue",
  type: "intermediate",
  // Roue has NO parents array entry for its components
  // Instead, its components have roue as their parent:
}

// Components reference the wheel
{ id: "rayons", parents: [{ nodeId: "roue", quantity: 72 }] }
{ id: "pneu", parents: [{ nodeId: "roue", quantity: 1 }] }
{ id: "jante", parents: [{ nodeId: "roue", quantity: 1 }] }
```

**D3 Hierarchical Layout Conversion:**

For visualization, the parent-child structure is inverted:

```javascript
// Runtime conversion (SCRIPT 800)
function prepareHierarchy(network) {
  // Build parent → children map
  const childrenMap = new Map();
  
  network.nodes.forEach((node, nodeId) => {
    if (node.parents && node.parents.length > 0) {
      node.parents.forEach(parent => {
        if (!childrenMap.has(parent.nodeId)) {
          childrenMap.set(parent.nodeId, []);
        }
        childrenMap.get(parent.nodeId).push({
          ...node,
          quantity: parent.quantity
        });
      });
    }
  });
  
  // Create D3 hierarchy with children arrays
  // Root = finished product, branches = components
}
```

### 4.4 Buffer Profile Structure

**Profile Definition:**

```javascript
{
  name: "string",                  // "F", "I", "U", "AL", "AI", or custom
  description: "string",           // Human-readable description
  
  // DLT Thresholds (determine lead time factor)
  dlt_threshold_short: number,     // If DLT ≤ this → short category
  dlt_threshold_medium: number,    // If DLT ≤ this → medium category
  // If DLT > medium → long category
  
  // Lead Time Factors (by DLT category)
  leadTimeFactor_short: number,    // Typically 0.7
  leadTimeFactor_medium: number,   // Typically 0.5
  leadTimeFactor_long: number,     // Typically 0.25
  
  // Variability Factor (combined supply/demand)
  variabilityFactor: number        // 0.25 (Low), 0.5 (Medium), 0.7 (High)
}
```

**Default Profiles (Weber Pignons):**

```javascript
const DEFAULT_PROFILES = {
  F: {  // Fabriqués (Manufactured/Finished)
    name: "F",
    description: "Fabriqués (Manufactured/Finished)",
    dlt_threshold_short: 1,
    dlt_threshold_medium: 3,
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    variabilityFactor: 0.25        // Low variability
  },
  
  I: {  // Intermédiaires (Semi-finished)
    name: "I",
    description: "Intermédiaires (Semi-finished)",
    dlt_threshold_short: 1,
    dlt_threshold_medium: 3,
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    variabilityFactor: 0.25        // Low variability
  },
  
  U: {  // Usinés (Machined)
    name: "U",
    description: "Usinés (Machined)",
    dlt_threshold_short: 1,
    dlt_threshold_medium: 5,
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    variabilityFactor: 0.5         // Medium variability
  },
  
  AL: {  // Achetés Local (Purchased Local)
    name: "AL",
    description: "Achetés Local (Purchased Local)",
    dlt_threshold_short: 1,
    dlt_threshold_medium: 3,
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    variabilityFactor: 0.5         // Medium variability
  },
  
  AI: {  // Achetés International (Purchased International)
    name: "AI",
    description: "Achetés International",
    dlt_threshold_short: 1,
    dlt_threshold_medium: 5,
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    variabilityFactor: 0.7         // High variability
  }
};
```

**Usage in Buffer Sizing:**

```javascript
// Determine lead time factor based on DLT
function getLeadTimeFactor(dlt, profile) {
  if (dlt <= profile.dlt_threshold_short) {
    return profile.leadTimeFactor_short;    // 0.7
  } else if (dlt <= profile.dlt_threshold_medium) {
    return profile.leadTimeFactor_medium;   // 0.5
  } else {
    return profile.leadTimeFactor_long;     // 0.25
  }
}

// Example: Roue with DLT=4, Profile I
// 4 > 1 (short), 4 > 3 (medium) → long category → 0.25
```

### 4.5 Network Object Structure

**Top-Level Network Container:**

```javascript
{
  metadata: {
    name: "string",              // Model name (e.g., "Weber Pignons Case Study")
    description: "string",       // Purpose/context
    version: "string",           // Version number
    created: "ISO timestamp",    // Creation date
    nodeCount: number            // Total nodes in network
  },
  
  nodes: Map<nodeId, NodeObject>,    // All nodes (Map format for efficient lookup)
  
  profiles: Map<profileName, ProfileObject>  // Buffer profiles (F, I, U, AL, AI)
}
```

**Storage Format Options:**

The application handles three formats automatically:

1. **Map Format** (preferred for runtime):
```javascript
{
  nodes: Map<nodeId, NodeObject>,
  profiles: Map<profileName, ProfileObject>
}
```

2. **Array Format** (common in JSON):
```javascript
{
  nodes: [NodeObject, NodeObject, ...],
  profiles: [ProfileObject, ProfileObject, ...]
}
```

3. **Object Format** (alternative JSON):
```javascript
{
  nodes: { nodeId: NodeObject, ... },
  profiles: { profileName: ProfileObject, ... }
}
```

**Normalization Function** (SCRIPT 1100):

```javascript
function normalizeModel(modelData) {
  // If nodes is already a Map, return as-is
  if (modelData.nodes instanceof Map) {
    return modelData;
  }
  
  // If nodes is an array, convert to Map
  if (Array.isArray(modelData.nodes)) {
    const nodesMap = new Map();
    modelData.nodes.forEach(node => {
      nodesMap.set(node.id, node);
    });
    return { ...modelData, nodes: nodesMap };
  }
  
  // If nodes is an object, convert to Map
  if (typeof modelData.nodes === 'object') {
    const nodesMap = new Map();
    Object.entries(modelData.nodes).forEach(([id, node]) => {
      nodesMap.set(id, node);
    });
    return { ...modelData, nodes: nodesMap };
  }
  
  return modelData;
}
```

### 4.6 Example: Weber Pignons Network Structure

**High-Level Overview:**

```
Network: 27 nodes organized in 4 levels

Level 1 (Finished Product):
  └─ velo (1 node)

Level 2 (Semi-Finished):
  ├─ roue (quantity: 2)
  ├─ e_cadre (quantity: 1)
  ├─ e_guidon (quantity: 1)
  └─ e_selle (quantity: 1)

Level 3 (Components):
  Roue children (4):
    ├─ rayons (quantity: 72)
    ├─ pneu (quantity: 1)
    ├─ jante (quantity: 1)
    └─ valve (quantity: 1)
  
  E-Cadre children (2):
    ├─ cadre (quantity: 1)
    └─ pedalier (quantity: 1)
  
  E-Guidon children (3):
    ├─ guidon (quantity: 1)
    ├─ poignee (quantity: 2)
    └─ frein (quantity: 2)
  
  E-Selle children (2):
    ├─ selle (quantity: 1)
    └─ tige (quantity: 1)
  
  Velo direct children (3):
    ├─ plateau (quantity: 1)
    ├─ pignon (quantity: 1)
    └─ chaine (quantity: 1)

Level 4 (Raw Materials):
  Plateau children (4):
    ├─ plaque_int (quantity: 1)
    ├─ douille (quantity: 1)
    ├─ axe (quantity: 1)
    └─ rouleau (quantity: 1)
```

**ADU Propagation Example (Summer, 1.3 adjustment):**

```javascript
// Level 1: Finished Product
velo.independentADU = 40 × 1.3 = 52
velo.calculatedADU = 52              // No parents

// Level 2: Semi-Finished
roue.independentADU = 0              // Not sold separately
roue.calculatedADU = 52 × 2 = 104    // From velo

e_cadre.calculatedADU = 52 × 1 = 52
e_guidon.calculatedADU = 52 × 1 = 52
e_selle.calculatedADU = 52 × 1 = 52

// Level 3: Components (wheel parts)
rayons.calculatedADU = 104 × 72 = 7,488
pneu.calculatedADU = 104 × 1 = 104
jante.calculatedADU = 104 × 1 = 104

// Machined parts (with spare parts)
plateau.independentADU = 40 × 1.3 × 0.05 = 2.6  // 5% spare parts
plateau.calculatedADU = 2.6 + (52 × 1) = 54.6

pignon.calculatedADU = 2.6 + 52 = 54.6
chaine.calculatedADU = 2.6 + 52 = 54.6
```

### 4.7 Data Access Patterns

**Reading Node Data:**

```javascript
// Get node by ID (handles Map or Object format)
const node = network.nodes.get 
  ? network.nodes.get(nodeId) 
  : network.nodes[nodeId];

// Iterate all nodes
if (network.nodes instanceof Map) {
  network.nodes.forEach((node, nodeId) => { ... });
} else {
  Object.entries(network.nodes).forEach(([nodeId, node]) => { ... });
}

// Get node count
const count = network.nodes.size || Object.keys(network.nodes).length;
```

**Updating Node Data:**

```javascript
// Update buffer status
const node = network.nodes.get(nodeId);
node.hasBuffer = true;
node.bufferRationale = "Protects bottleneck";

// Trigger recalculations
DLTCalculator.calculateDLT(network.nodes);
BufferSizingCalculator.calculate(node, profile);
```

**Traversing BOM Relationships:**

```javascript
// Get all children of a node
function getChildren(nodeId, network) {
  const children = [];
  network.nodes.forEach(node => {
    if (node.parents) {
      const parentRef = node.parents.find(p => p.nodeId === nodeId);
      if (parentRef) {
        children.push({ node, quantity: parentRef.quantity });
      }
    }
  });
  return children;
}

// Get all parents of a node
function getParents(node, network) {
  return (node.parents || []).map(p => ({
    node: network.nodes.get(p.nodeId),
    quantity: p.quantity
  }));
}
```

---

## 5. MODEL LIBRARY SPECIFICATIONS

### 4.1 Available Models

#### Model 1: Simple Chain (3 nodes)
**Purpose:** Demonstrate linear supply chain  
**Structure:** Raw Material → Manufacturer → Customer  
**Use Case:** Basic lead time accumulation, single buffer positioning

**Nodes:**
- raw_material (purchased_international, 10 days)
- manufacturer (intermediate, 5 days)
- finished_product (finished_product, 2 days)

**Storage:** SCRIPT 1050

---

#### Model 2: Simple Assembly (3 nodes)
**Purpose:** Demonstrate convergent BOM  
**Structure:** 2 Components → Assembly  
**Use Case:** Multiple buffer candidates, assembly protection

**Nodes:**
- component_a (purchased_local, 7 days)
- component_b (purchased_international, 15 days)
- assembly (finished_product, 3 days, uses 1 of each component)

**Storage:** SCRIPT 1060

---

#### Model 3: Simple Distribution (3 nodes)
**Purpose:** Demonstrate divergent structure  
**Structure:** Source → 2 Customers  
**Use Case:** Shared component, multiple customer tolerances

**Nodes:**
- source (intermediate, 10 days)
- customer_a (finished_product, 2 days)
- customer_b (finished_product, 5 days)

**Storage:** SCRIPT 1070

---

#### Model 4: Weber Pignons (27 nodes)
**Purpose:** Full bicycle assembly case study  
**Structure:** Multi-level BOM with 5 node types  
**Use Case:** Complete DDMRP buffer positioning analysis

**Node Breakdown:**
- 1 Finished Product (Vélo)
- 4 Semi-Finished (Roue, E-Cadre, E-Guidon, E-Selle)
- 3 Machined Parts (Plateau, Pignon, Chaine)
- 7 Purchased Local (Cadre, Pédalier, Freins, etc.)
- 12 Purchased International (Rayons, Pneus, Jantes, etc.)

**Key Characteristics:**
- Customer Tolerance: 5 days (SUPERVELO)
- ADU: 40 bikes/day baseline (seasonal adjusted)
- Convergent assembly: Multiple components → subassemblies → final bike
- High variability: International suppliers (15-30 day lead times)
- Bottleneck: Wheel assembly (2 per bike, many components, skilled labor)
- Spare parts: Machined parts have independent demand (+5%)

**Storage:** SCRIPT 200 (WEBER_PIGNONS_NETWORK) + SCRIPT 1080 (MODEL wrapper)

---

## 5. DATA FLOW ARCHITECTURE

### 5.1 State Management

**Global State Variables:**

```javascript
// Primary network data (active model)
window.currentNetwork = {
  metadata: { name, description, version },
  nodes: Map<nodeId, NodeObject>,
  profiles: Map<profileName, ProfileObject>
};

// Model library
window.SIMPLE_CHAIN_MODEL = { ... };
window.SIMPLE_ASSEMBLY_MODEL = { ... };
window.SIMPLE_DISTRIBUTION_MODEL = { ... };
window.WEBER_PIGNONS_MODEL = { ... };
window.WEBER_PIGNONS_NETWORK = { ... };  // Raw network data

// Callback for node selection
window.DDoptim = {
  onNodeSelect: (nodeId) => { ... }
};
```

### 5.2 Module Communication

**Pattern:** Global state + callback functions

```
Model Selector (SCRIPT 1100)
  ↓ Load model
  ↓ Normalize format
  ↓ Update window.currentNetwork
  ↓
Algorithm Modules (SCRIPT 500, 600)
  ↓ Read window.currentNetwork.nodes
  ↓ Calculate ADU/CLT/DLT
  ↓ Write back to node objects
  ↓
Network Renderer (SCRIPT 800)
  ↓ Read window.currentNetwork
  ↓ Render visualization
  ↓ Add buffer icons
  ↓ Setup click handlers
  ↓
Node Selection (SCRIPT 800 → 900)
  ↓ Fire window.DDoptim.onNodeSelect(nodeId)
  ↓
UI Handlers (SCRIPT 900)
  ↓ Read window.currentNetwork
  ↓ Get node by ID
  ↓ Render detail panel
```

---

## 6. PENDING FEATURES (Phase 1 Completion)

### 6.1 Buffer Controls (Week 3 - TODO)

**Functional Requirements:**
- [ ] Toggle buffer checkbox updates `node.hasBuffer`
- [ ] Profile dropdown updates `node.bufferProfile`
- [ ] MOQ input updates `node.moq`
- [ ] Order Cycle input updates `node.orderCycle`
- [ ] Rationale textarea updates `node.bufferRationale`
- [ ] Changes trigger:
  - [ ] DLT recalculation (full network)
  - [ ] Buffer sizing calculation (DDMRP formulas)
  - [ ] Buffer icon render/remove
  - [ ] Metrics dashboard update

**Implementation Plan:**
1. Add event listeners to control inputs (SCRIPT 900)
2. Create state update function `updateNodeBuffer(nodeId, changes)`
3. Trigger `DLTCalculator.calculateDLT()` on buffer changes
4. Call `BufferSizingCalculator` for affected nodes
5. Re-render network with updated buffer icons
6. Update metrics display

### 6.2 Metrics Dashboard (Week 4 - TODO)

**Layout:** Bottom panel (collapsible)

**KPI Cards:**
- Total Inventory Value: €XXX,XXX
- Buffer Count: X buffers
- Customer Coverage: XX% (DLT ≤ tolerance)
- Avg DLT: X.X days
- Buffer Impact: -X.X days (CLT - DLT)

**Chart:** Inventory distribution by level (bar chart)

### 6.3 Scenario Manager (Week 4 - TODO)

**Features:**
- Save current buffer configuration
- Load saved scenarios
- Compare scenarios side-by-side
- Export scenario as JSON

**Storage:** Browser localStorage

---

## 7. TESTING & VALIDATION

### 7.1 Manual Testing Checklist

**Model Loading:**
- [x] Simple Chain loads successfully
- [x] Simple Assembly loads successfully
- [x] Simple Distribution loads successfully
- [x] Weber Pignons loads successfully (27 nodes)
- [x] Status message displays correctly
- [x] Node count accurate

**Network Visualization:**
- [x] Hierarchical tree layout renders
- [x] Node colors match type
- [x] Pan/zoom works smoothly
- [x] Node labels readable

**Buffer Icons:**
- [x] Icons appear only on buffered nodes
- [x] Trapezoid shape correct (30px x 20px)
- [x] Three color bands visible (RYG)
- [x] Icons positioned top-right corner
- [x] Icons persist during pan/zoom

**Node Selection:**
- [x] Click node opens detail panel
- [x] Panel displays correct node data
- [x] All sections render appropriately
- [x] Type badges color-coded correctly
- [x] Close button works
- [x] Works with all 4 models

**Cross-Model Testing:**
- [x] Switch between models updates display
- [x] Panel closes when switching models
- [x] No stale data from previous model
- [x] Recalculations accurate for each model

### 7.2 Known Issues

**Resolved:**
- ✅ Weber Pignons model not loading → Fixed by exposing `window.WEBER_PIGNONS_NETWORK`
- ✅ Node detail panel showing "Node not found" → Fixed by reading `window.currentNetwork`

**Pending:**
- ⚠️ Buffer controls not yet functional (inputs present but no state updates)
- ⚠️ Buffer sizing calculations not triggered
- ⚠️ Metrics dashboard not implemented

---

## 8. NEXT STEPS (Prioritized)

### Immediate (This Week)
1. **Connect buffer controls to state** (SCRIPT 900)
   - Add event listeners for checkbox, dropdown, inputs
   - Update `window.currentNetwork` on changes
   - Trigger DLT recalculation
   - Trigger buffer icon updates

2. **Implement buffer sizing calculator** (SCRIPT 400)
   - DDMRP formulas (Red/Yellow/Green zones)
   - Profile-based factors (lead time, variability)
   - MOQ and cycle constraints
   - Average stock calculation

3. **Add buffer sizing display** (SCRIPT 900)
   - Show calculated zones in detail panel
   - Visual bar chart of RYG zones
   - Inventory value display

### Short-term (Next 2 Weeks)
4. **Metrics dashboard** (DIV 400, SCRIPT 700)
   - KPI cards with calculations
   - Inventory distribution chart
   - Bottom panel with collapse/expand

5. **Scenario manager basics** (SCRIPT 1000)
   - Save current state to localStorage
   - Load saved scenarios
   - List view of scenarios

### Medium-term (Phase 2)
6. **Scenario comparison** (Week 5+)
   - Side-by-side metrics
   - Delta visualization
   - Export comparison report

7. **Data upload capability** (Week 6+)
   - JSON file upload
   - Network validation
   - Custom model loading

---

## 9. REVISION HISTORY

| Version | Date | Changes | Revisions |
|---------|------|---------|-----------|
| 1.0 | Jan 27, 2025 | Initial design document | - |
| 1.1 | Feb 4, 2025 | Updated with implemented features | #14897-14901 |

**Key Revisions:**
- **#14897:** Fixed Weber Pignons model loading (window exposure)
- **#14899:** Added buffer icon visualization (trapezoid with RYG bands)
- **#14901:** Fixed node detail panel (reads window.currentNetwork)

---

## 10. REFERENCES

**CommWise App:**
- App ID: 13866
- URL: https://commwise.b2wise.com/mcp-c3-ddoptim-buffer-positioning-optimizer

**Documentation:**
- Requirements: `/mnt/project/DDoptim_requirements.md`
- Design: `/mnt/project/DDoptim_CommWise_Design.md`
- Case Study: Weber Pignons PDF (Soutenance_CPF_DDP_Rémi_LEQUETTE__20250205.pdf)

**Session ID:** 4c3eda48-69eb-40b4-8db7-468c955e6e49

---

**Document Status:** ACTIVE - Reflects current implementation as of February 4, 2025  
**Next Update:** After buffer controls and metrics dashboard completion
