// CLT (Cumulative Lead Time) Calculator
// Calculates longest path from raw materials to each node (unbuffered baseline)
// Bottom-up calculation: children before parents (reverse topological order)
// Formula: CLT = leadTime + MAX(child CLT)
// Independent of buffer positioning

const CLTCalculator = (function() {
  
  function calculateCLT(nodes) {
    console.log('ðŸ“Š CLT Calculator: Starting calculation...');
    
    // Convert Map to object if needed for topological sort
    const nodesObj = nodes instanceof Map ? Object.fromEntries(nodes) : nodes;
    
    // Get topological order (parents before children)
    const sorted = topologicalSort(nodesObj);
    
    if (!sorted) {
      console.error('âŒ CLT calculation failed: Invalid network topology');
      return false;
    }
    
    // Reverse the order for bottom-up processing (children before parents)
    const bottomUp = sorted.reverse();
    
    // Calculate CLT for each node (bottom-up)
    bottomUp.forEach(nodeId => {
      const node = nodes instanceof Map ? nodes.get(nodeId) : nodes[nodeId];
      if (!node) return;
      
      // Leaf nodes (no children): CLT = own lead time only
      if (!node.children || node.children.length === 0) {
        node.clt = node.leadTime;
        console.log(`  ${node.name}: CLT = ${node.clt} days (leaf node)`);
      } else {
        // Non-leaf nodes: CLT = leadTime + MAX(child CLT)
        let maxChildCLT = 0;
        
        node.children.forEach(child => {
          const childNode = nodes instanceof Map ? nodes.get(child.id) : nodes[child.id];  // âœ“ Use child.id (canonical format)
          if (childNode && childNode.clt !== undefined && childNode.clt !== null) {
            maxChildCLT = Math.max(maxChildCLT, childNode.clt);
          }
        });
        
        node.clt = node.leadTime + maxChildCLT;
        console.log(`  ${node.name}: CLT = ${node.leadTime} + ${maxChildCLT} = ${node.clt} days`);
      }
    });
    
    console.log('âœ“ CLT calculation complete');
    return true;
  }
  
  return {
    calculateCLT
  };
})();

// Expose to window
window.CLTCalculator = CLTCalculator;
console.log('âœ“ CLT calculator loaded');
