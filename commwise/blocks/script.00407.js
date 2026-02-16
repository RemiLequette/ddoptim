// Metrics Display Updater
// Updates the metrics bar with current network statistics

function updateMetricsDisplay() {
  console.log('ðŸ“Š updateMetricsDisplay called');
  const network = window.currentNetwork;
  
  if (!network || !network.nodes) {
    console.warn('âš ï¸ No network loaded - metrics not updated');
    return;
  }
  
  console.log('âœ“ Network found:', network.nodes.size || network.nodes.length, 'nodes');
  
  // Calculate metrics
  let bufferCount = 0;
  let totalInventoryValue = 0;
  let totalMissingCustomerTolerance = 0;
  let totalLtExceeding = 0;
  let totalAduWithTolerance = 0;
  
  // Handle both Map and Object formats
  const nodesIterable = network.nodes instanceof Map ? network.nodes.values() : Object.values(network.nodes);
  
  for (const node of nodesIterable) {
    // Count buffers and sum inventory value
    if (node.hasBuffer && node.bufferSizing) {
      bufferCount++;
      totalInventoryValue += node.bufferSizing.inventoryValue;
    }
    
    // Sum missing customer lead time for all customer-facing nodes (independentADU > 0)
    if (node.independentADU > 0 && node.missingCustomerLeadTime !== null && node.missingCustomerLeadTime !== undefined) {
      totalMissingCustomerTolerance += node.missingCustomerLeadTime;
    }
    
    // Calculate weighted average of ltExceeding (by calculatedADU)
    if (node.independentADU > 0 && node.customerTolerance && node.ltExceeding !== null && node.ltExceeding !== undefined) {
      totalLtExceeding += node.ltExceeding * node.calculatedADU;
      totalAduWithTolerance += node.calculatedADU;
    }
  }
  
  // Update Total Inventory Value
  const inventoryValueEl = document.getElementById('total-inventory-value');
  if (inventoryValueEl) {
    inventoryValueEl.textContent = `â‚¬${totalInventoryValue.toFixed(2)}`;
  }
  
  // Update Buffer Count
  const bufferCountEl = document.getElementById('buffer-count');
  if (bufferCountEl) {
    bufferCountEl.textContent = bufferCount;
  }
  
  // Update Missing Customer Lead Time
  const missingLeadTimeValueEl = document.getElementById('dlt-value');
  const missingLeadTimeStatusEl = document.getElementById('dlt-status');
  
  if (missingLeadTimeValueEl && missingLeadTimeStatusEl) {
    missingLeadTimeValueEl.textContent = `${totalMissingCustomerTolerance} days`;
    
    // Set status indicator based on total missing lead time
    missingLeadTimeStatusEl.className = 'status-indicator';
    if (totalMissingCustomerTolerance === 0) {
      missingLeadTimeStatusEl.classList.add('success');
      missingLeadTimeStatusEl.title = 'All customer tolerance requirements met';
    } else {
      missingLeadTimeStatusEl.classList.add('error');
      missingLeadTimeStatusEl.title = `Total tolerance gap: ${totalMissingCustomerTolerance} days across all customer-facing products`;
    }
  }
  
  // Update LT Exceeding Tolerance (weighted average)
  const ltExceedingValueEl = document.getElementById('lt-exceeding-value');
  const ltExceedingStatusEl = document.getElementById('lt-exceeding-status');
  
  if (ltExceedingValueEl && ltExceedingStatusEl) {
    const avgLtExceeding = totalAduWithTolerance > 0 ? totalLtExceeding / totalAduWithTolerance : 0;
    ltExceedingValueEl.textContent = `${avgLtExceeding.toFixed(1)} days`;
    
    // Set status indicator - green if margin exists
    ltExceedingStatusEl.className = 'status-indicator';
    if (avgLtExceeding > 0) {
      ltExceedingStatusEl.classList.add('success');
      ltExceedingStatusEl.title = `Average safety margin: ${avgLtExceeding.toFixed(1)} days (weighted by ADU)`;
    } else {
      ltExceedingStatusEl.classList.add('neutral');
      ltExceedingStatusEl.title = 'No safety margin - delivering exactly at tolerance';
    }
  }
  
  console.log(`âœ“ Metrics updated: ${bufferCount} buffers, â‚¬${totalInventoryValue.toFixed(2)} inventory, ${totalMissingCustomerTolerance} days missing lead time, ${(totalAduWithTolerance > 0 ? totalLtExceeding / totalAduWithTolerance : 0).toFixed(1)} days exceeding`);
}

// Make globally accessible
window.updateMetricsDisplay = updateMetricsDisplay;

console.log('âœ“ Metrics display updater loaded');