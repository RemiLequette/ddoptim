import { DEFAULT_BUFFER_PROFILES, FALLBACK_BUFFER_PROFILE } from "./default-buffer-profiles.js";

export const NUMERIC_EPSILON = 1e-9;

function asFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNonNegativeNumber(value, fallback = 0) {
  return Math.max(0, asFiniteNumber(value, fallback));
}

function normalizeChildren(children) {
  if (!Array.isArray(children)) {
    return [];
  }

  return children
    .filter((entry) => entry && typeof entry === "object" && entry.id !== undefined && entry.id !== null)
    .map((entry) => ({
      id: String(entry.id),
      quantity: asNonNegativeNumber(entry.quantity, 1),
      linkType: typeof entry.linkType === "string" ? entry.linkType : "bom"
    }));
}

function normalizeProfile(rawProfile) {
  if (!rawProfile || typeof rawProfile !== "object") {
    return { ...FALLBACK_BUFFER_PROFILE };
  }

  const usesFlatFormat =
    rawProfile.dlt_threshold_short !== undefined ||
    rawProfile.dlt_threshold_medium !== undefined ||
    rawProfile.leadTimeFactor_short !== undefined ||
    rawProfile.leadTimeFactor_medium !== undefined ||
    rawProfile.leadTimeFactor_long !== undefined;

  if (usesFlatFormat) {
    const c = asNonNegativeNumber(rawProfile.dlt_threshold_short, 1);
    const m = Math.max(c + 0.0001, asNonNegativeNumber(rawProfile.dlt_threshold_medium, c + 1));

    return {
      variabilityFactor: asNonNegativeNumber(rawProfile.variabilityFactor, 0),
      dltThresholds: { C: c, M: m },
      leadTimeFactors: {
        short: asNonNegativeNumber(rawProfile.leadTimeFactor_short, 0),
        medium: asNonNegativeNumber(rawProfile.leadTimeFactor_medium, 0),
        long: asNonNegativeNumber(rawProfile.leadTimeFactor_long, 0)
      }
    };
  }

  const c = asNonNegativeNumber(rawProfile.dltThresholds?.C, 1);
  const m = Math.max(c + 0.0001, asNonNegativeNumber(rawProfile.dltThresholds?.M, c + 1));

  return {
    variabilityFactor: asNonNegativeNumber(rawProfile.variabilityFactor, 0),
    dltThresholds: { C: c, M: m },
    leadTimeFactors: {
      short: asNonNegativeNumber(rawProfile.leadTimeFactors?.short, 0),
      medium: asNonNegativeNumber(rawProfile.leadTimeFactors?.medium, 0),
      long: asNonNegativeNumber(rawProfile.leadTimeFactors?.long, 0)
    }
  };
}

export function normalizeBufferProfiles(rawProfiles) {
  const normalized = {};

  for (const [profileCode, profile] of Object.entries(DEFAULT_BUFFER_PROFILES)) {
    normalized[profileCode] = normalizeProfile(profile);
  }

  if (rawProfiles && typeof rawProfiles === "object") {
    for (const [profileCode, profile] of Object.entries(rawProfiles)) {
      normalized[String(profileCode).toUpperCase()] = normalizeProfile(profile);
    }
  }

  return normalized;
}

