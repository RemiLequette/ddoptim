import {
  NUMERIC_EPSILON,
  captureBufferState,
  compareBufferStates,
  recalculateNetworkMetrics
} from "./model-utils.js";

function validateNetworkForRlt(context) {
  const errors = [];

  const demandNodes = [...context.nodes.values()].filter((node) => node.independentADU > 0);
  if (demandNodes.length === 0) {
    errors.push("No demand nodes found (independentADU > 0).");
  }

  for (const node of context.nodes.values()) {
    if (node.leadTime < 0) {
      errors.push(`Node \"${node.id}\" has a negative leadTime (${node.leadTime}).`);
    }

    if (node.customerTolerance < 0) {
      errors.push(`Node \"${node.id}\" has a negative customerTolerance (${node.customerTolerance}).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function initializeRequiredLeadTimes(context, respectLockedBuffers) {
  let initializedCount = 0;
  let resetCount = 0;

  for (const node of context.nodes.values()) {
    if (!respectLockedBuffers || !node.bufferLocked) {
      if (node.hasBuffer) {
        resetCount += 1;
      }
      node.hasBuffer = false;
      node.bufferRationale = "";
    }

    if (node.independentADU > 0) {
      node.requiredLeadTime = node.customerTolerance;
      initializedCount += 1;
    } else {
      node.requiredLeadTime = Number.POSITIVE_INFINITY;
    }
  }

  return { initializedCount, resetCount };
}

function propagateRequirements(context, logIterations) {
  const result = {
    buffersSet: [],
    unsolvableConstraints: [],
    nodesProcessed: 0,
    propagations: 0
  };

  for (const nodeId of context.topologicalOrder) {
    const node = context.nodes.get(nodeId);
    if (!Number.isFinite(node.requiredLeadTime)) {
      continue;
    }

    result.nodesProcessed += 1;

    const remainingTime = node.requiredLeadTime - node.leadTime;

    if (node.bufferLocked && node.hasBuffer) {
      if (logIterations) {
        console.log(`[RLT] ${node.id}: locked buffer present, no propagation.`);
      }
      continue;
    }

    if (remainingTime < -NUMERIC_EPSILON) {
      if (!node.bufferLocked) {
        node.hasBuffer = true;
        node.bufferRationale = "mandatory_rlt";
        result.buffersSet.push({
          nodeId: node.id,
          nodeName: node.product || node.id,
          reason: "mandatory",
          requiredLeadTime: node.requiredLeadTime,
          leadTime: node.leadTime,
          remainingTime
        });

        if (logIterations) {
          console.log(
            `[RLT] Buffer set on ${node.id} (deficit=${Math.abs(remainingTime).toFixed(2)} days).`
          );
        }
      } else {
        result.unsolvableConstraints.push({
          nodeId: node.id,
          nodeName: node.product || node.id,
          requiredLeadTime: node.requiredLeadTime,
          leadTime: node.leadTime,
          deficit: Math.abs(remainingTime),
          reason: "locked_without_buffer"
        });

        if (logIterations) {
          console.warn(
            `[RLT] Unsolvable node ${node.id}: locked without buffer and deficit=${Math.abs(
              remainingTime
            ).toFixed(2)} days.`
          );
        }
      }
      continue;
    }

    for (const childRef of node.children) {
      const childNode = context.nodes.get(childRef.id);
      if (!childNode) {
        continue;
      }

      const previousRlt = childNode.requiredLeadTime;
      childNode.requiredLeadTime = Math.min(previousRlt, remainingTime);

      if (childNode.requiredLeadTime < previousRlt - NUMERIC_EPSILON) {
        result.propagations += 1;

        if (logIterations) {
          const previousLabel = Number.isFinite(previousRlt) ? previousRlt.toFixed(2) : "Infinity";
          console.log(
            `[RLT] Propagate ${node.id} -> ${childNode.id} (RLT ${previousLabel} -> ${childNode.requiredLeadTime.toFixed(
              2
            )}).`
          );
        }
      }
    }
  }

  return result;
}

export function runRltAlgorithm(context, options = {}) {
  const { respectLockedBuffers = true, logIterations = false, validate = true } = options;

  if (validate) {
    const validation = validateNetworkForRlt(context);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        buffersSet: [],
        unsolvableConstraints: [],
        changes: { added: [], removed: [], unchanged: [] },
        beforeState: captureBufferState(context),
        afterState: captureBufferState(context)
      };
    }
  }

  const beforeState = captureBufferState(context);
  initializeRequiredLeadTimes(context, respectLockedBuffers);
  const propagation = propagateRequirements(context, logIterations);
  recalculateNetworkMetrics(context);

  const afterState = captureBufferState(context);
  const changes = compareBufferStates(beforeState, afterState);

  return {
    success: propagation.unsolvableConstraints.length === 0,
    buffersSet: propagation.buffersSet,
    unsolvableConstraints: propagation.unsolvableConstraints,
    changes,
    beforeState,
    afterState,
    nodesProcessed: propagation.nodesProcessed,
    propagations: propagation.propagations
  };
}

export function validateRltContext(context) {
  return validateNetworkForRlt(context);
}
