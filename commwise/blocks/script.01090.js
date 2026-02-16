// Unified Model Loader
// Shared by model selector and JSON file import

window.ModelLoader = {
    /**
     * Load a network model from JSON data
     * @param {Object} modelData - JSON object with metadata and nodes array
     * @param {string} source - Description of source (e.g., "Model Selector", "JSON Import")
     * @returns {Object} Result with success flag and message
     */
    loadModel: function(modelData, source) {
        console.log(`ðŸ“¦ ModelLoader: Loading from ${source}...`);
        
        // Validation
        if (!modelData) {
            return { success: false, message: 'No model data provided' };
        }
        
        if (!modelData.metadata || !modelData.metadata.name) {
            return { success: false, message: 'Invalid model: missing metadata.name' };
        }
        
        if (!modelData.nodes || !Array.isArray(modelData.nodes)) {
            return { success: false, message: 'Invalid model: nodes must be an array' };
        }
        
        try {
            // CRITICAL FIX: Update model name display when loading new model
            if (typeof window.updateModelNameDisplay === 'function') {
                window.updateModelNameDisplay(modelData.metadata.name);
                console.log(`ðŸ“ Model name updated to: ${modelData.metadata.name}`);
            }
            
            // Convert nodes array to Map
            const nodesMap = new Map();
            modelData.nodes.forEach(node => {
                // Ensure node has required fields
                if (!node.id) {
                    throw new Error('Node missing required field: id');
                }
                
                // Normalize field names (handle both old and new formats)
                const normalizedNode = {
                    id: node.id,
                    name: node.name || node.id,
                    type: node.type || 'unknown',
                    
                    // Basic parameters
                    independentADU: node.independentADU || 0,
                    calculatedADU: null, // Will be calculated
                    leadTime: node.leadTime || 0,
                    customerTolerance: node.customerTolerance || null, // Customer lead time requirement
                    
                    // Buffer decision - simplified to hasBuffer and bufferLocked only
                    hasBuffer: node.hasBuffer || false,
                    bufferLocked: node.bufferLocked || false,
                    bufferRationale: node.bufferRationale || '',
                    
                    // BOM relationships
                    children: (node.children || []).map(child => ({
                        id: child.id,
                        quantity: child.quantity || 1
                    })),
                    parents: [], // Will be calculated
                    
                    // Buffer profile and constraints
                    bufferProfile: node.bufferProfile || 'I',
                    moq: node.moq || node.MOQ || 0,
                    orderCycle: node.orderCycle || 0,
                    unitCost: node.unitCost || 0,
                    
                    // Calculated fields (will be populated by algorithms)
                    clt: null,
                    dlt: null,
                    redZone: null,
                    yellowZone: null,
                    greenZone: null,
                    averageStock: null
                };
                
                nodesMap.set(node.id, normalizedNode);
            });
            
            // Build parent relationships (reverse BOM)
            nodesMap.forEach(node => {
                node.parents = [];
            });
            
            nodesMap.forEach(parent => {
                parent.children.forEach(child => {
                    const childNode = nodesMap.get(child.id);
                    if (childNode) {
                        childNode.parents.push({
                            id: parent.id,
                            quantity: child.quantity
                        });
                    }
                });
            });
            
            // Create network object
            const network = {
                metadata: {
                    name: modelData.metadata.name,
                    description: modelData.metadata.description || '',
                    version: modelData.metadata.version || '1.0',
                    nodeCount: nodesMap.size,
                    loadedAt: new Date().toISOString(),
                    source: source
                },
                nodes: nodesMap
            };
            
            // Store as current network
            window.currentNetwork = network;
            
            // Run calculation pipeline
            console.log('ðŸ“ Recalculating ADU...');
            if (window.ADUPropagation && window.ADUPropagation.propagateADU) {
                window.ADUPropagation.propagateADU(network.nodes, 1.0);
            }
            
            console.log('ðŸ“ Calculating CLT...');
            if (window.CLTCalculator && window.CLTCalculator.calculateCLT) {
                window.CLTCalculator.calculateCLT(network.nodes);
            }
            
            console.log('ðŸ“ Calculating DLT...');
            if (window.DLTCalculator && window.DLTCalculator.calculateDLT) {
                window.DLTCalculator.calculateDLT(network.nodes);
            }
            
            // Calculate buffer sizing for buffered nodes
            console.log('ðŸ“ Calculating buffer zones...');
            if (typeof window.calculateBufferSizing === 'function') {
                let bufferCount = 0;
                network.nodes.forEach(node => {
                    if (node.hasBuffer) {
                        window.calculateBufferSizing(node);
                        bufferCount++;
                    }
                });
                console.log(`âœ“ Buffer sizing calculated for ${bufferCount} buffered nodes`);
            }
            
            // Calculate delivery lead time metrics
            console.log('ðŸ“ Calculating delivery lead time...');
            if (window.DeliveryLeadTimeCalculator && window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime) {
                window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime(network.nodes);
            }
            
            // Update metrics display
            console.log('ðŸ“ Updating metrics...');
            if (typeof window.updateMetricsDisplay === 'function') {
                window.updateMetricsDisplay();
            }
            
            // Re-render network
            console.log('ðŸ“ Rendering network...');
            if (window.NetworkRenderer && window.NetworkRenderer.render) {
                window.NetworkRenderer.render(network);
            } else {
                throw new Error('NetworkRenderer not available');
            }
            
            console.log(`âœ“ Model loaded successfully: ${network.metadata.name} (${network.nodes.size} nodes)`);
            
            return {
                success: true,
                message: `âœ“ Loaded: ${network.metadata.name} (${network.nodes.size} nodes)`,
                network: network
            };
            
        } catch (error) {
            console.error('âŒ Error loading model:', error);
            console.error('Stack:', error.stack);
            return {
                success: false,
                message: `Error: ${error.message}`
            };
        }
    },
    
    /**
     * Load a model from the MODEL_LIBRARY by key
     * @param {string} modelKey - Key from MODEL_LIBRARY (e.g., 'simple_chain')
     * @returns {Object} Result from loadModel()
     */
    loadFromLibrary: function(modelKey) {
        if (!window.MODEL_LIBRARY) {
            return { success: false, message: 'Model library not available' };
        }
        
        const modelData = window.MODEL_LIBRARY[modelKey];
        if (!modelData) {
            return { success: false, message: `Model '${modelKey}' not found in library` };
        }
        
        return this.loadModel(modelData, 'Model Selector');
    }
};

console.log('âœ“ ModelLoader: Unified loader initialized');