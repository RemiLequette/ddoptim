// UI Event Handlers - Constraint Handlers
window.UIHandlers_Constraints = (function() {
  
  function handleMOQChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    if (newValue < 0) {
      alert('MOQ cannot be negative');
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    node.moq = newValue;
    console.log(`Updated ${node.name} moq to ${newValue}`);
    
    // Recalculate buffer sizing if buffered (affects green zone)
    if (node.hasBuffer && typeof window.calculateBufferSizing === 'function') {
      window.calculateBufferSizing(node);
      console.log('âœ“ Buffer sizing recalculated');
    }
    
    // Update metrics display
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  function handleOrderCycleChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    if (newValue < 0) {
      alert('Order cycle cannot be negative');
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    node.orderCycle = newValue;
    console.log(`Updated ${node.name} orderCycle to ${newValue}`);
    
    // Recalculate buffer sizing if buffered (affects green zone)
    if (node.hasBuffer && typeof window.calculateBufferSizing === 'function') {
      window.calculateBufferSizing(node);
      console.log('âœ“ Buffer sizing recalculated');
    }
    
    // Update metrics display
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  function handleUnitCostChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    if (newValue < 0) {
      alert('Unit cost cannot be negative');
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    node.unitCost = newValue;
    console.log(`Updated ${node.name} unitCost to â‚¬${newValue.toFixed(2)}`);
    
    // Recalculate inventory value if buffered
    if (node.hasBuffer && typeof window.calculateBufferSizing === 'function') {
      window.calculateBufferSizing(node);
      console.log('âœ“ Buffer sizing recalculated');
    }
    
    // Update metrics display (total inventory value)
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  return {
    handleMOQChange,
    handleOrderCycleChange,
    handleUnitCostChange
  };
})();
