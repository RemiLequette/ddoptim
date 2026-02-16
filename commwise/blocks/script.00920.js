// UI Event Handlers - Buffer Decision Handlers
window.UIHandlers_BufferDecisions = (function() {
  
  // Helper: Recalculate buffer sizing for all buffered nodes
  function recalculateAllBufferSizing() {
    if (!window.currentNetwork || !window.currentNetwork.nodes) return;
    
    if (typeof window.calculateBufferSizing !== 'function') {
      console.warn('âš ï¸ calculateBufferSizing function not available');
      return;
    }
    
    let recalculatedCount = 0;
    window.currentNetwork.nodes.forEach(node => {
      if (node.hasBuffer) {
        window.calculateBufferSizing(node);
        recalculatedCount++;
      }
    });
    
    console.log(`âœ“ Recalculated buffer sizing for ${recalculatedCount} buffered nodes`);
    return recalculatedCount;
  }
  
  function handleHasBufferToggle(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    const oldValue = node.hasBuffer;
    node.hasBuffer = newValue;
    console.log(`Updated ${node.name} hasBuffer: ${oldValue} â†’ ${newValue}`);
    
    // Step 1: Recalculate DLT for entire network (buffer status affects parent DLT calculations)
    if (window.DLTCalculator && window.DLTCalculator.calculateDLT) {
      console.log('ðŸ“ Recalculating DLT (buffer status changed)...');
      window.DLTCalculator.calculateDLT(window.currentNetwork.nodes);
    }
    
    // Step 2: Recalculate buffer sizing for ALL buffered nodes
    // This is CRITICAL because:
    // - Parent nodes' DLT may have changed (impacts their Yellow zone)
    // - Parent nodes' buffer sizing depends on their children's DLT
    // - Example: Buffering "Rayons" reduces "Roue" DLT, which changes "Roue" buffer sizing
    console.log('ðŸ“ Recalculating buffer sizing for all buffered nodes (DLT changed)...');
    const count = recalculateAllBufferSizing();
    
    if (count > 0) {
      console.log(`âœ“ Buffer sizing updated for ${count} nodes due to DLT cascade`);
    }
    
    // Step 3: Recalculate delivery lead time for all nodes (buffer status affects deliveryLeadTime)
    if (window.DeliveryLeadTimeCalculator && window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime) {
      window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime(window.currentNetwork.nodes);
    }
    
    // Step 4: Re-render network to update node visuals and badges
    if (window.NetworkRenderer && window.NetworkRenderer.render) {
      console.log('ðŸŽ¨ Re-rendering network (preserving view)...');
      window.NetworkRenderer.render(window.currentNetwork, true); // preserveView = true
      console.log('âœ“ Network updated with new buffer status');
    }
    
    // Step 5: Update metrics display (total inventory value may have changed)
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  function handleBufferRationaleChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    node.bufferRationale = newValue.trim();
    console.log(`Updated ${node.name} bufferRationale`);
  }
  
  function handleBufferLockedChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    node.bufferLocked = newValue;
    console.log(`Updated ${node.name} bufferLocked: ${newValue}`);
    
    // No recalculations needed - this just sets a flag for RLT algorithm
    // No need to refresh detail panel - checkbox state is already updated
  }
  
  return {
    handleHasBufferToggle,
    handleBufferRationaleChange,
    handleBufferLockedChange,
    recalculateAllBufferSizing // Expose for use by other handlers if needed
  };
})();