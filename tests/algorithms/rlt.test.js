import { describe, expect, it } from "vitest";
import { runRltAlgorithm } from "../../src/algorithms/index.js";
import { bufferedNodeIds, createContextFromFixture } from "./helpers.js";

describe("RLT algorithm", () => {
  it("propagates constraints and buffers deficit nodes", async () => {
    const context = await createContextFromFixture("test-models/rlt/basic-propagation.json");

    const result = runRltAlgorithm(context);

    expect(result.success).toBe(true);
    expect(result.unsolvableConstraints).toHaveLength(0);
    expect(bufferedNodeIds(context)).toEqual(["steel", "wheel"]);
    expect(result.changes.added.map((entry) => entry.nodeId).sort()).toEqual(["steel", "wheel"]);
  });

  it("reports locked deficit nodes as unsolvable", async () => {
    const context = await createContextFromFixture("test-models/rlt/locked-unsatisfied.json");

    const result = runRltAlgorithm(context);

    expect(result.success).toBe(false);
    expect(result.unsolvableConstraints).toHaveLength(1);
    expect(result.unsolvableConstraints[0].nodeId).toBe("critical_assembly");
    expect(bufferedNodeIds(context)).toEqual([]);
  });
});
