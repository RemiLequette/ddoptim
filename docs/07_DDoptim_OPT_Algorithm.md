# DDoptim — OPT Algorithm (Inventory Minimization)

**Version:** 1.3  
**Date:** March 6, 2026  
**Status:** Implemented (SCRIPTS 660–663, 935)

---

## 1. Overview

The OPT algorithm minimizes total inventory value across a supply chain network while maximizing customer lead time coverage. It is available as an alternative to the RLT algorithm — both remain accessible independently in the UI.

Unlike RLT, which pushes time requirements downstream without cost awareness, OPT explicitly optimizes inventory value as its secondary objective, using a lexicographic priority structure.

---

## 2. New Node Attribute — `toleranceMandatory`

Before implementing OPT, the following attribute must be added to the data model, JSON export/import, and all UI components (detail panel, tooltip, table, scenarios) as an independent prerequisite.

```javascript
toleranceMandatory: boolean  // default: false
```

**Semantics:** When `true` on a node with `independentADU > 0`, the constraint `deliveryLeadTime ≤ customerTolerance` is treated as a **hard constraint** by OPT. The algorithm must satisfy it if feasible given locked buffers and budget. If infeasible, the algorithm halts with an explicit error report.

Note: `deliveryLeadTime = 0` if the node is buffered (immediate availability), otherwise `deliveryLeadTime = DLT`. This matches the definition used by SCRIPT 620 and the "missing customer tolerance" KPI.

### Implementation Prerequisites (in order)

1. **Data model** — add `toleranceMandatory: boolean` to node structure
2. **JSON export** — serialize field; backward compatibility default: `false`
3. **JSON import** — read field; missing → default `false`
4. **Tooltip** — display `toleranceMandatory` status
5. **Detail panel** — checkbox to toggle `toleranceMandatory` (visible only when `independentADU > 0`)
6. **Table view** — add column, filter (boolean: all / yes / no)
7. **Scenario diff engine** — track `toleranceMandatory` as a modifiable attribute

---

## 3. New Scenario Attribute — `budgetMax`

```javascript
budgetMax: number | null  // null = unlimited
```

Stored in the scenario object. Entered by the user in the OPT launch modal. Persisted as the default value for subsequent OPT runs on the same scenario.

---

## 4. Objective Function (Lexicographic — 3 levels)

The key intermediate quantity is **deliveryLeadTime**, consistent with SCRIPT 620:

```
deliveryLeadTime[i] = 0              if hasBuffer[i] = true
                    = DLT[i]         otherwise
```

A buffered node is immediately available (service time = 0), so its contribution to customer coverage gaps is zero regardless of the DLT of its upstream components.

```
f0 = Σ MAX(0, deliveryLeadTime[i] - customerTolerance[i])
     for nodes where toleranceMandatory = true AND independentADU > 0
     → Minimize FIRST (hard constraint if feasible)

f1 = Σ MAX(0, deliveryLeadTime[i] - customerTolerance[i])
     for ALL nodes where independentADU > 0
     → Minimize SECOND

f2 = Σ inventoryValue[i]
     for all buffered nodes
     → Minimize THIRD
```

Note: f0 ⊆ f1 (mandatory nodes are a subset of all demand nodes). When f0 = 0, mandatory nodes contribute 0 to f1 as well.

The objectives f0 and f1 are identical to `missingCustomerLeadTime` as computed by SCRIPT 620, summed across the relevant node sets.

**Dominance rule:** Solution A is better than solution B if:
- `f0(A) < f0(B)`, OR
- `f0(A) = f0(B)` AND `f1(A) < f1(B)`, OR
- `f0(A) = f0(B)` AND `f1(A) = f1(B)` AND `f2(A) < f2(B)`

---

## 5. Fixed Constraints (never violated)

| Constraint | Rule |
|-----------|------|
| `bufferLocked = true` | `hasBuffer[i]` is fixed at its current value — the algorithm cannot add or remove this buffer |
| `budgetMax` | `Σ inventoryValue[i] ≤ budgetMax` at all times (when budgetMax is not null) |

**Important:** A locked node with `hasBuffer = false` acts as an **exclusion constraint** — it cannot be buffered even if doing so would improve coverage or reduce cost. This is the primary source of infeasibility for `toleranceMandatory` nodes.

---

## 6. Key Calculation Principle

All simulations (add buffer, remove buffer, swap) require a **full recalculation of DLT and inventoryValue across the entire network**. No incremental approximations.

This is because adding a buffer on a component (child node) decouples it from its own upstream, reducing the DLT of its parent nodes. This in turn reduces the inventoryValue of those parent buffers (Yellow zone = ADU × DLT). The net impact on f2 can only be correctly measured by recomputing the full network state.

Conversely, removing a buffer from a component increases the DLT of its parent nodes, potentially increasing their inventoryValue or degrading f1.

