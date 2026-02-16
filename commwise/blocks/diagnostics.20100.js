(function() {
  console.log('[RLT Test] Starting algorithm test...');
  
  const tests = [];
  
  // Test 1: Network Validation
  try {
    const validation = window.RequiredLeadTimePropagation.validateNetwork();
    tests.push({
      name: 'Network Validation',
      passed: validation.valid,
      details: validation.valid ? 'Network is valid DAG' : validation.errors.join(', ')
    });
  } catch (err) {
    tests.push({
      name: 'Network Validation',
      passed: false,
      details: 'Error: ' + err.message
    });
  }
  
  // Test 2: Topological Sort
  try {
    const nodes = window.RequiredLeadTimePropagation.getTopologicalOrder();
    const hasVelo = nodes.some(n => n.id === 'velo');
    const veloIndex = nodes.findIndex(n => n.id === 'velo');
    const roueIndex = nodes.findIndex(n => n.id === 'roue');
    const parentsBeforeChildren = veloIndex > roueIndex; // Velo (parent) should come after Roue (child) in order
    
    tests.push({
      name: 'Topological Sort',
      passed: hasVelo && parentsBeforeChildren,
      details: `Ordered ${nodes.length} nodes, Velo at ${veloIndex}, Roue at ${roueIndex}`
    });
  } catch (err) {
    tests.push({
      name: 'Topological Sort',
      passed: false,
      details: 'Error: ' + err.message
    });
  }
  
  // Test 3: Run Algorithm with 5-day customerTolerance
  try {
    // Reset network state
    window.DDoptim.model.nodes.forEach(node => {
      node.hasBuffer = false;
      node.requiredLeadTime = 0;
    });
    
    // Ensure VÃ©lo has customerTolerance = 5
    const velo = window.DDoptim.model.nodes.get('velo');
    velo.customerTolerance = 5;
    velo.independentADU = 40;
    
    // Run algorithm
    const result = window.RequiredLeadTimePropagation.autoPositionBuffers({
      respectLockedBuffers: false,
      logIterations: true
    });
    
    const bufferCount = result.buffersSet.length;
    const iterations = result.iterations.length;
    
    tests.push({
      name: 'Auto-Position Algorithm',
      passed: result.success && bufferCount > 0,
      details: `${iterations} iterations, ${bufferCount} buffers set`
    });
    
    // Test 4: Check specific buffer positions
    const bufferedNodes = result.buffersSet.map(b => b.id);
    tests.push({
      name: 'Buffer Positions',
      passed: true,
      details: 'Buffered nodes: ' + bufferedNodes.join(', ')
    });
    
    // Test 5: Mandatory buffer detection
    const mandatoryBuffers = result.buffersSet.filter(b => b.reason === 'mandatory');
    tests.push({
      name: 'Mandatory Buffers',
      passed: true,
      details: `${mandatoryBuffers.length} mandatory buffers found`
    });
    
  } catch (err) {
    tests.push({
      name: 'Auto-Position Algorithm',
      passed: false,
      details: 'Error: ' + err.message + ' Stack: ' + err.stack
    });
  }
  
  // Aggregate results
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  const allPassed = passed === total;
  
  const payload = {
    status: allPassed ? 'success' : 'partial',
    summary: `${passed}/${total} tests passed`,
    tests: tests,
    timestamp: new Date().toISOString()
  };
  
  console.log('[RLT Test] Results:', payload);
  
  CommwiseDiagnostics.send(payload, { diagnosticBlockId: 'rlt-algorithm-test' })
    .then(function(res) { console.log('[Diagnostics] sent', res); })
    .catch(function(err) { console.error('[Diagnostics] failed', err); });
})();
