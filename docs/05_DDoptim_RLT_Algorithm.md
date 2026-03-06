# DDoptim — Required Lead Time (RLT) Algorithm

**Version:** 1.1  
**Date:** February 26, 2026  
**Status:** Implemented (SCRIPT 650)

---

## 1. Overview

The RLT algorithm automatically positions strategic buffers in a supply chain network to satisfy customer lead time requirements while minimizing inventory investment. It propagates time requirements downstream through the BOM structure, positioning buffers at the most economical locations.

---

## 2. Core Concept

**Required Lead Time (RLT)** represents the delivery time requirement that must be satisfied for a node to meet its customer delivery commitment.

- **RLT = 0**: Node has been processed (either buffered or time requirement propagated downstream)
- **RLT > 0**: Node has an active time requirement awaiting resolution

The algorithm pushes time requirements downstream (toward raw materials/components) where unit costs are typically lower and buffering is more economical.

---

## 3. Key Principles

### Mandatory Buffering Condition

A node **must be buffered** when:
```
remainingTime = node.requiredLeadTime - node.leadTime
if remainingTime < 0 → node.hasBuffer = True (mandatory)
```

After deducting the node's operation time, there is a time deficit. The only solution is to buffer this node for immediate delivery.

### Time Budget Propagation

When remaining time ≥ 0, propagate to children:
- **remainingTime > 0**: Time available for upstream operations
- **remainingTime = 0**: Exactly enough time; children must be immediately available

### Downstream Push Strategy

Buffers are pushed toward raw materials/purchased components where:
- Unit costs are lower
- Convergence points provide leverage (one buffer serves multiple parents)
- Shared components benefit multiple product lines

---

## 4. Algorithm

### Initialization

```
For each node:
  if node has customerTolerance defined AND independentADU > 0:
    node.requiredLeadTime = node.customerTolerance
  else:
    node.requiredLeadTime = 0
  
  node.hasBuffer = False (unless bufferLocked = True)
```

### Main Loop

```
while any node has requiredLeadTime > 0:
  
  For each node in topological order (parents before children):
    
    if node.requiredLeadTime > 0:
      remainingTime = node.requiredLeadTime - node.leadTime
      
      if remainingTime < 0:
        node.hasBuffer = True          // Mandatory buffer
      else:
        for each child in node.children:
          if not child.hasBuffer:
            child.requiredLeadTime = MAX(child.requiredLeadTime, remainingTime)
      
      node.requiredLeadTime = 0        // Mark as processed
```

### Locked Buffer Handling

Locked buffers (`bufferLocked = True`) are preserved throughout the algorithm:
- Never removed by the algorithm
- Act as existing decoupling points
- Children of locked buffers don't receive propagated requirements (buffer already provides immediate availability)

---

## 5. Decision Logic

For each node with `requiredLeadTime > 0`:

**Step 1:** Calculate `remainingTime = RLT - leadTime`

**Step 2:** Branch:
- **remainingTime < 0**: Mandatory buffer. Cannot meet requirement even with all children immediate.
- **remainingTime ≥ 0**: Propagate remaining time budget to unbuffered children using MAX() to satisfy the most restrictive parent requirement.

**Step 3:** Set `node.requiredLeadTime = 0` to prevent reprocessing.

### Why MAX() for Multiple Parents

A child may receive requirements from multiple parents. MAX ensures the most restrictive requirement is met:
- Parent A needs component in 3 days → child gets RLT = 3
- Parent B needs same component in 5 days → child gets RLT = MAX(3, 5) = 5
- Satisfying 5-day requirement automatically satisfies the 3-day one

---

## 6. Edge Cases

| Case | Behavior |
|------|----------|
| **Shared components** (multiple parents) | Child inherits MAX(all parent remaining times) |
| **Zero lead time nodes** | Act as transparent passthrough — full budget passes to children |
| **Leaf nodes** (raw materials) | If remainingTime < 0 → must buffer; if ≥ 0 → no action needed |
| **Spare parts** with customerTolerance | Initialize with RLT = customerTolerance; may also receive propagated RLT from parent products |
| **remainingTime = 0** | No time budget for children; they remain at their current RLT |

---

## 7. Properties

| Property | Detail |
|----------|--------|
| **Termination** | Guaranteed. Finite acyclic network, each iteration reduces active nodes. |
| **Iterations** | Typically 2-5, equals max BOM depth in worst case. |
| **Time complexity** | O(D × (N + E)) where D = iterations, N = nodes, E = edges. Practically linear. |
| **Space complexity** | O(N + E) |
| **Optimality** | Heuristic — not guaranteed minimum inventory, but good downstream push. |

---

## 8. Integration with UI (SCRIPT 930)

1. **Snapshot** current buffer state before running
2. **Run** algorithm respecting locked buffers
3. **Preview** results in modal: buffers to add/remove, before/after comparison, execution log
4. **Apply** changes or **Cancel** (restore snapshot)
5. Apply button disabled when no changes proposed

---

## 9. Output

Each node after execution:
- `hasBuffer = True/False` — positioning decision
- `requiredLeadTime = 0` — all requirements resolved

Derived outputs:
- Buffer list with justification (mandatory vs strategic)
- Execution log (iteration count, buffers set, propagations)
- Per-buffer remaining time that triggered the decision

---

## 10. Extensions (Future)

| Extension | Description |
|-----------|-------------|
| **Cost-aware propagation** | Prefer buffering lowest-cost children |
| **Force buffer on zero remaining** | Children get immediate buffer when parent has exactly 0 remaining |
| **Visibility horizon** | Use customerTolerance + visibilityHorizon for RLT initialization |
| **Multi-objective optimization** | Explore buffer swaps to reduce inventory while maintaining coverage |

---

**Document Version:** 1.1  
**Last Updated:** February 26, 2026
