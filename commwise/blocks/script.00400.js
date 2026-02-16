// DDMRP Buffer Sizing Calculator
// Calculates Red/Yellow/Green zones for inventory estimation
// Formula: Average Stock = Red + (Green / 2)

function calculateBufferSizing(node) {
  if (!node.hasBuffer) {
    // Clear buffer sizing for non-buffered nodes
    node.bufferSizing = null;
    return;
  }
  
  const adu = node.calculatedADU;
  const dlt = node.dlt;
  const profile = node.bufferProfile;
  
  if (!adu || adu <= 0 || !dlt || !profile) {
    console.warn(`Cannot calculate buffer sizing for ${node.id}: missing data`);
    node.bufferSizing = null;
    return;
  }
  
  // Step 1: Yellow Zone (lead time demand)
  const yellow = Math.round(adu * dlt);
  
  // Step 2: Determine Lead Time Factor based on DLT and profile
  const leadTimeFactor = getLeadTimeFactor(dlt, profile);
  
  // Step 3: Green Zone (order size)
  const greenDelay = Math.round(yellow * leadTimeFactor);
  const greenMOQ = node.moq || 0;
  const greenCycle = Math.round(adu * (node.orderCycle || 0));
  const green = Math.max(greenDelay, greenMOQ, greenCycle);
  
  // Step 4: Red Zone (safety stock)
  const variabilityFactor = getVariabilityFactor(profile);
  const redBase = greenDelay; // Same as yellow Ã— leadTimeFactor
  const redSecurity = Math.round(redBase * variabilityFactor);
  const red = redBase + redSecurity;
  
  // Step 5: Buffer levels and average stock
  const topOfRed = red;
  const topOfYellow = red + yellow;
  const topOfGreen = red + yellow + green;
  const averageStock = Math.round(red + (green / 2));
  
  // Step 6: Inventory value
  const inventoryValue = averageStock * (node.unitCost || 0);
  
  // Store buffer sizing
  node.bufferSizing = {
    yellow: yellow,
    green: green,
    red: red,
    topOfRed: topOfRed,
    topOfYellow: topOfYellow,
    topOfGreen: topOfGreen,
    averageStock: averageStock,
    inventoryValue: Math.round(inventoryValue * 100) / 100, // Round to 2 decimals
    
    // Calculation details (for debugging/display)
    leadTimeFactor: leadTimeFactor,
    variabilityFactor: variabilityFactor,
    greenDelay: greenDelay,
    greenMOQ: greenMOQ,
    greenCycle: greenCycle,
    redBase: redBase,
    redSecurity: redSecurity
  };
}

// Calculate buffer sizing for all buffered nodes in network
function calculateAllBuffers(network) {
  let bufferCount = 0;
  let totalInventoryValue = 0;
  
  Object.values(network.nodes).forEach(node => {
    calculateBufferSizing(node);
    
    if (node.bufferSizing) {
      bufferCount++;
      totalInventoryValue += node.bufferSizing.inventoryValue;
    }
  });
  
  console.log(`âœ“ Buffer sizing complete: ${bufferCount} buffers, â‚¬${totalInventoryValue.toFixed(2)} total inventory`);
  
  return {
    bufferCount: bufferCount,
    totalInventoryValue: totalInventoryValue
  };
}

console.log('âœ“ DDMRP buffer sizing calculator loaded');