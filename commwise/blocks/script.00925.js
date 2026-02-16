// UI Event Handlers - Customer Lead Time Handler
window.UIHandlers_CustomerLeadTime = (function() {
  
  function handleCustomerLeadTimeChange(nodeId, newValue) {
    const node = UIHandlers.getNode(nodeId);
    if (!node) return;
    
    // Validation: Only allow editing if node has independentADU > 0
    if (!node.independentADU || node.independentADU <= 0) {
      alert('Customer Lead Time can only be set for nodes with independent ADU (customer-facing products)');
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    if (newValue < 0) {
      alert('Customer Lead Time cannot be negative');
      UIHandlers.showNodeDetails(nodeId);
      return;
    }
    
    if (newValue > 365) {
      if (!confirm('Customer Lead Time exceeds 1 year. Are you sure?')) {
        UIHandlers.showNodeDetails(nodeId);
        return;
      }
    }
    
    const oldValue = node.customerTolerance;
    node.customerTolerance = newValue;
    console.log(`Updated ${node.name} customerTolerance: ${oldValue} â†’ ${newValue}`);
    
    // Step 1: Recalculate delivery lead time for this node
    // (customerTolerance affects deliveryLeadTime and missingCustomerLeadTime)
    if (window.DeliveryLeadTimeCalculator && window.DeliveryLeadTimeCalculator.recalculateNode) {
      window.DeliveryLeadTimeCalculator.recalculateNode(node);
    }
    
    // Step 2: Update visualization - refresh alert badge display
    if (window.NetworkRenderer && window.NetworkRenderer.updateNodeAppearance) {
      console.log('ðŸŽ¨ Updating node appearance with new alert badge...');
      window.NetworkRenderer.updateNodeAppearance(nodeId);
      console.log('âœ“ Node visualization updated');
    }
    
    // Step 3: Update metrics display
    if (typeof window.updateMetricsDisplay === 'function') {
      window.updateMetricsDisplay();
    }
    
    UIHandlers.showNodeDetails(nodeId);
  }
  
  return {
    handleCustomerLeadTimeChange
  };
})();
