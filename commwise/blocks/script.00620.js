// Delivery Lead Time Calculator
// Computes deliveryLeadTime and missingCustomerLeadTime for customer-facing nodes
// These are runtime-only computed attributes (not persisted to JSON)

window.DeliveryLeadTimeCalculator = (function() {
  'use strict';

  /**
   * Calculate delivery lead time metrics for all nodes with independentADU > 0
   * @param {Map|Object} nodes - Network nodes collection
   */
  function calculateDeliveryLeadTime(nodes) {
    console.log('ðŸ“¦ Calculating Delivery Lead Time metrics...');
    
    const nodesIterable = nodes instanceof Map ? nodes.values() : Object.values(nodes);
    let calculatedCount = 0;
    
    for (const node of nodesIterable) {
      // Only calculate for nodes with independent demand (customer-facing)
      if (node.independentADU > 0) {
        // DeliveryLeadTime = 0 if buffered, else DLT
        node.deliveryLeadTime = node.hasBuffer ? 0 : (node.dlt || 0);
        
        // MissingCustomerLeadTime = MAX(DeliveryLeadTime - CustomerLeadTime, 0)
        // This is the gap where we deliver SLOWER than customer expects
        const customerLT = node.customerTolerance || 0;
        const deliveryLT = node.deliveryLeadTime;
        node.missingCustomerLeadTime = Math.max(deliveryLT - customerLT, 0);
        
        // LtExceeding = MAX(CustomerLeadTime - DeliveryLeadTime, 0)
        // This is the MARGIN (safety buffer) - how much faster we deliver than required
        node.ltExceeding = Math.max(customerLT - deliveryLT, 0);
        
        calculatedCount++;
        
        console.log(
          `  âœ“ ${node.id}: deliveryLT=${node.deliveryLeadTime}d, ` +
          `customerLT=${customerLT}d, missing=${node.missingCustomerLeadTime}d, ` +
          `exceeding=${node.ltExceeding}d`
        );
      } else {
        // Clear these attributes for nodes without independent demand
        node.deliveryLeadTime = null;
        node.missingCustomerLeadTime = null;
        node.ltExceeding = null;
      }
    }
    
    console.log(`âœ“ Delivery Lead Time calculated for ${calculatedCount} customer-facing nodes`);
  }

  /**
   * Recalculate delivery lead time for a specific node
   * Useful after individual node updates (independentADU, customerTolerance, buffer changes)
   * @param {Object} node - Single node to recalculate
   */
  function recalculateNode(node) {
    if (!node) return;
    
    if (node.independentADU > 0) {
      node.deliveryLeadTime = node.hasBuffer ? 0 : (node.dlt || 0);
      const customerLT = node.customerTolerance || 0;
      node.missingCustomerLeadTime = Math.max(node.deliveryLeadTime - customerLT, 0);
      node.ltExceeding = Math.max(customerLT - node.deliveryLeadTime, 0);
      
      console.log(
        `ðŸ”„ Recalculated ${node.id}: deliveryLT=${node.deliveryLeadTime}d, ` +
        `missing=${node.missingCustomerLeadTime}d, exceeding=${node.ltExceeding}d`
      );
    } else {
      node.deliveryLeadTime = null;
      node.missingCustomerLeadTime = null;
      node.ltExceeding = null;
    }
  }

  // Public API
  return {
    calculateDeliveryLeadTime: calculateDeliveryLeadTime,
    recalculateNode: recalculateNode
  };
})();

console.log('âœ“ Delivery Lead Time Calculator loaded');
