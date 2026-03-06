import {
  NUMERIC_EPSILON,
  captureBufferState,
  compareBufferStates,
  computeObjectives,
  getUpstreamAncestors,
  isBudgetRespected,
  listAddCandidates,
  listRemoveCandidates,
  recalculateNetworkMetrics,
  restoreAlgorithmState,
  snapshotAlgorithmState
} from "./model-utils.js";
import { runRltAlgorithm } from "./rlt.js";

function objectiveValue(objectives, target) {
  return target === "f0" ? objectives.f0 : objectives.f1;
}

function findBlockingLockedNodes(context, targetNodeId) {
  const blockers = [];
  const visited = new Set();
  const queue = [targetNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    const node = context.nodes.get(nodeId);
    if (!node) {
      continue;
    }

    if (nodeId !== targetNodeId && node.bufferLocked && !node.hasBuffer) {
      blockers.push({
        nodeId: node.id,
        product: node.product || node.id
      });
    }

    for (const childRef of node.children) {
      if (!visited.has(childRef.id)) {
        queue.push(childRef.id);
      }
    }
  }

  return blockers;
}

function checkStructuralFeasibility(context) {
  const snapshot = snapshotAlgorithmState(context);

  for (const node of context.nodes.values()) {
    if (!node.bufferLocked) {
      node.hasBuffer = true;
    }
  }

  recalculateNetworkMetrics(context);

  const infeasibleNodes = [];

  for (const node of context.nodes.values()) {
    if (!node.toleranceMandatory || node.independentADU <= 0) {
      continue;
    }

    const deliveryLeadTime = node.hasBuffer ? 0 : node.dlt;
    if (deliveryLeadTime > node.customerTolerance + NUMERIC_EPSILON) {
      infeasibleNodes.push({
        nodeId: node.id,
        product: node.product || node.id,
        minimumDeliveryLeadTime: deliveryLeadTime,
        tolerance: node.customerTolerance,
        cause: "locked_buffer",
        blockingNodes: findBlockingLockedNodes(context, node.id)
      });
    }
  }

  restoreAlgorithmState(context, snapshot);

  return {
    feasible: infeasibleNodes.length === 0,
    infeasibleNodes
  };
}

function runGreedyCoveragePhase(context, options) {
  const { target, budgetMax = null, lockF0 = Number.POSITIVE_INFINITY } = options;

  const added = [];
  const nodeLimit = context.nodes.size + 1;
  let iterationCount = 0;

  while (iterationCount < nodeLimit) {
    iterationCount += 1;

    const objectives = computeObjectives(context);
    const currentValue = objectiveValue(objectives, target);
    if (currentValue <= NUMERIC_EPSILON) {
      break;
    }

    let bestCandidate = null;
    let bestDelta = 0;
    let bestCost = Number.POSITIVE_INFINITY;

    for (const candidate of listAddCandidates(context)) {
      candidate.hasBuffer = true;
      recalculateNetworkMetrics(context);

      const trialObjectives = computeObjectives(context);

      const budgetOk = isBudgetRespected(context, budgetMax);
      const f0Locked = target === "f1" ? trialObjectives.f0 <= lockF0 + NUMERIC_EPSILON : true;

      const delta = currentValue - objectiveValue(trialObjectives, target);
      const candidateCost = candidate.bufferSizing?.inventoryValue ?? 0;

      if (
        budgetOk &&
        f0Locked &&
        (delta > bestDelta + NUMERIC_EPSILON ||
          (Math.abs(delta - bestDelta) <= NUMERIC_EPSILON && delta > NUMERIC_EPSILON && candidateCost < bestCost))
      ) {
        bestCandidate = candidate;
        bestDelta = delta;
        bestCost = candidateCost;
      }

      candidate.hasBuffer = false;
      recalculateNetworkMetrics(context);
    }

    if (!bestCandidate || bestDelta <= NUMERIC_EPSILON) {
      break;
    }

    bestCandidate.hasBuffer = true;
    recalculateNetworkMetrics(context);

    added.push({
      nodeId: bestCandidate.id,
      product: bestCandidate.product || bestCandidate.id,
      inventoryValue: bestCandidate.bufferSizing?.inventoryValue ?? 0,
      phase: target === "f0" ? "2a" : "2b"
    });
  }

  const finalObjectives = computeObjectives(context);

  return {
    buffersAdded: added,
    finalF0: finalObjectives.f0,
    finalF1: finalObjectives.f1
  };
}

