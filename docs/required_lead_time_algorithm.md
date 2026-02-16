# Required Lead Time Propagation Algorithm

## Overview

This algorithm automatically positions strategic buffers in a supply chain network to satisfy customer lead time requirements while minimizing inventory investment. It works by propagating time requirements downstream through the Bill of Materials (BOM) structure, positioning buffers at the most economical locations.

---

## Core Concept

**Required Lead Time (RLT)** represents the delivery time requirement that must be satisfied for a node to meet its customer delivery commitment.

- **RLT = 0**: Node has been processed (either buffered or time requirement propagated downstream)
- **RLT > 0**: Node has an active time requirement awaiting resolution

The algorithm pushes time requirements downstream (toward raw materials/components) where:
- Unit costs are typically lower
- Buffering is more economical
- Natural buffer positions emerge at leverage points (convergence points, shared components)

---

## Key Principles

### 1. Mandatory Buffering Condition

A node **must be buffered** when:
```
remainingTime = node.requiredLeadTime - node.leadTime
if remainingTime < 0:
    node.hasBuffer = True  # Mandatory buffering
```

**Interpretation:** After deducting the node's operation time from its time requirement, there is negative remaining time (a deficit). Since you cannot execute an operation faster than its inherent lead time without maintaining stock, buffering is mandatory.

### 2. Time Budget Propagation

When a node has sufficient time budget after its own operation:
```
remainingTime = node.requiredLeadTime - node.leadTime
if remainingTime >= 0:
    # Propagate remaining time to children
```

- **If remainingTime > 0**: Time is available for upstream operations; propagate this budget to children
- **If remainingTime = 0**: Exactly enough time for this operation; children must be immediately available (buffered)

### 3. Downstream Push Strategy

The algorithm intentionally pushes buffer requirements toward:
- Raw materials and purchased components (lower unit costs)
- Convergence points (one buffer serves multiple parent products)
- Shared components (leverage across multiple product lines)

This minimizes total inventory value while satisfying all customer requirements.

---

## Algorithm Structure

### Initialization

```python
# Set initial required lead times
for each node in network:
    if node has customer_tolerance defined (finished goods, spare parts):
        node.requiredLeadTime = node.customer_tolerance
    else:
        node.requiredLeadTime = 0
    
    node.hasBuffer = False  # Start with no buffers
```

**Notes:**
- Only customer-facing products have initial RLT > 0
- All intermediate/component nodes start with RLT = 0
- Buffers are added iteratively based on propagated requirements

---

### Main Loop

```python
hasRequiredLeadTime = True  # Initialize flag

while hasRequiredLeadTime:
    hasRequiredLeadTime = False  # Reset at start of each iteration
    
    # ============================================
    # Process Each Node in Topological Order
    # ============================================
    for each node in topological order (parents before children):
        
        if node.requiredLeadTime > 0:
            hasRequiredLeadTime = True  # Found active requirement
            
            # Calculate remaining time after this node's operation
            remainingTime = node.requiredLeadTime - node.leadTime
            
            if remainingTime < 0:
                # Mandatory buffer: not enough time for operation
                node.hasBuffer = True
                
            else:
                # Sufficient time: propagate to children
                for each child in node.children:
                    if not child.hasBuffer:
                        # Child inherits maximum requirement from all parents
                        child.requiredLeadTime = max(
                            child.requiredLeadTime,
                            remainingTime
                        )
            
            # Mark this node as processed
            node.requiredLeadTime = 0
```

---

## Detailed Logic Explanation

### Loop Control: `hasRequiredLeadTime` Flag

**Purpose:** Determines whether another iteration is needed.

**Mechanism:**
- Set to `True` before entering the loop
- Reset to `False` at the start of each iteration
- Set back to `True` if any node still has `requiredLeadTime > 0`
- Loop terminates when an entire iteration finds no nodes with active requirements

**Why This Works:**
- After processing a node, its RLT is set to 0
- If children received propagated requirements, they will have RLT > 0 in the next iteration
- When no nodes have RLT > 0 for an entire iteration, all requirements have been resolved

---

### Node Processing Logic

For each node with `requiredLeadTime > 0`:

#### Step 1: Calculate Remaining Time

```python
remainingTime = node.requiredLeadTime - node.leadTime
```

**Interpretation:**
- **Positive:** Time available for upstream operations after completing this node's operation
- **Zero:** Exactly enough time for this operation; no time for upstream delays
- **Negative:** Deficit - cannot meet requirement even if all children are immediate

#### Step 2: Decision Branch

**Branch A: Mandatory Buffer (`remainingTime < 0`)**

```python
if remainingTime < 0:
    node.hasBuffer = True
```

**Why:** The required delivery time is less than this node's operation time alone. Even with all inputs immediately available (buffered), the operation itself takes too long. The only solution is to buffer this node for immediate delivery.