---

## 7. Algorithm Structure

### Phase 0 — Feasibility Check

Executed before any optimization. Detects infeasible `toleranceMandatory` constraints early.

**Step 1 — Structural check (bufferLocked):**
- Build the maximally favorable configuration: all non-locked nodes buffered
- Recalculate deliveryLeadTime for all nodes (= 0 for all non-locked demand nodes in this scenario)
- For each node where `toleranceMandatory = true`:
  - If `deliveryLeadTime[i] > customerTolerance[i]` → infeasible due to locked buffers
  - This can only happen if the node itself is locked with `hasBuffer = false`, making its deliveryLeadTime = DLT > tolerance
  - Record: node id, minimum deliveryLeadTime achievable, tolerance required, blocking locked nodes upstream

**Step 2 — Budget check (if budgetMax defined):**
- Initialize all non-locked nodes to **zero buffers** (NOT the RLT seed — unbiased by design)
- Run Phase 2a without budget constraint to find the minimum cost to satisfy all `toleranceMandatory` nodes
- If that minimum cost > budgetMax → infeasible due to budget
- Record: budget required vs budget available

**Important:** If no nodes have `toleranceMandatory = true`, Phase 2a adds no buffers → minimum cost = 0 → budget check always passes. The budget is never a source of infeasibility when there are no mandatory nodes — it only acts as a binding constraint during the optimization phases.

**If any infeasibility detected → HALT.** Display error modal (see Section 10). Do not proceed.

**If all mandatory nodes are feasible → continue to Phase 1.**

---

### Phase 1 — Initialize Solution (RLT Seed)

```
1. Snapshot current hasBuffer state for all nodes
2. Run RLT algorithm internally (read-only, no UI side effects)
3. Capture RLT buffer decisions (set of buffered node IDs)
4. Restore original hasBuffer state
5. Apply starting position:
   - bufferLocked = true → keep hasBuffer as-is
   - else → hasBuffer = RLT_solution[node.id]
6. Recalculate full network (DLT, deliveryLeadTime, inventoryValue)
7. If budgetMax defined and f2 > budgetMax:
   - Remove most expensive non-locked buffers one by one until f2 ≤ budgetMax
   - (Safety trim: ensures Phases 2–4 always start from a budget-valid state)
8. Compute f0, f1, f2 baseline

Fallback: if RLT engine unavailable → hasBuffer = false for all non-locked nodes
```

**Rationale for RLT seeding:** Starting from zero buffers traps OPT in expensive local optima on convergent networks. Example on Weber Pignons: with `customerTolerance(Vélo) = leadTime(Vélo)`, buffering Vélo directly satisfies f1 (deliveryLeadTime = 0), but carries the full DLT=39 days Yellow zone cost. RLT instead buffers 7 first-level components, achieving the same f1=0 at much lower total inventory value. OPT's Phase 4 swap search (limited to 1→1 and 1→2 substitutions) cannot discover the 1→7 swap needed to escape this local optimum. Seeding from RLT eliminates this class of failure: Phases 3 and 4 then refine the RLT solution downward, never upward.

**Budget enforcement on seed:** The RLT solution may exceed `budgetMax`. After applying the seed, if f2 > budgetMax, the most expensive non-locked buffers are removed one by one until the budget is respected. This ensures Phase 2 always starts from a budget-valid state. The trim is greedy (most expensive first) and does not attempt to preserve coverage — Phases 2a/2b will restore coverage within budget.

**Interaction with Phase 0 (budget check):** The internal run inside Phase 0b uses zero-buffer initialization (not the RLT seed) to find the true minimum mandatory cost, unbiased by the RLT solution. Only Phase 1 (the main optimization starting point) uses the RLT seed.

---

### Phase 2a — Greedy Coverage: Mandatory Nodes (minimize f0)

Repeat until f0 = 0 or no improvement possible:

```
For each non-locked, non-buffered candidate node:
  Simulate adding buffer → recalculate full network
  Compute Δf0 = f0_before - f0_after

If best Δf0 > 0:
  If budgetMax defined: skip candidates where adding buffer would exceed budget
  Among candidates with equal best Δf0: pick lowest inventoryValue (tie-breaker)
  Add buffer to selected candidate
  Update network state
```

Terminates when f0 = 0 (all mandatory nodes satisfied) or no remaining candidate improves f0.

Note: when seeded from RLT, f0 is typically already 0 at Phase 1 entry (RLT satisfies all customer tolerances). Phase 2a then exits immediately without adding any buffers.

---

### Phase 2b — Greedy Coverage: All Demand Nodes (minimize f1)

Target f1 value fixed = f1 at end of Phase 2a.

Repeat until f1 = 0 or no improvement possible:

```
For each non-locked, non-buffered candidate node:
  Simulate adding buffer → recalculate full network
  Compute Δf1 = f1_before - f1_after
  Verify f0 remains stable (mandatory nodes not degraded)

If best Δf1 > 0:
  If budgetMax defined: skip candidates that would exceed budget
  Among candidates with equal best Δf1: pick lowest inventoryValue (tie-breaker)
  Add buffer to selected candidate
  Update network state
```

Note: f1 = 0 is achievable only if all demand nodes can be buffered within constraints. If some demand nodes are locked with `hasBuffer = false` and `DLT > customerTolerance`, f1 will reach a non-zero floor.

Note: when seeded from RLT, f1 is typically already 0 at Phase 1 entry. Phase 2b then exits immediately without adding any buffers, and Phases 3–4 perform the actual optimization work.

---

### Phase 3 — Greedy Inventory Reduction (minimize f2)

Target f0 and f1 fixed = values at end of Phase 2.

Process buffered non-locked nodes from **most expensive to least expensive**:

```
For each buffered non-locked node (sorted by inventoryValue descending):
  Simulate removing buffer → recalculate full network
  Verify f0 stable AND f1 stable
  If budgetMax defined: verify constraint still satisfied (removal can only help)
  If all constraints stable → remove buffer permanently

Repeat until no further removal is accepted
```