function checkBudgetFeasibility(context, budgetMax) {
  if (budgetMax === null || budgetMax === undefined) {
    return {
      feasible: true,
      requiredBudget: null,
      availableBudget: null
    };
  }

  const snapshot = snapshotAlgorithmState(context);

  for (const node of context.nodes.values()) {
    if (!node.bufferLocked) {
      node.hasBuffer = false;
    }
  }
  recalculateNetworkMetrics(context);

  runGreedyCoveragePhase(context, { target: "f0", budgetMax: null });

  const requiredBudget = computeObjectives(context).f2;

  restoreAlgorithmState(context, snapshot);

  return {
    feasible: requiredBudget <= budgetMax + NUMERIC_EPSILON,
    requiredBudget,
    availableBudget: budgetMax
  };
}

function runFeasibilityCheck(context, budgetMax) {
  const structural = checkStructuralFeasibility(context);
  if (!structural.feasible) {
    return {
      feasible: false,
      report: {
        structural,
        budget: null
      }
    };
  }

  const budget = checkBudgetFeasibility(context, budgetMax);
  if (!budget.feasible) {
    return {
      feasible: false,
      report: {
        structural,
        budget
      }
    };
  }

  return {
    feasible: true,
    report: {
      structural,
      budget
    }
  };
}

function trimSeedToBudget(context, budgetMax) {
  if (budgetMax === null || budgetMax === undefined) {
    return [];
  }

  const trimmed = [];

  while (!isBudgetRespected(context, budgetMax)) {
    const removable = listRemoveCandidates(context)
      .map((node) => ({ node, cost: node.bufferSizing?.inventoryValue ?? 0 }))
      .sort((a, b) => b.cost - a.cost);

    if (removable.length === 0) {
      break;
    }

    const candidate = removable[0].node;
    candidate.hasBuffer = false;
    recalculateNetworkMetrics(context);

    trimmed.push({
      nodeId: candidate.id,
      product: candidate.product || candidate.id,
      estimatedValue: removable[0].cost
    });
  }

  return trimmed;
}

function runPhase1FromRltSeed(context, budgetMax) {
  const beforeSnapshot = snapshotAlgorithmState(context);
  const beforeBuffers = new Set(captureBufferState(context).map((entry) => entry.nodeId));

  const rltResult = runRltAlgorithm(context, {
    respectLockedBuffers: true,
    logIterations: false,
    validate: false
  });

  const seededBuffers = new Set(captureBufferState(context).map((entry) => entry.nodeId));

  restoreAlgorithmState(context, beforeSnapshot);

  for (const node of context.nodes.values()) {
    if (node.bufferLocked) {
      node.hasBuffer = beforeBuffers.has(node.id);
      continue;
    }

    node.hasBuffer = seededBuffers.has(node.id);
  }

  recalculateNetworkMetrics(context);

  const budgetTrimmed = trimSeedToBudget(context, budgetMax);

  return {
    seedSource: rltResult.buffersSet.length > 0 || seededBuffers.size > 0 ? "rlt" : "fallback",
    initialObjectives: computeObjectives(context),
    budgetTrimmed
  };
}