**Example:**
- Node operation time: 5 days
- Required delivery: 2 days
- Remaining time: 2 - 5 = -3 days (deficit)
- **Must buffer** to achieve 0-day delivery

**Branch B: Propagate to Children (`remainingTime >= 0`)**

```python
else:
    for each child in node.children:
        if not child.hasBuffer:
            child.requiredLeadTime = max(
                child.requiredLeadTime,
                remainingTime
            )
```

**Why:** There is time available (or exactly zero time) for upstream operations. Propagate this time budget to children so they can coordinate their delivery to meet the parent's schedule.

**Special Case (remainingTime = 0):**
- No time budget for children → they must be immediate
- Children receive `requiredLeadTime = 0`
- In next iteration, children will fail the `RLT > 0` check and won't be processed
- However, if children have `leadTime > 0`, they will need buffering to achieve 0-day delivery
- This happens naturally when parent is processed again or through subsequent propagation

**Note on `max()` Operation:**
- Children may receive requirements from multiple parents
- Use maximum to satisfy the most restrictive requirement
- Example: Product A needs component in 3 days, Product B needs it in 5 days → component gets 5-day requirement

#### Step 3: Mark Node as Processed

```python
node.requiredLeadTime = 0
```

**Purpose:** Prevent reprocessing in subsequent iterations.

**Effect:** This node has either been buffered or propagated its requirement downstream. Its immediate obligation is fulfilled.

---

## Topological Order Requirement

**Critical:** Nodes must be processed in topological order (parents before children).

**Why:**
- Ensures all parent requirements are considered before updating child RLT
- Prevents missed propagations in multi-parent scenarios
- Maintains consistency in shared component handling

**Algorithm for Topological Sort:**
```python
# Kahn's algorithm or DFS-based topological sort
# For supply chain BOM: Start from finished goods, traverse to raw materials
```

**If cycles exist in BOM:** 
- Topological sort is undefined
- Algorithm requires cycle detection and breaking before execution
- Cycles should be resolved in data preparation phase

---

## Algorithm Properties

### Correctness Guarantees

1. **Completeness:** Algorithm terminates when all customer requirements are resolved (all RLT = 0 for entire iteration)
2. **Mandatory Coverage:** All nodes where `remainingTime < 0` are buffered (unavoidable)
3. **Downstream Preference:** Time requirements are pushed toward raw materials/components where possible

### Convergence

**Termination Guarantee:** 
- Each iteration processes all nodes with RLT > 0
- Each processed node either sets a buffer or propagates RLT to children (setting its own RLT = 0)
- Network is finite and acyclic (DAG)
- Therefore: Algorithm terminates in finite iterations

**Typical Iteration Count:**
- 2-5 iterations for most supply chains
- Equals maximum BOM depth in worst case
- First iteration processes finished goods, subsequent iterations process downstream levels

**Example Iteration Sequence:**
```
Iteration 1: Process finished goods → propagate to semi-finished products
Iteration 2: Process semi-finished → propagate to components
Iteration 3: Process components → propagate to raw materials or set buffers
Iteration 4: No nodes with RLT > 0 → terminate
```

### Optimality

**The algorithm does NOT guarantee minimum inventory cost**, but it provides a good heuristic by:
- Avoiding buffering high-cost finished goods when components can be buffered instead
- Leveraging convergence points (one component buffer serves multiple parents)
- Respecting time constraints strictly (no over-buffering in time dimension)
- Processing in topological order maximizes downstream push opportunity

**For true cost optimization:** This algorithm can serve as a starting point, with subsequent refinement based on inventory value calculations.

---

## Edge Cases and Considerations

### 1. Multiple Parents (Shared Components)

**Scenario:** Component used in multiple finished products with different time requirements

**Handling:**
```python
child.requiredLeadTime = max(child.requiredLeadTime, remainingTime)
```

The child inherits the **most restrictive requirement** (maximum RLT) from all parents.

**Example:**
- Product A requires component in 3 days
- Product B requires same component in 5 days  
- Component gets RLT = max(3, 5) = 5 days
- This ensures both parents can be satisfied

**Why Maximum:** 
- If component satisfies 5-day requirement, it automatically satisfies 3-day requirement
- Buffering once at the stricter level serves both parents

### 2. Spare Parts with Customer Tolerance

**Scenario:** Component sold both as spare part (direct customer demand) and as BOM item

**Handling:**
- Initialize with `RLT = customer_tolerance` for spare part requirement
- May also receive propagated RLT from parent products  
- During propagation: `RLT = max(current_RLT, propagated_RLT)`
- Component satisfies both its direct customer requirement and parent product needs

### 3. Zero Lead Time Nodes

