import { describe, expect, it } from "vitest";
import { runOptAlgorithm } from "../../src/algorithms/index.js";
import { createContextFromFixture } from "./helpers.js";

describe("OPT algorithm", () => {
  it("solves mandatory coverage when budget is feasible", async () => {
    const context = await createContextFromFixture("test-models/opt/mandatory-feasible.json");
    const budget = context.scenario?.budgetMax ?? null;

    const result = runOptAlgorithm(context, { budgetMax: budget });

    expect(result.feasible).toBe(true);
    expect(result.after.f0).toBe(0);
    expect(result.after.f2).toBeLessThanOrEqual(budget);

    const lockedNode = context.nodes.get("supplier_lock");
    expect(lockedNode.bufferLocked).toBe(true);
    expect(lockedNode.hasBuffer).toBe(true);
  });

  it("fails fast when mandatory constraints exceed budget", async () => {
    const context = await createContextFromFixture("test-models/opt/mandatory-budget-infeasible.json");
    const budget = context.scenario?.budgetMax ?? null;

    const result = runOptAlgorithm(context, { budgetMax: budget });

    expect(result.feasible).toBe(false);
    expect(result.feasibilityReport.structural.feasible).toBe(true);
    expect(result.feasibilityReport.budget.feasible).toBe(false);
    expect(result.feasibilityReport.budget.requiredBudget).toBeGreaterThan(budget);
  });
});