function runPhase3Reduction(context, lockedF0, lockedF1) {
  const removed = [];
  const initialF2 = computeObjectives(context).f2;

  const candidates = listRemoveCandidates(context)
    .map((node) => ({ node, cost: node.bufferSizing?.inventoryValue ?? 0 }))
    .sort((a, b) => b.cost - a.cost);

  for (const entry of candidates) {
    const node = entry.node;
    if (!node.hasBuffer || node.bufferLocked) {
      continue;
    }

    node.hasBuffer = false;
    recalculateNetworkMetrics(context);

    const objectives = computeObjectives(context);
    const coverageStable =
      objectives.f0 <= lockedF0 + NUMERIC_EPSILON && objectives.f1 <= lockedF1 + NUMERIC_EPSILON;

    if (coverageStable) {
      removed.push({
        nodeId: node.id,
        product: node.product || node.id,
        savedValue: entry.cost,
        phase: "3"
      });
    } else {
      node.hasBuffer = true;
      recalculateNetworkMetrics(context);
    }
  }

  const finalF2 = computeObjectives(context).f2;

  return {
    buffersRemoved: removed,
    f2Reduction: initialF2 - finalF2
  };
}

function evaluateSwap(context, nodeToRemove, nodesToAdd, lockedF0, lockedF1, budgetMax) {
  const preSwapF2 = computeObjectives(context).f2;

  nodeToRemove.hasBuffer = false;
  for (const node of nodesToAdd) {
    node.hasBuffer = true;
  }
  recalculateNetworkMetrics(context);

  const trialObjectives = computeObjectives(context);
  const isValid =
    trialObjectives.f0 <= lockedF0 + NUMERIC_EPSILON &&
    trialObjectives.f1 <= lockedF1 + NUMERIC_EPSILON &&
    isBudgetRespected(context, budgetMax) &&
    trialObjectives.f2 < preSwapF2 - NUMERIC_EPSILON;

  const deltaF2 = preSwapF2 - trialObjectives.f2;

  nodeToRemove.hasBuffer = true;
  for (const node of nodesToAdd) {
    node.hasBuffer = false;
  }
  recalculateNetworkMetrics(context);

  return {
    isValid,
    deltaF2
  };
}

function runPhase4SwapSearch(context, lockedF0, lockedF1, budgetMax) {
  const swapsApplied = [];
  let improved = true;
  let passCount = 0;
  const maxPasses = context.nodes.size * 2;

  while (improved && passCount < maxPasses) {
    passCount += 1;
    improved = false;

    const removable = listRemoveCandidates(context)
      .map((node) => ({ node, cost: node.bufferSizing?.inventoryValue ?? 0 }))
      .sort((a, b) => b.cost - a.cost);

    let bestSwap = null;

    for (const candidate of removable) {
      const nodeToRemove = candidate.node;
      if (!nodeToRemove.hasBuffer || nodeToRemove.bufferLocked) {
        continue;
      }

      const upstreamCandidates = getUpstreamAncestors(context, nodeToRemove.id)
        .filter((node) => !node.bufferLocked && !node.hasBuffer)
        .slice(0, 12);

      for (const upstreamNode of upstreamCandidates) {
        const trial = evaluateSwap(context, nodeToRemove, [upstreamNode], lockedF0, lockedF1, budgetMax);
        if (!trial.isValid) {
          continue;
        }

        if (!bestSwap || trial.deltaF2 > bestSwap.deltaF2 + NUMERIC_EPSILON) {
          bestSwap = {
            nodeToRemove,
            nodesToAdd: [upstreamNode],
            deltaF2: trial.deltaF2
          };
        }
      }

      for (let i = 0; i < upstreamCandidates.length; i += 1) {
        for (let j = i + 1; j < upstreamCandidates.length; j += 1) {
          const pair = [upstreamCandidates[i], upstreamCandidates[j]];
          const trial = evaluateSwap(context, nodeToRemove, pair, lockedF0, lockedF1, budgetMax);
          if (!trial.isValid) {
            continue;
          }

          if (!bestSwap || trial.deltaF2 > bestSwap.deltaF2 + NUMERIC_EPSILON) {
            bestSwap = {
              nodeToRemove,
              nodesToAdd: pair,
              deltaF2: trial.deltaF2
            };
          }
        }
      }
    }

    if (!bestSwap) {
      continue;
    }

    bestSwap.nodeToRemove.hasBuffer = false;
    for (const node of bestSwap.nodesToAdd) {
      node.hasBuffer = true;
    }
    recalculateNetworkMetrics(context);

    swapsApplied.push({
      removed: {
        nodeId: bestSwap.nodeToRemove.id,
        product: bestSwap.nodeToRemove.product || bestSwap.nodeToRemove.id
      },
      added: bestSwap.nodesToAdd.map((node) => ({
        nodeId: node.id,
        product: node.product || node.id
      })),
      deltaF2: bestSwap.deltaF2,
      phase: "4"
    });

    improved = true;
  }

  return { swapsApplied };
}