function normalizeNode(rawNode) {
  if (!rawNode || typeof rawNode !== "object") {
    throw new Error("Each node must be an object.");
  }

  if (rawNode.id === undefined || rawNode.id === null || String(rawNode.id).trim() === "") {
    throw new Error("Each node must define a non-empty id.");
  }

  const nodeId = String(rawNode.id);

  return {
    id: nodeId,
    product: typeof rawNode.product === "string" && rawNode.product.trim() !== "" ? rawNode.product : nodeId,
    description: typeof rawNode.description === "string" ? rawNode.description : "",
    location: typeof rawNode.location === "string" && rawNode.location.trim() !== "" ? rawNode.location : "plant",
    type: typeof rawNode.type === "string" ? rawNode.type : "intermediate",
    children: normalizeChildren(rawNode.children),
    parents: [],
    leadTime: asNonNegativeNumber(rawNode.leadTime, 0),
    customerTolerance: asNonNegativeNumber(rawNode.customerTolerance, 0),
    toleranceMandatory: Boolean(rawNode.toleranceMandatory),
    visibilityHorizon: asNonNegativeNumber(rawNode.visibilityHorizon, 0),
    independentADU: asNonNegativeNumber(rawNode.independentADU, 0),
    bufferProfile:
      rawNode.bufferProfile === null || rawNode.bufferProfile === undefined
        ? null
        : String(rawNode.bufferProfile).toUpperCase(),
    moq: asNonNegativeNumber(rawNode.moq, 0),
    orderCycle: asNonNegativeNumber(rawNode.orderCycle, 0),
    unitCost: asNonNegativeNumber(rawNode.unitCost, 0),
    hasBuffer: Boolean(rawNode.hasBuffer),
    bufferLocked: Boolean(rawNode.bufferLocked),
    bufferRationale: typeof rawNode.bufferRationale === "string" ? rawNode.bufferRationale : "",
    calculatedADU: 0,
    clt: 0,
    dlt: 0,
    requiredLeadTime: Number.POSITIVE_INFINITY,
    deliveryLeadTime: null,
    missingCustomerLeadTime: null,
    ltExceeding: null,
    bufferSizing: null
  };
}

function buildParentIndex(nodes) {
  for (const node of nodes.values()) {
    for (const childRef of node.children) {
      const childNode = nodes.get(childRef.id);
      if (!childNode) {
        throw new Error(`Node \"${node.id}\" references missing child \"${childRef.id}\".`);
      }

      childNode.parents.push({
        id: node.id,
        quantity: asNonNegativeNumber(childRef.quantity, 1),
        linkType: childRef.linkType
      });
    }
  }
}

export function getTopologicalOrder(nodes) {
  const indegree = new Map();
  const adjacency = new Map();

  for (const [nodeId, node] of nodes) {
    indegree.set(nodeId, 0);
    adjacency.set(nodeId, node.children.map((childRef) => childRef.id));
  }

  for (const node of nodes.values()) {
    for (const childRef of node.children) {
      indegree.set(childRef.id, (indegree.get(childRef.id) ?? 0) + 1);
    }
  }

  const queue = [...indegree.entries()]
    .filter(([, value]) => value === 0)
    .map(([nodeId]) => nodeId)
    .sort();

  const order = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    order.push(nodeId);

    for (const childId of adjacency.get(nodeId) ?? []) {
      const nextValue = (indegree.get(childId) ?? 0) - 1;
      indegree.set(childId, nextValue);
      if (nextValue === 0) {
        queue.push(childId);
        queue.sort();
      }
    }
  }

  if (order.length !== nodes.size) {
    throw new Error("The network contains a cycle. Algorithms require a DAG.");
  }

  return order;
}

function resolveProfile(node, bufferProfiles) {
  if (node.bufferProfile && bufferProfiles[node.bufferProfile]) {
    return bufferProfiles[node.bufferProfile];
  }

  return FALLBACK_BUFFER_PROFILE;
}

function getLeadTimeFactorForProfile(profile, dlt) {
  if (dlt <= profile.dltThresholds.C) {
    return profile.leadTimeFactors.short;
  }
  if (dlt <= profile.dltThresholds.M) {
    return profile.leadTimeFactors.medium;
  }
  return profile.leadTimeFactors.long;
}

function calculateAdu(nodes, topologicalOrder) {
  for (const nodeId of topologicalOrder) {
    const node = nodes.get(nodeId);
    const dependentAdu = node.parents.reduce((total, parentRef) => {
      const parentNode = nodes.get(parentRef.id);
      if (!parentNode) {
        return total;
      }
      return total + parentNode.calculatedADU * parentRef.quantity;
    }, 0);

    node.calculatedADU = asNonNegativeNumber(node.independentADU + dependentAdu, 0);
  }
}

