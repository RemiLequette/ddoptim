// Debug Status Logger
setTimeout(() => {
  console.log('\n=== DDoptim Status Check (2s after load) ===');
  console.log('D3.js:', typeof d3 !== 'undefined' ? `v${d3.version}` : 'NOT LOADED');
  console.log('NetworkRenderer:', typeof NetworkRenderer !== 'undefined');
  console.log('Test Network:', typeof SIMPLE_TEST_NETWORK !== 'undefined');
  console.log('Weber Pignons:', typeof WEBER_PIGNONS_NETWORK !== 'undefined');
  console.log('DDOptim State:', typeof window.DDOptim !== 'undefined');
  if (window.DDOptim) {
    console.log('  - Model Name:', window.DDOptim.modelName);
    console.log('  - Model Version:', window.DDOptim.modelVersion);
    console.log('  - Nodes:', window.DDOptim.nodes ? window.DDOptim.nodes.size : 'undefined');
  }
  console.log('=========================================\n');
}, 2000);