export function runOptAlgorithm(context, options = {}) {
  const { budgetMax = null, includePhase4 = true } = options;

  recalculateNetworkMetrics(context);

  const preRunSnapshot = snapshotAlgorithmState(context);
  const beforeObjectives = computeObjectives(context);
  const beforeState = captureBufferState(context);

  const feasibility = runFeasibilityCheck(context, budgetMax);
  if (!feasibility.feasible) {
    restoreAlgorithmState(context, preRunSnapshot);

    return {
      feasible: false,
      feasibilityReport: feasibility.report,
      before: beforeObjectives,
      after: null,
      changes: null,
      beforeState,
      afterState: beforeState,
      log: ["Phase 0: infeasible"]
    };
  }

  const phase1 = runPhase1FromRltSeed(context, budgetMax);
  const phase2a = runGreedyCoveragePhase(context, { target: "f0", budgetMax });
  const lockedF0 = computeObjectives(context).f0;
  const phase2b = runGreedyCoveragePhase(context, {
    target: "f1",
    budgetMax,
    lockF0: lockedF0
  });

  const lockedObjectives = computeObjectives(context);
  const phase3 = runPhase3Reduction(context, lockedObjectives.f0, lockedObjectives.f1);
  const phase4 = includePhase4
    ? runPhase4SwapSearch(context, lockedObjectives.f0, lockedObjectives.f1, budgetMax)
    : { swapsApplied: [] };

  const afterObjectives = computeObjectives(context);
  const afterState = captureBufferState(context);

  const beforeIds = new Set(beforeState.map((entry) => entry.nodeId));
  const added = afterState.filter((entry) => !beforeIds.has(entry.nodeId));
  const removed = beforeState.filter((entry) => !new Set(afterState.map((entry) => entry.nodeId)).has(entry.nodeId));

  return {
    feasible: true,
    feasibilityReport: feasibility.report,
    before: beforeObjectives,
    after: afterObjectives,
    changes: {
      added,
      removed,
      swaps: phase4.swapsApplied,
      phase1,
      phase2aBuffers: phase2a.buffersAdded,
      phase2bBuffers: phase2b.buffersAdded,
      phase3Removals: phase3.buffersRemoved
    },
    beforeState,
    afterState,
    stateDiff: compareBufferStates(beforeState, afterState),
    log: [
      "Phase 0: feasible",
      `Phase 1 seed source: ${phase1.seedSource}`,
      `Phase 2a buffers added: ${phase2a.buffersAdded.length}`,
      `Phase 2b buffers added: ${phase2b.buffersAdded.length}`,
      `Phase 3 buffers removed: ${phase3.buffersRemoved.length}`,
      `Phase 4 swaps applied: ${phase4.swapsApplied.length}`
    ]
  };
}

export function runOptFeasibilityCheck(context, budgetMax = null) {
  recalculateNetworkMetrics(context);
  return runFeasibilityCheck(context, budgetMax);
}