**Scenario:** Node with `leadTime = 0` (instantaneous operation, e.g., kitting, inspection)

**Behavior:**
```python
remainingTime = RLT - 0 = RLT  # Full budget passes through
```

- Node never needs buffering (operation is instantaneous)
- Acts as transparent passthrough for time requirements
- All parent RLT propagates directly to children unchanged

### 4. Leaf Nodes (Raw Materials, Purchased Items)

**Scenario:** Nodes with no children (end of BOM tree)

**Behavior:**
```python
if node.requiredLeadTime > 0:
    remainingTime = RLT - leadTime
    if remainingTime < 0:
        node.hasBuffer = True
    else:
        # No children to propagate to
        # If remainingTime >= 0, node does not need buffering
```

**Interpretation:**
- If `remainingTime >= 0`: Parent has enough time to wait for procurement/production
- If `remainingTime < 0`: Parent needs immediate availability → must buffer

### 5. Zero Required Lead Time Propagation

**Scenario:** Child receives `remainingTime = 0` from parent

**Behavior:**
```python
child.requiredLeadTime = max(child.requiredLeadTime, 0)
```

- Child's RLT remains unchanged (max with 0)
- Child will only be buffered if it receives positive RLT from another parent
- **If child has no other parents with positive RLT:**
  - Child's RLT stays at 0
  - Child is not processed in subsequent iterations
  - Child is not buffered
  - **Implication:** Parent must wait for child's `leadTime` when ordering

**Critical Insight:** 
When `remainingTime = 0`, the parent has exactly enough time for its own operation but no time for children. This means:
- Either children are already buffered (immediate availability)
- Or the parent's time requirement was exactly its lead time (implying children should be immediate)

**Refinement Option:** Force immediate buffering when `remainingTime = 0`:
```python
if remainingTime == 0:
    for each child in node.children:
        if not child.hasBuffer:
            child.hasBuffer = True  # Force immediate availability
else:  # remainingTime > 0
    for each child in node.children:
        if not child.hasBuffer:
            child.requiredLeadTime = max(child.requiredLeadTime, remainingTime)
```

---

## Complexity Analysis

### Time Complexity

**Per Iteration:**
- Process all nodes: O(N) where N = number of nodes
- For each node, iterate children: O(E) where E = total BOM edges
- **Total per iteration:** O(N + E)

**Total Algorithm:**
- O(D × (N + E)) where D = number of iterations
- D ≤ maximum BOM depth (typically 3-6 levels)
- **Practical complexity:** O(N + E) - linear in network size

### Space Complexity

**O(N + E)** for storing:
- Node attributes (RLT, hasBuffer, leadTime, etc.)
- BOM adjacency lists (parent-child relationships)  
- Topological ordering
- Loop control flag

---

## Implementation Considerations

### Data Structures Required

1. **Node Object:**
   ```python
   {
       id: string
       leadTime: number (days)
       customerTolerance: number (days, optional)
       requiredLeadTime: number (days, mutable)
       hasBuffer: boolean (mutable)
       children: [node_ids]  # BOM components
       parents: [node_ids]   # Products using this component
   }
   ```

2. **Network Representation:**
   - Adjacency lists for parent-child relationships
   - Topological ordering (pre-computed or computed per iteration)
   - Hash map for O(1) node lookup by ID

### Numerical Precision

- Use floating-point for lead times (days can be fractional: 0.5 days = 12 hours)
- Comparison `remainingTime < 0` should use small epsilon for numerical stability:
  ```python
  EPSILON = 0.001  # 0.001 days ≈ 1.4 minutes
  if remainingTime < -EPSILON:  # Clearly negative
      node.hasBuffer = True
  ```

### Debugging and Validation

**Useful Diagnostics:**

1. **Iteration Logging:**
   ```
   Iteration 1: Processed 5 nodes, set 2 buffers, propagated to 12 children
   Iteration 2: Processed 12 nodes, set 8 buffers, propagated to 15 children
   Iteration 3: Processed 15 nodes, set 5 buffers, propagated to 0 children
   Iteration 4: Processed 0 nodes → TERMINATE
   ```

2. **Buffer Decision Log:**
   ```
   Node: Vélo
   RLT: 2 days
   Lead Time: 5 days
   Remaining Time: -3 days
   Decision: BUFFER (mandatory)
   ```

3. **Propagation Trace:**
   ```
   Node: Vélo
   RLT: 5 days
   Lead Time: 5 days
   Remaining Time: 0 days
   Propagated to: Wheel (0 days), Frame (0 days), Handlebar (0 days)
   ```

4. **Final Validation:**
   - Check: All customer-facing nodes have RLT = 0
   - Check: All buffered nodes have `hasBuffer = True`
   - Check: No orphan buffers (buffers not on any customer path)

### Error Handling

