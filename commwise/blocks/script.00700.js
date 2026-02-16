// DLT (Decoupled Lead Time) Calculator
// Calculates lead time from nearest buffer (or raw material) to each node
// Bottom-up calculation: children before parents (reverse topological order)
// Formula: DLT = leadTime + MAX(child DLT for unbuffered children only)
// Buffered children decouple the chain - their DLT is NOT propagated upward

const DLTCalculator = (function() {
  
  function calculateDLT(nodes) {
    console.log('ðŸ“Š DLT Calculator: Starting calculation...');
    
    // Convert Map to object if needed for topological sort
    const nodesObj = nodes instanceof Map ? Object.fromEntries(nodes) : nodes;
    
    // Get topological order (parents before children)
    const sorted = topologicalSort(nodesObj);
    
    if (!sorted) {
      console.error('âŒ DLT calculation failed: Invalid network topology');
      return false;
    }
    
    // Reverse the order for bottom-up processing (children before parents)
    const bottomUp = sorted.reverse();
    
    // Calculate DLT for each node (bottom-up)
    bottomUp.forEach(nodeId => {
      const node = nodes instanceof Map ? nodes.get(nodeId) : nodes[nodeId];
      if (!node) return;
      
      // Leaf nodes (no children): DLT = own lead time only
      if (!node.children || node.children.length === 0) {
        node.dlt = node.leadTime;
        console.log(`  ${node.name}: DLT = ${node.dlt} days (leaf node)`);
      } else {
        // Non-leaf nodes: DLT = leadTime + MAX(unbuffered child DLT)
        let maxUnbufferedChildDLT = 0;
        let unbufferedCount = 0;
        let bufferedCount = 0;
        
        node.children.forEach(child => {
          const childNode = nodes instanceof Map ? nodes.get(child.id) : nodes[child.id];  // âœ“ Use child.id (canonical format)
          if (childNode) {
            if (childNode.hasBuffer) {
              // Buffered child - ignore its DLT (it decouples the chain)
              bufferedCount++;
            } else {
              // Unbuffered child - consider its DLT
              unbufferedCount++;
              if (childNode.dlt !== undefined && childNode.dlt !== null) {
                maxUnbufferedChildDLT = Math.max(maxUnbufferedChildDLT, childNode.dlt);
              }
            }
          }
        });
        
        node.dlt = node.leadTime + maxUnbufferedChildDLT;
        console.log(`  ${node.name}: DLT = ${node.leadTime} + ${maxUnbufferedChildDLT} = ${node.dlt} days (${unbufferedCount} unbuffered, ${bufferedCount} buffered children)`);
      }
    });
    
    console.log('âœ“ DLT calculation complete');
    return true;
  }
  
  return {
    calculateDLT
  };
})();

// Expose to window
window.DLTCalculator = DLTCalculator;
console.log('âœ“ DLT calculator loaded');
