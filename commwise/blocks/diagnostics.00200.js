// LIVE DIAGNOSTIC: CLT/DLT Validation
// Tests CLT and DLT calculations against expected values

(function() {
  console.log('\n=== CLT/DLT Test ===');
  
  // Check if required modules are loaded
  if (!window.WEBER_PIGNONS_NETWORK) {
    console.error('âŒ WEBER_PIGNONS_NETWORK not loaded');
    return;
  }
  
  if (!window.CLTCalculator || !window.CLTCalculator.calculateCLT) {
    console.error('âŒ CLTCalculator module not loaded');
    return;
  }
  
  if (!window.DLTCalculator || !window.DLTCalculator.calculateDLT) {
    console.error('âŒ DLTCalculator module not loaded');
    return;
  }
  
  const nodes = WEBER_PIGNONS_NETWORK.nodes;
  
  // Calculate CLT (unbuffered baseline)
  window.CLTCalculator.calculateCLT(nodes);
  
  // CLT Tests (unbuffered - longest path from raw materials)
  const cltTests = [
    { name: 'Rayons (leaf)', id: 'rayons', expected: 15 },
    { name: 'Jante (leaf)', id: 'jante', expected: 10 },
    { name: 'Pneu (leaf, longest)', id: 'pneu', expected: 30 },
    { name: 'Roue (assembly)', id: 'roue', expected: 34 }, // 4 + MAX(15,10,30) = 34
    { name: 'E-Cadre (assembly)', id: 'e_cadre', expected: 22 }, // 7 + MAX(7,15,15,15,15) = 22
    { name: 'VÃ©lo (finished)', id: 'velo', expected: 39 } // 5 + MAX(34,22,5,2) = 39
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log('\nCLT Tests (Cumulative Lead Time - unbuffered):');
  cltTests.forEach(test => {
    const node = nodes.get ? nodes.get(test.id) : nodes[test.id];
    if (!node) {
      console.error(`âœ— ${test.name}: Node not found`);
      failed++;
      return;
    }
    
    const actual = node.clt;
    
    if (actual === test.expected) {
      console.log(`âœ“ ${test.name}: ${actual} days (expected ${test.expected})`);
      passed++;
    } else {
      console.error(`âœ— ${test.name}: ${actual} days (expected ${test.expected})`);
      failed++;
    }
  });
  
  // DLT Tests - Scenario 1: No buffers (DLT = CLT)
  console.log('\nDLT Tests - Scenario 1: No Buffers:');
  window.DLTCalculator.calculateDLT(nodes);
  
  const dltTest1 = { name: 'VÃ©lo (no buffers)', id: 'velo', expected: 39 };
  const node1 = nodes.get ? nodes.get(dltTest1.id) : nodes[dltTest1.id];
  if (node1 && node1.dlt === dltTest1.expected) {
    console.log(`âœ“ ${dltTest1.name}: DLT = ${node1.dlt} days (equals CLT, no decoupling)`);
    passed++;
  } else {
    console.error(`âœ— ${dltTest1.name}: DLT = ${node1 ? node1.dlt : 'N/A'} days (expected ${dltTest1.expected})`);
    failed++;
  }
  
  // DLT Tests - Scenario 2: Buffer at Roue only
  console.log('\nDLT Tests - Scenario 2: Wheel Buffered Only:');
  const roueNode = nodes.get ? nodes.get('roue') : nodes['roue'];
  if (roueNode) {
    roueNode.hasBuffer = true;
    window.DLTCalculator.calculateDLT(nodes);
    
    const dltTests2 = [
      { name: 'Roue (buffered)', id: 'roue', expected: 4 }, // Buffer decouples, only wheel assembly time
      { name: 'VÃ©lo (wheel buffered)', id: 'velo', expected: 27 } // 5 + MAX(4 roue, 22 e_cadre, 5 e_guidon, 2 e_selle) = 27
    ];
    
    dltTests2.forEach(test => {
      const node = nodes.get ? nodes.get(test.id) : nodes[test.id];
      if (!node) {
        console.error(`âœ— ${test.name}: Node not found`);
        failed++;
        return;
      }
      
      const actual = node.dlt;
      
      if (actual === test.expected) {
        console.log(`âœ“ ${test.name}: DLT = ${actual} days (expected ${test.expected})`);
        passed++;
      } else {
        console.error(`âœ— ${test.name}: DLT = ${actual} days (expected ${test.expected})`);
        failed++;
      }
    });
  }
  
  // DLT Tests - Scenario 3: All semi-finished buffered
  console.log('\nDLT Tests - Scenario 3: All Semi-Finished Buffered:');
  const semiFinishedIds = ['roue', 'e_cadre', 'e_guidon', 'e_selle'];
  semiFinishedIds.forEach(id => {
    const node = nodes.get ? nodes.get(id) : nodes[id];
    if (node) node.hasBuffer = true;
  });
  window.DLTCalculator.calculateDLT(nodes);
  
  const dltTests3 = [
    { name: 'Roue (buffered)', id: 'roue', expected: 4 },
    { name: 'E-Cadre (buffered)', id: 'e_cadre', expected: 7 },
    { name: 'E-Guidon (buffered)', id: 'e_guidon', expected: 5 },
    { name: 'E-Selle (buffered)', id: 'e_selle', expected: 2 },
    { name: 'VÃ©lo (all semi-finished buffered)', id: 'velo', expected: 12 } // 5 + MAX(4,7,5,2) = 12
  ];
  
  dltTests3.forEach(test => {
    const node = nodes.get ? nodes.get(test.id) : nodes[test.id];
    if (!node) {
      console.error(`âœ— ${test.name}: Node not found`);
      failed++;
      return;
    }
    
    const actual = node.dlt;
    
    if (actual === test.expected) {
      console.log(`âœ“ ${test.name}: DLT = ${actual} days (expected ${test.expected})`);
      passed++;
    } else {
      console.error(`âœ— ${test.name}: DLT = ${actual} days (expected ${test.expected})`);
      failed++;
    }
  });
  
  // Buffer Impact Test
  const veloNode = nodes.get ? nodes.get('velo') : nodes['velo'];
  if (veloNode) {
    const bufferImpact = veloNode.clt - veloNode.dlt; // 39 - 12 = 27 days
    const expectedImpact = 27;
    
    console.log('\nBuffer Impact Test:');
    if (bufferImpact === expectedImpact) {
      console.log(`âœ“ Buffer Impact: ${bufferImpact} days reduction (CLT ${veloNode.clt} - DLT ${veloNode.dlt})`);
      passed++;
    } else {
      console.error(`âœ— Buffer Impact: ${bufferImpact} days (expected ${expectedImpact})`);
      failed++;
    }
  }
  
  // Reset buffers for clean state
  semiFinishedIds.forEach(id => {
    const node = nodes.get ? nodes.get(id) : nodes[id];
    if (node) node.hasBuffer = false;
  });
  window.DLTCalculator.calculateDLT(nodes);
  
  const totalTests = cltTests.length + 1 + 2 + dltTests3.length + 1; // CLT + DLT1 + DLT2 + DLT3 + Impact
  console.log(`\n[CLT/DLT Test] ${passed}/${totalTests} tests passed`);
  if (failed > 0) {
    console.error(`${failed} tests failed`);
  }
})();
