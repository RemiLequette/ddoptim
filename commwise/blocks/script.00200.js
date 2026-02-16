// Weber Pignons Network Data
// Reference case study: Bicycle assembly company (~1000 bikes/month, 1500 in summer)

const WEBER_PIGNONS_NETWORK = {
  // Metadata
  name: 'Weber Pignons',
  description: 'Bicycle assembly supply chain (SUPERVELO brand)',
  baselineADU: 40, // bikes/day (annual average, excluding promotions)
  seasonalAdjustment: 1.0, // 0.85 winter, 1.0 baseline, 1.3 summer
  
  // Network nodes
  nodes: {
    // ========================================
    // FINISHED PRODUCT
    // ========================================
    velo: {
      id: 'velo',
      name: 'VÃ©lo',
      type: 'finished_product',
      
      // BOM relationships (this node uses these components)
      children: [
        { id: 'roue', quantity: 2 },      // 2 wheels per bike
        { id: 'e_cadre', quantity: 1 },   // 1 frame assembly
        { id: 'e_guidon', quantity: 1 },  // 1 handlebar assembly
        { id: 'e_selle', quantity: 1 }    // 1 saddle assembly
      ],
      
      leadTime: 5, // days (final assembly)
      
      // Customer-facing attributes
      customerTolerance: 5, // days (SUPERVELO requirement - expected lead time)
      independentADU: 40,   // bikes/day (direct customer orders)
      
      bufferProfile: 'F',
      moq: 0,
      orderCycle: 0,
      unitCost: 500, // â‚¬ (example)
      
      // Runtime calculated (will be set by algorithms)
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0    // Runtime-only: used by RLT propagation algorithm
    },
    
    // ========================================
    // SEMI-FINISHED PRODUCTS (Intermediates)
    // ========================================
    roue: {
      id: 'roue',
      name: 'Roue',
      type: 'intermediate',
      
      children: [
        { id: 'rayons', quantity: 72 },    // 72 spokes per wheel
        { id: 'pneu', quantity: 1 },       // 1 tire
        { id: 'jante', quantity: 1 },      // 1 rim
        { id: 'valve', quantity: 1 },      // 1 valve
        { id: 'reflecteur', quantity: 2 }  // 2 reflectors
      ],
      
      leadTime: 4, // days (wheel assembly)
      independentADU: 0, // Not sold separately
      
      bufferProfile: 'I',
      moq: 200, // Minimum order quantity constraint
      orderCycle: 0,
      unitCost: 50, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    e_cadre: {
      id: 'e_cadre',
      name: 'E-Cadre',
      type: 'intermediate',
      
      children: [
        { id: 'cadre', quantity: 1 },
        { id: 'pedalier', quantity: 2 },
        { id: 'plateau', quantity: 1 },  // Fixed: was 3, should be 1 per bike
        { id: 'pignon', quantity: 1 },   // Fixed: was 5, should be 1 per bike
        { id: 'chaine', quantity: 1 }
      ],
      
      leadTime: 7, // days
      independentADU: 0,
      
      bufferProfile: 'I',
      moq: 0,
      orderCycle: 0,
      unitCost: 150, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    e_guidon: {
      id: 'e_guidon',
      name: 'E-Guidon',
      type: 'intermediate',
      
      children: [
        { id: 'guidon', quantity: 1 },
        { id: 'poignee', quantity: 2 },
        { id: 'frein', quantity: 2 }
      ],
      
      leadTime: 5, // days
      independentADU: 0,
      
      bufferProfile: 'I',
      moq: 0,
      orderCycle: 0,
      unitCost: 40, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    e_selle: {
      id: 'e_selle',
      name: 'E-Selle',
      type: 'intermediate',
      
      children: [
        { id: 'selle', quantity: 1 },
        { id: 'tige', quantity: 1 }
      ],
      
      leadTime: 2, // days
      independentADU: 0,
      
      bufferProfile: 'I',
      moq: 0,
      orderCycle: 7, // Weekly batching preferred
      unitCost: 25, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    // ========================================
    // MACHINED PARTS (with spare parts demand)
    // ========================================
    plateau: {
      id: 'plateau',
      name: 'Plateau',
      type: 'machined',
      
      children: [], // Leaf node (no further components)
      
      leadTime: 15, // days (machining)
      independentADU: 2, // units/day (spare parts ~5% of bike usage)
      
      bufferProfile: 'U',
      moq: 300,
      orderCycle: 0,
      unitCost: 12, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    pignon: {
      id: 'pignon',
      name: 'Pignon',
      type: 'machined',
      
      children: [],
      
      leadTime: 15, // days
      independentADU: 2, // spare parts
      
      bufferProfile: 'U',
      moq: 300,
      orderCycle: 0,
      unitCost: 8, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    chaine: {
      id: 'chaine',
      name: 'Chaine',
      type: 'machined',
      
      children: [],
      
      leadTime: 15, // days
      independentADU: 2, // spare parts
      
      bufferProfile: 'U',
      moq: 0,
      orderCycle: 0,
      unitCost: 15, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    // ========================================
    // PURCHASED LOCAL
    // ========================================
    cadre: {
      id: 'cadre',
      name: 'Cadre',
      type: 'purchased_local',
      
      children: [],
      
      leadTime: 7, // days
      independentADU: 0,
      
      bufferProfile: 'AL',
      moq: 0,
      orderCycle: 0,
      unitCost: 80, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    pedalier: {
      id: 'pedalier',
      name: 'PÃ©dalier',
      type: 'purchased_local',
      
      children: [],
      
      leadTime: 15, // days
      independentADU: 0,
      
      bufferProfile: 'AL',
      moq: 0,
      orderCycle: 0,
      unitCost: 25, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    guidon: {
      id: 'guidon',
      name: 'Guidon',
      type: 'purchased_local',
      
      children: [],
      
      leadTime: 5, // days
      independentADU: 0,
      
      bufferProfile: 'AL',
      moq: 0,
      orderCycle: 0,
      unitCost: 15, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    poignee: {
      id: 'poignee',
      name: 'PoignÃ©e',
      type: 'purchased_local',
      
      children: [],
      
      leadTime: 5, // days
      independentADU: 0,
      
      bufferProfile: 'AL',
      moq: 0,
      orderCycle: 0,
      unitCost: 3, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    frein: {
      id: 'frein',
      name: 'Frein',
      type: 'purchased_local',
      
      children: [],
      
      leadTime: 7, // days
      independentADU: 0,
      
      bufferProfile: 'AL',
      moq: 0,
      orderCycle: 0,
      unitCost: 20, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    selle: {
      id: 'selle',
      name: 'Selle',
      type: 'purchased_local',
      
      children: [],
      
      leadTime: 2, // days
      independentADU: 0,
      
      bufferProfile: 'AL',
      moq: 0,
      orderCycle: 0,
      unitCost: 18, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    tige: {
      id: 'tige',
      name: 'Tige',
      type: 'purchased_local',
      
      children: [],
      
      leadTime: 2, // days
      independentADU: 0,
      
      bufferProfile: 'AL',
      moq: 0,
      orderCycle: 0,
      unitCost: 5, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    // ========================================
    // PURCHASED INTERNATIONAL
    // ========================================
    rayons: {
      id: 'rayons',
      name: 'Rayons',
      type: 'purchased_international',
      
      children: [],
      
      leadTime: 15, // days
      independentADU: 0,
      
      bufferProfile: 'AI',
      moq: 50000, // Large MOQ for international shipping
      orderCycle: 30, // Monthly batching for transport
      unitCost: 0.5, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    pneu: {
      id: 'pneu',
      name: 'Pneu',
      type: 'purchased_international',
      
      children: [],
      
      leadTime: 30, // days (longest lead time in network)
      independentADU: 0,
      
      bufferProfile: 'AI',
      moq: 0,
      orderCycle: 0,
      unitCost: 8, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    jante: {
      id: 'jante',
      name: 'Jante',
      type: 'purchased_international',
      
      children: [],
      
      leadTime: 10, // days
      independentADU: 0,
      
      bufferProfile: 'AI',
      moq: 0,
      orderCycle: 0,
      unitCost: 12, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    valve: {
      id: 'valve',
      name: 'Valve',
      type: 'purchased_international',
      
      children: [],
      
      leadTime: 15, // days
      independentADU: 0,
      
      bufferProfile: 'AI',
      moq: 0,
      orderCycle: 0,
      unitCost: 1, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    },
    
    reflecteur: {
      id: 'reflecteur',
      name: 'RÃ©flecteur',
      type: 'purchased_international',
      
      children: [],
      
      leadTime: 15, // days
      independentADU: 0,
      
      bufferProfile: 'AI',
      moq: 0,
      orderCycle: 0,
      unitCost: 0.5, // â‚¬
      
      calculatedADU: null,
      clt: null,
      dlt: null,
      hasBuffer: false,
      bufferLocked: false,
      bufferRationale: '',
      requiredLeadTime: 0
    }
  }
};

// Build parent relationships (reverse BOM)
function buildParentRelationships(network) {
  // Initialize parents array for all nodes
  Object.values(network.nodes).forEach(node => {
    node.parents = [];
  });
  
  // Build parent links from children
  Object.values(network.nodes).forEach(parent => {
    parent.children.forEach(child => {
      const childNode = network.nodes[child.id];
      if (childNode) {
        childNode.parents.push({
          nodeId: parent.id,
          quantity: child.quantity
        });
      }
    });
  });
}

// Initialize the network
buildParentRelationships(WEBER_PIGNONS_NETWORK);

// Expose to window for model selector
window.WEBER_PIGNONS_NETWORK = WEBER_PIGNONS_NETWORK;
console.log('âœ“ WEBER_PIGNONS_NETWORK exposed to window:', Object.keys(window.WEBER_PIGNONS_NETWORK.nodes).length, 'nodes');