function calculateClt(nodes, topologicalOrder) {
  const reverseOrder = [...topologicalOrder].reverse();

  for (const nodeId of reverseOrder) {
    const node = nodes.get(nodeId);
    if (node.children.length === 0) {
      node.clt = node.leadTime;
      continue;
    }

    const maxChildClt = Math.max(
      ...node.children.map((childRef) => {
        const childNode = nodes.get(childRef.id);
        return childNode ? childNode.clt : 0;
      })
    );

    node.clt = node.leadTime + maxChildClt;
  }
}

function calculateDlt(nodes, topologicalOrder) {
  const reverseOrder = [...topologicalOrder].reverse();

  for (const nodeId of reverseOrder) {
    const node = nodes.get(nodeId);
    if (node.hasBuffer || node.children.length === 0) {
      node.dlt = node.leadTime;
      continue;
    }

    const maxChildDlt = Math.max(
      ...node.children.map((childRef) => {
        const childNode = nodes.get(childRef.id);
        return childNode ? childNode.dlt : 0;
      })
    );

    node.dlt = node.leadTime + maxChildDlt;
  }
}

function calculateDeliveryLeadTime(nodes) {
  for (const node of nodes.values()) {
    if (node.independentADU > 0) {
      const deliveryLeadTime = node.hasBuffer ? 0 : node.dlt;
      node.deliveryLeadTime = deliveryLeadTime;
      node.missingCustomerLeadTime = Math.max(deliveryLeadTime - node.customerTolerance, 0);
      node.ltExceeding = Math.max(node.customerTolerance - deliveryLeadTime, 0);
    } else {
      node.deliveryLeadTime = null;
      node.missingCustomerLeadTime = null;
      node.ltExceeding = null;
    }
  }
}

function calculateBufferSizing(nodes, bufferProfiles) {
  for (const node of nodes.values()) {
    if (!node.hasBuffer) {
      node.bufferSizing = null;
      continue;
    }

    const profile = resolveProfile(node, bufferProfiles);
    const adu = asNonNegativeNumber(node.calculatedADU, 0);
    const dlt = asNonNegativeNumber(node.dlt, 0);
    const unitCost = asNonNegativeNumber(node.unitCost, 0);
    const moq = asNonNegativeNumber(node.moq, 0);
    const orderCycle = asNonNegativeNumber(node.orderCycle, 0);

    const leadTimeFactor = getLeadTimeFactorForProfile(profile, dlt);

    const yellow = adu * dlt;
    const green = Math.max(yellow * leadTimeFactor, moq, adu * orderCycle, 0);
    const red = green * (1 + asNonNegativeNumber(profile.variabilityFactor, 0));
    const topOfYellow = red + yellow;
    const topOfGreen = topOfYellow + green;
    const averageStock = red + yellow + green / 2;
    const inventoryValue = averageStock * unitCost;

    node.bufferSizing = {
      yellow,
      green,
      red,
      topOfYellow,
      topOfGreen,
      averageStock,
      inventoryValue
    };
  }
}

export function recalculateNetworkMetrics(context) {
  calculateAdu(context.nodes, context.topologicalOrder);
  calculateClt(context.nodes, context.topologicalOrder);
  calculateDlt(context.nodes, context.topologicalOrder);
  calculateDeliveryLeadTime(context.nodes);
  calculateBufferSizing(context.nodes, context.bufferProfiles);
  return context;
}

