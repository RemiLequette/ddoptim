// UI Event Handlers - Basic Parameter Handlers
window.UIHandlers_BasicParams = (function() {
  
  function handleIndependentADUChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    if (newValue < 0) {
      alert('Independent ADU cannot be negative');
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    const oldValue = node.independentADU;
    node.independentADU = newValue;
    console.log(`Updated ${node.name} independentADU: ${oldValue} â†’ ${newValue}`);
    
    // Step 1: Propagate ADU through entire network
    if (window.ADUPropagation && window.ADUPropagation.propagateADU) {
      console.log('ðŸ“ Propagating ADU through network...');
      window.ADUPropagation.propagateADU(window.currentNetwork.nodes, 1.0);
    }
    
    // Step 2: Recalculate buffer sizing for all buffered nodes (ADU impacts Yellow zone)
    if (window.UIHandlers_BufferDecisions && window.UIHandlers_BufferDecisions.recalculateAllBufferSizing) {
      console.log('ðŸ“ Recalculating buffer sizing for all buffered nodes (ADU changed)...');
      window.UIHandlers_BufferDecisions.recalculateAllBufferSizing();
    }
    
    // Step 3: Recalculate delivery lead time for this node (independentADU affects whether it's calculated)
    if (window.DeliveryLeadTimeCalculator && window.DeliveryLeadTimeCalculator.recalculateNode) {
      window.DeliveryLeadTimeCalculator.recalculateNode(node);
    }
    
    // Step 4: Update visualization - refresh ADU badge display (preserves view)
    if (window.NetworkRenderer && window.NetworkRenderer.updateNodeAppearance) {
      console.log('ðŸŽ¨ Updating node appearance with new ADU badge...');
      window.NetworkRenderer.updateNodeAppearance(nodeId);
      console.log('âœ“ Node visualization updated');
    }
    
    // Step 5: Update metrics display
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  function handleLeadTimeChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    if (newValue <= 0) {
      alert('Lead time must be greater than 0');
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    if (newValue > 365) {
      if (!confirm('Lead time exceeds 1 year. Are you sure?')) {
        UIHandlers.showNodeDetails(nodeId);
        return;
      }
    }
    
    const oldLeadTime = node.leadTime;
    node.leadTime = newValue;
    console.log(`Updated ${node.name} leadTime: ${oldLeadTime} â†’ ${newValue}`);
    
    // Step 1: Recalculate CLT and DLT for entire network
    if (window.CLTCalculator && window.CLTCalculator.calculateCLT) {
      console.log('ðŸ“ Recalculating CLT...');
      window.CLTCalculator.calculateCLT(window.currentNetwork.nodes);
    }
    if (window.DLTCalculator && window.DLTCalculator.calculateDLT) {
      console.log('ðŸ“ Recalculating DLT...');
      window.DLTCalculator.calculateDLT(window.currentNetwork.nodes);
    }
    
    // Step 2: Recalculate buffer sizing for all buffered nodes (DLT impacts Yellow zone)
    if (window.UIHandlers_BufferDecisions && window.UIHandlers_BufferDecisions.recalculateAllBufferSizing) {
      console.log('ðŸ“ Recalculating buffer sizing for all buffered nodes (Lead time changed)...');
      window.UIHandlers_BufferDecisions.recalculateAllBufferSizing();
    }
    
    // Step 3: Recalculate delivery lead time for all nodes (DLT changed affects deliveryLeadTime)
    if (window.DeliveryLeadTimeCalculator && window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime) {
      window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime(window.currentNetwork.nodes);
    }
    
    // Step 4: Update visualization - re-render entire network with preserved view
    if (window.NetworkRenderer && window.NetworkRenderer.render) {
      console.log('ðŸŽ¨ Re-rendering network with updated lead times (preserving view)...');
      window.NetworkRenderer.render(window.currentNetwork, true); // preserveView = true
      console.log('âœ“ Network visualization updated');
    }
    
    // Step 5: Update metrics display
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  function handleBufferProfileChange(nodeId, newProfile) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    const currentNetwork = window.currentNetwork;
    const profileExists = currentNetwork.profiles && 
      (currentNetwork.profiles.get ? currentNetwork.profiles.has(newProfile) : currentNetwork.profiles[newProfile]);
    
    if (!profileExists) {
      alert(`Profile '${newProfile}' not found`);
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    const oldProfile = node.bufferProfile;
    node.bufferProfile = newProfile;
    console.log(`Updated ${node.name} bufferProfile: ${oldProfile} â†’ ${newProfile}`);
    
    // Step 1: Recalculate buffer sizing for all buffered nodes
    // (Profile change affects variability factor and lead time factor)
    if (window.UIHandlers_BufferDecisions && window.UIHandlers_BufferDecisions.recalculateAllBufferSizing) {
      console.log('ðŸ“ Recalculating buffer sizing for all buffered nodes (Buffer profile changed)...');
      window.UIHandlers_BufferDecisions.recalculateAllBufferSizing();
    }
    
    // Step 2: Update metrics display
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  return {
    handleIndependentADUChange,
    handleLeadTimeChange,
    handleBufferProfileChange
  };
})();