Note: removing a buffer from a component increases the DLT of its parent nodes (which are no longer decoupled from that component's upstream). This may increase inventoryValue of those parents if they are buffered. The net impact on f2 is measured by full recalculation — a removal is only accepted if f2 strictly decreases.

---

### Phase 4 — Swap Search (minimize f2 by substitution)

Process buffered non-locked nodes from **most expensive to least expensive**:

```
For each buffered non-locked node B (sorted by inventoryValue descending):
  Find all non-buffered non-locked component (child) nodes of B, recursively (upstream ancestors)
  For each candidate single node U upstream:
    Simulate: remove B, add U → recalculate full network
    Check: f0 stable, f1 stable, budget respected, f2 decreases
    Record net Δf2

  For each candidate pair (U1, U2) upstream:
    Simulate: remove B, add U1+U2 → recalculate full network
    Check: f0 stable, f1 stable, budget respected, f2 decreases
    Record net Δf2

  If best swap found (max Δf2 > 0): apply it, restart outer loop
  (Restart because swap changes network topology for subsequent evaluations)

Terminate when no swap improves f2
```

Swap search is limited to 1→1 and 1→2 substitutions to keep complexity manageable on networks up to 200 nodes.

---

## 8. Complexity

| Phase | Complexity | Notes |
|-------|-----------|-------|
| Phase 0 | O(N × recalc) | One pass + optional internal run (zero-seed, unbiased) |
| Phase 1 | O(N × recalc) | RLT run + snapshot/restore + optional budget trim |
| Phase 2a/2b | O(N² × recalc) | N iterations × N candidates (typically fast when RLT-seeded) |
| Phase 3 | O(N × recalc) | One linear pass |
| Phase 4 | O(N³ × recalc) | N buffers × N² upstream pairs |
| **Total** | **O(N³)** | Acceptable for N < 200 |

`recalc` = O(N + E) DLT propagation through the DAG.

---

## 9. Budget Parameter

| Property | Detail |
|---------|--------|
| Storage | `scenario.budgetMax` (number or null) |
| Entry | OPT launch modal — numeric field or "No limit" checkbox |
| Default | Value from `scenario.budgetMax` if previously set |
| Persistence | Saved to scenario on OPT launch confirmation |
| Scope | Applied in Phases 0b (feasibility), 1 (seed trim), 2a, 2b, 4 |

---

## 10. User Interface

### OPT Launch Modal

Triggered by new "Optimize" button in the controls bar (alongside existing Auto-Position RLT button).

Fields:
- Budget: numeric input (currency units) OR "No limit" checkbox
- Pre-filled with `scenario.budgetMax` if defined
- Run button / Cancel button

### Infeasibility Error Modal (Phase 0 failure)

Displayed instead of results when feasibility check fails. Content:

```
⚠️ Optimization cannot proceed — infeasible constraints detected

The following nodes have toleranceMandatory = true
but cannot be satisfied:

┌─────────────┬──────────────────┬───────────┬──────────────────────────────┐
│ Node        │ Min deliveryLT   │ Tolerance │ Cause                        │
├─────────────┼──────────────────┼───────────┼──────────────────────────────┤
│ Vélo / plant│ 15 days          │ 10 days   │ Locked buffer excluded:      │
│             │                  │           │ "Roue" (bufferLocked=true,   │
│             │                  │           │  hasBuffer=false)            │
├─────────────┼──────────────────┼───────────┼──────────────────────────────┤
│ Kit / shop  │ 8 days           │ 5 days    │ Budget insufficient          │
│             │                  │           │ Required: 45,000 €           │
│             │                  │           │ Available: 30,000 €          │
└─────────────┴──────────────────┴───────────┴──────────────────────────────┘

Suggestions:
• Unlock buffer on "Roue" to allow the algorithm to buffer it
• Increase budget to at least 45,000 € or remove budget constraint
```

### Results Modal

Displayed after successful optimization (similar structure to RLT preview modal).

Sections:
1. **Summary** — f0/f1/f2 before → after, buffers added/removed
2. **Coverage status** — f0 = 0 (all mandatory satisfied) / f1 = 0 (all nodes satisfied) / partial with remaining gaps listed
3. **Buffer changes** — per-node detail with phase that decided (Coverage / Reduction / Swap) and justification
4. **Budget status** — used / limit / remaining (if budget defined)
5. **Actions** — "Save as new scenario" (with editable name, pre-filled suggestion) / Cancel

**Save is mandatory** — results cannot be applied directly to the current network state without creating a scenario. Cancel discards all changes.

---

## 11. Integration with Existing Architecture

| Concern | Approach |
|--------|---------|
| New script blocks | SCRIPT 660 (Core + Phase 0), 661 (Phases 1–2), 662 (Phases 3–4), 663 (Orchestrator) |
| UI handler | SCRIPT 935 — OPT UI Handler (launch modal, error modal, results modal) |
| Reuses | `window.calculateBufferSizing` (SCRIPT 400), `window.DLTCalculator.calculateDLT` (SCRIPT 700), `window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime` (SCRIPT 620), `window.DDOptim.diffEngine` (SCRIPT 1360) |
| RLT dependency (Phase 1) | `window.RequiredLeadTimePropagation.autoPositionBuffers` (SCRIPT 650) — called read-only for seeding |
| Does NOT modify | RLT algorithm (SCRIPT 650) — called silently, no UI side effects |
| `toleranceMandatory` added to | SCRIPT 300 (node defaults), SCRIPT 1300 (MODIFIABLE_ATTRIBUTES) |
| `budgetMax` added to | Scenario object (SCRIPT 1300), diff engine (SCRIPT 1360) |

---

## 12. Implementation Order

1. ✅ **Design & documentation** (this document)
2. ✅ **Data model** — `toleranceMandatory` added to node structure and defaults
3. ✅ **JSON** — export/import with backward compatibility
4. ✅ **Scenario** — `budgetMax` attribute added
5. ✅ **SCRIPT 660–663** — OPT Engine (Phases 0–4)
6. ✅ **SCRIPT 935** — OPT UI Handler (launch modal, error modal, results modal)
7. ✅ **Controls bar** — Optimize button added alongside Auto-Position
8. ✅ **RLT seeding** — Phase 1 initializes from RLT solution (SCRIPT 661)
9. ✅ **Budget enforcement** — Phase 0b uses zero-buffer init; Phase 1 trims RLT seed to budget
10. ⬜ **UI — toleranceMandatory** — detail panel, tooltip, table column, scenario tracking

---

## 13. Bug Fixes (v1.3)

### Phase 0b — False infeasibility with no mandatory nodes (fixed March 6, 2026)

**Symptom:** OPT reported budget infeasibility even when no nodes had `toleranceMandatory = true`.

**Root cause:** `checkBudgetFeasibility` called `runPhase1` (RLT seed) instead of starting from zero buffers. The RLT solution places buffers on all demand nodes regardless of mandatory status, inflating `minF2` well above the true minimum mandatory cost. With a tight budget, this caused a false infeasibility.

**Fix (SCRIPT 660):** Phase 0b now initializes all non-locked nodes to zero buffers before running Phase 2a. Since Phase 2a only adds buffers for `toleranceMandatory` nodes, `minF2` correctly reflects the minimum cost to satisfy mandatory constraints only. If no mandatory nodes exist, Phase 2a adds nothing → `minF2 = 0` → always feasible regardless of budget.

### Phase 1 — RLT seed not trimmed to budget (fixed March 6, 2026)

**Symptom:** After successful Phase 0, the final OPT result exceeded `budgetMax`.

**Root cause:** `runPhase1` applied the RLT seed without checking the budget. The RLT solution can exceed any given budget (it is budget-unaware). Phases 2b/3/4 check the budget per-candidate but cannot undo the seed state — they started from an already-invalid state.

**Fix (SCRIPT 661):** After applying the RLT seed and running `fullRecalc`, Phase 1 checks if `f2 > budgetMax`. If so, it removes the most expensive non-locked buffer and recalculates, repeating until `f2 ≤ budgetMax`. This greedy trim ensures Phases 2–4 always start from a budget-valid state.

---

**Document Version:** 1.3  
**Last Updated:** March 6, 2026
