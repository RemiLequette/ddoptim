// LIVE DIAGNOSTIC: ADU Propagation Validation
// Tests ADU propagation against Excel reference values (summer scenario, 1.3 adjustment)

(function() {
  console.log('\n=== ADU Propagation Test ===' );
  
  // Check if required modules are loaded
  if (!window.WEBER_PIGNONS_NETWORK) {
    console.error('âŒ WEBER_PIGNONS_NETWORK not loaded');
    return;
  }
  
  if (!window.ADUPropagation || !window.ADUPropagation.propagateADU) {
    console.error('âŒ ADUPropagation module not loaded');
    return;
  }
  
  // Set summer adjustment
  const seasonalAdjustment = 1.3;
  
  // Get nodes from network
  const nodes = WEBER_PIGNONS_NETWORK.nodes;
  
  // Run ADU propagation using the module
  const success = window.ADUPropagation.propagateADU(nodes, seasonalAdjustment);
  
  if (!success) {
    console.error('âŒ ADU Propagation failed - network contains cycles or errors');
    return;
  }
  
  // Test cases from Excel calculations (summer, 1.3 adjustment)
  const tests = [
    {
      name: 'VÃ©lo (Finished Product)',
      id: 'velo',
      expected: 52, // 40 Ã— 1.3
      tolerance: 0.1
    },
    {
      name: 'Plateau (Machined with spare parts)',
      id: 'plateau',
      expected: 54.6, // 2 Ã— 1.3 + 52 Ã— 1 = 2.6 + 52
      tolerance: 0.1
    },
    {
      name: 'Roue (Intermediate, pure dependent)',
      id: 'roue',
      expected: 104, // 0 + 52 Ã— 2
      tolerance: 0.1
    },
    {
      name: 'Rayons (Component, deep dependent)',
      id: 'rayons',
      expected: 7488, // 0 + 104 Ã— 72
      tolerance: 1
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    const node = nodes.get ? nodes.get(test.id) : nodes[test.id];
    if (!node) {
      console.error(`âœ— ${test.name}: Node not found`);
      failed++;
      return;
    }
    
    const actual = node.calculatedADU;
    const diff = Math.abs(actual - test.expected);
    
    if (diff <= test.tolerance) {
      console.log(`âœ“ ${test.name}: ${actual.toFixed(1)} (expected ${test.expected})`);
      passed++;
    } else {
      console.error(`âœ— ${test.name}: ${actual.toFixed(1)} (expected ${test.expected}, diff: ${diff.toFixed(1)})`);
      failed++;
    }
  });
  
  console.log(`\n[ADU Test] ${passed}/${tests.length} tests passed`);
  if (failed > 0) {
    console.error(`${failed} tests failed`);
  }
})();