**Pre-execution Validation:**
- Verify network is a DAG (no cycles)
- Check all required attributes present (leadTime, customerTolerance where applicable)
- Validate all lead times are non-negative

**Runtime Safeguards:**
- Maximum iteration limit (e.g., 100) to prevent infinite loops
- Check for progress: If iteration sets no buffers and propagates to no children → error
- Verify topological ordering is valid before each iteration

---

## Extensions and Variations

### 1. Cost-Aware Propagation

Modify propagation logic to consider inventory cost when multiple children exist:

```python
if remainingTime >= 0:
    # Calculate buffer cost if each child were buffered
    child_costs = [(child, calculate_buffer_cost(child)) for child in node.children]
    child_costs.sort(key=lambda x: x[1])  # Sort by cost
    
    # Propagate preferentially to lowest-cost children first
    for child, cost in child_costs:
        if not child.hasBuffer:
            child.requiredLeadTime = max(child.requiredLeadTime, remainingTime)
            break  # Only propagate to one child (cheapest)
```

**Note:** This changes algorithm behavior significantly - requires additional cost evaluation step.

### 2. Immediate Buffering on Zero Remaining Time

Force children to be buffered when parent has exactly zero remaining time:

```python
if remainingTime < 0:
    node.hasBuffer = True
elif remainingTime == 0:
    # No time for children → force immediate availability
    for child in node.children:
        if not child.hasBuffer:
            child.hasBuffer = True
else:  # remainingTime > 0
    # Propagate normally
    for child in node.children:
        if not child.hasBuffer:
            child.requiredLeadTime = max(child.requiredLeadTime, remainingTime)
```

**Impact:** Ensures children are immediately available when parent has no time budget.

### 3. Partial Buffering

Allow fractional buffering by treating RLT as partially satisfiable:

```python
if remainingTime < 0:
    node.partialBuffer = True
    node.bufferCoverage = node.requiredLeadTime / node.leadTime
    # Example: RLT=2, leadTime=5 → 40% buffer coverage
```

**Use Case:** Safety stock policies where partial coverage is acceptable.

### 4. Multi-Objective Optimization

Continue iterations beyond requirement satisfaction to explore alternative buffer placements:

```python
# After all RLT = 0, explore buffer relocations
while inventory_improvement_possible():
    try_buffer_swap()
    if total_inventory_cost < previous_cost:
        accept_swap()
    else:
        revert_swap()
```

**Purpose:** Find lower-inventory solutions while maintaining time requirements.

---

## Output

**Final State:**

Each node has:
- `hasBuffer = True/False` - Buffer positioning decision
- `requiredLeadTime = 0` - All requirements processed (if algorithm succeeded)

**Derived Outputs:**

1. **Buffer List:** All nodes where `hasBuffer = True`
2. **Justification:** For each buffer, the `remainingTime` value that triggered it
3. **Buffer Type Classification:**
   - Mandatory buffers (`remainingTime < 0`)
   - Strategic buffers (set to satisfy parent's zero remaining time)
4. **Metrics:** 
   - Total buffer count
   - Buffers by node type (finished/intermediate/component/purchased)
   - Buffers by iteration (when they were set)

**Next Steps:**

- Calculate buffer sizes using DDMRP formulas:
  - Yellow zone: `ADU × DLT`
  - Green zone: `max(Yellow × lead_time_factor, MOQ, ADU × order_cycle)`
  - Red zone: `green_delay × (1 + variability_factor)`
- Compute total inventory value for cost evaluation
- Validate customer tolerance coverage (all finished goods have DLT ≤ tolerance)
- Compare alternative strategies (manual adjustments, scenario variations)

---

## Summary

This algorithm provides an elegant, computationally efficient method for automated buffer positioning that:

✓ Guarantees customer lead time requirements are met  
✓ Pushes buffers downstream to minimize costs  
✓ Handles complex BOM structures (convergence, shared components)  
✓ Produces explainable buffer decisions (mandatory vs. strategic)  
✓ Scales linearly with network size  
✓ Terminates in bounded iterations (≤ BOM depth)

**Key Advantages:**

- **Simplicity:** Single loop with clear decision logic
- **Transparency:** Each buffer has clear justification (negative remaining time)
- **Efficiency:** Linear complexity, suitable for large networks
- **Flexibility:** Easily extended with cost awareness or other objectives

**Limitations:**

- Not guaranteed to find minimum inventory solution (heuristic approach)
- Does not consider buffer sizing costs during positioning
- Sequential processing may miss parallel optimization opportunities

**Best Used For:**

- Initial buffer positioning in new supply chain designs
- Quick evaluation of customer tolerance scenarios
- Baseline for comparison with manual expert positioning
- Input to subsequent cost-optimization refinement

---

**Algorithm Version:** 1.0  
**Last Updated:** January 2025