export function createAlgorithmContext(rawModel) {
  if (!rawModel || typeof rawModel !== "object") {
    throw new Error("Model must be a JSON object.");
  }

  if (!Array.isArray(rawModel.nodes)) {
    throw new Error("Model must include a nodes array.");
  }

  const nodes = new Map();
  for (const rawNode of rawModel.nodes) {
    const normalizedNode = normalizeNode(rawNode);
    if (nodes.has(normalizedNode.id)) {
      throw new Error(`Duplicate node id \"${normalizedNode.id}\" found in model.`);
    }
    nodes.set(normalizedNode.id, normalizedNode);
  }

  buildParentIndex(nodes);

  const context = {
    metadata: rawModel.metadata ?? {},
    scenario: rawModel.scenario ?? {},
    bufferProfiles: normalizeBufferProfiles(rawModel.bufferProfiles),
    nodes,
    topologicalOrder: getTopologicalOrder(nodes)
  };

  recalculateNetworkMetrics(context);
  return context;
}

export function snapshotAlgorithmState(context) {
  const snapshot = new Map();

  for (const node of context.nodes.values()) {
    snapshot.set(node.id, {
      hasBuffer: node.hasBuffer,
      bufferRationale: node.bufferRationale,
      requiredLeadTime: node.requiredLeadTime
    });
  }

  return snapshot;
}

export function restoreAlgorithmState(context, snapshot) {
  for (const node of context.nodes.values()) {
    const saved = snapshot.get(node.id);
    if (!saved) {
      continue;
    }

    node.hasBuffer = saved.hasBuffer;
    node.bufferRationale = saved.bufferRationale;
    node.requiredLeadTime = saved.requiredLeadTime;
  }

  recalculateNetworkMetrics(context);
}

export function captureBufferState(context) {
  const bufferedNodes = [];

  for (const node of context.nodes.values()) {
    if (node.hasBuffer) {
      bufferedNodes.push({
        nodeId: node.id,
        nodeName: node.product || node.id,
        locked: node.bufferLocked
      });
    }
  }

  return bufferedNodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
}

export function compareBufferStates(beforeState, afterState) {
  const beforeIds = new Set(beforeState.map((entry) => entry.nodeId));
  const afterIds = new Set(afterState.map((entry) => entry.nodeId));

  return {
    added: afterState.filter((entry) => !beforeIds.has(entry.nodeId)),
    removed: beforeState.filter((entry) => !afterIds.has(entry.nodeId)),
    unchanged: afterState.filter((entry) => beforeIds.has(entry.nodeId))
  };
}

export function computeObjectives(context) {
  let f0 = 0;
  let f1 = 0;
  let f2 = 0;

  for (const node of context.nodes.values()) {
    if (node.independentADU > 0) {
      const deliveryLeadTime = node.hasBuffer ? 0 : node.dlt;
      const overrun = Math.max(deliveryLeadTime - node.customerTolerance, 0);
      f1 += overrun;
      if (node.toleranceMandatory) {
        f0 += overrun;
      }
    }

    if (node.hasBuffer) {
      f2 += node.bufferSizing?.inventoryValue ?? 0;
    }
  }

  return { f0, f1, f2 };
}

export function listAddCandidates(context) {
  return [...context.nodes.values()]
    .filter((node) => !node.bufferLocked && !node.hasBuffer)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function listRemoveCandidates(context) {
  return [...context.nodes.values()]
    .filter((node) => !node.bufferLocked && node.hasBuffer)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function isBudgetRespected(context, budgetMax) {
  if (budgetMax === null || budgetMax === undefined) {
    return true;
  }

  return computeObjectives(context).f2 <= budgetMax + NUMERIC_EPSILON;
}

export function getUpstreamAncestors(context, startNodeId) {
  const ancestors = [];
  const visited = new Set();
  const queue = [];

  const startNode = context.nodes.get(startNodeId);
  if (!startNode) {
    return ancestors;
  }

  for (const childRef of startNode.children) {
    queue.push(childRef.id);
  }

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

    ancestors.push(node);

    for (const childRef of node.children) {
      if (!visited.has(childRef.id)) {
        queue.push(childRef.id);
      }
    }
  }

  return ancestors;
}
