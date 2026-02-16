// ADU Propagation Algorithm
// Calculates total ADU for all nodes: calculatedADU = independentADU + dependent demand from parents
// Top-down propagation: finished goods â†’ intermediates â†’ components

const ADUPropagation = (function() {
  
  function propagateADU(nodes, seasonalAdjustment = 1.0) {
    console.log('ðŸ“Š ADU Propagation: Starting calculation...');
    
    // Convert Map to object if needed
    const nodesObj = nodes instanceof Map ? Object.fromEntries(nodes) : nodes;
    
    // Step 1: Apply seasonal adjustment to independent ADU (finished goods and spare parts)
    Object.values(nodesObj).forEach(node => {
      if (node.independentADU > 0) {
        node.adjustedIndependentADU = node.independentADU * seasonalAdjustment;
      } else {
        node.adjustedIndependentADU = 0;
      }
    });
    
    // Step 2: Topological sort (parents before children)
    const sorted = topologicalSort(nodesObj);
    
    if (!sorted) {
      console.error('âŒ ADU Propagation failed: Network contains cycles');
      return false;
    }
    
    // Step 3: Propagate ADU top-down
    sorted.forEach(nodeId => {
      const node = nodesObj[nodeId];
      
      // Start with independent demand (already adjusted for season)
      let dependentADU = 0;
      
      // Add dependent demand from all parents
      if (node.parents && node.parents.length > 0) {
        node.parents.forEach(parent => {
          const parentNode = nodesObj[parent.id];  // âœ“ Use parent.id (canonical format)
          if (parentNode && parentNode.calculatedADU !== null) {
            dependentADU += parentNode.calculatedADU * parent.quantity;
          }
        });
      }
      
      // Total ADU = independent + dependent
      node.calculatedADU = node.adjustedIndependentADU + dependentADU;
      
      console.log(`  ${node.name}: calculatedADU = ${node.calculatedADU.toFixed(2)} (independent: ${node.adjustedIndependentADU.toFixed(2)}, dependent: ${dependentADU.toFixed(2)})`);
    });
    
    console.log('âœ“ ADU Propagation complete');
    return true;
  }
  
  // Topological sort using Kahn's algorithm (BFS-based)
  // Returns array of node IDs in topological order (parents before children)
  // Returns null if cycle detected
  function topologicalSort(nodes) {
    const nodeIds = Object.keys(nodes);
    const inDegree = {};
    const adjList = {};
    
    // Initialize
    nodeIds.forEach(id => {
      inDegree[id] = 0;
      adjList[id] = [];
    });
    
    // Build adjacency list and in-degree count
    // Edge direction: parent â†’ child (top-down)
    nodeIds.forEach(parentId => {
      const parent = nodes[parentId];
      if (parent.children) {
        parent.children.forEach(child => {
          adjList[parentId].push(child.id);  // âœ“ Use child.id (canonical format)
          inDegree[child.id]++;              // âœ“ Use child.id (canonical format)
        });
      }
    });
    
    // Start with nodes that have no parents (in-degree = 0)
    const queue = [];
    nodeIds.forEach(id => {
      if (inDegree[id] === 0) {
        queue.push(id);
      }
    });
    
    const sorted = [];
    
    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);
      
      // Reduce in-degree for all children
      adjList[current].forEach(childId => {
        inDegree[childId]--;
        if (inDegree[childId] === 0) {
          queue.push(childId);
        }
      });
    }
    
    // If sorted length < total nodes, there's a cycle
    if (sorted.length !== nodeIds.length) {
      console.error('âŒ Cycle detected in network');
      return null;
    }
    
    return sorted;
  }
  
  // Helper: Get all leaf nodes (no children)
  function getLeafNodes(nodes) {
    const nodesObj = nodes instanceof Map ? Object.fromEntries(nodes) : nodes;
    return Object.values(nodesObj).filter(node => 
      !node.children || node.children.length === 0
    ).map(node => node.id);
  }
  
  // Helper: Get all finished product nodes
  function getFinishedProducts(nodes) {
    const nodesObj = nodes instanceof Map ? Object.fromEntries(nodes) : nodes;
    return Object.values(nodesObj).filter(node => 
      node.type === 'finished_product'
    ).map(node => node.id);
  }
  
  // Expose topologicalSort for use by other modules
  return {
    propagateADU,
    topologicalSort,
    getLeafNodes,
    getFinishedProducts
  };
})();

// Expose to window
window.ADUPropagation = ADUPropagation;
// Also expose topological sort globally for CLT/DLT calculators
window.topologicalSort = ADUPropagation.topologicalSort;
console.log('âœ“ ADU Propagation module loaded');