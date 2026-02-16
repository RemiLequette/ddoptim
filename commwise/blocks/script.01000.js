// AUDITOR:LARGE_BLOCK_JUSTIFIED - Unified model library data store
// Model Library - JSON Data Store
// All network models stored as JSON. Populated dynamically from WEBER_PIGNONS_NETWORK.

window.MODEL_LIBRARY = {
    simple_chain: {
        "metadata": {
            "name": "Simple Chain",
            "description": "Linear 3-node supply chain: VÃ©lo â†’ Roue â†’ Rayon",
            "version": "1.0",
            "nodeCount": 3,
            "author": "DDOptim"
        },
        "nodes": [
            {
                "id": "VELO",
                "name": "VÃ©lo",
                "type": "finished",
                "independentADU": 100,
                "customerTolerance": 0,
                "leadTime": 5,
                "hasBuffer": false,
                "bufferDecisionMode": "user",
                "bufferRationale": "",
                "children": [
                    { "id": "ROUE", "quantity": 2 }
                ],
                "bufferProfile": "F",
                "MOQ": 50,
                "orderCycle": 30,
                "unitCost": 150.00
            },
            {
                "id": "ROUE",
                "name": "Roue",
                "type": "semi-finished",
                "independentADU": 0,
                "leadTime": 3,
                "hasBuffer": true,
                "bufferDecisionMode": "user",
                "bufferRationale": "Strategic decoupling point",
                "children": [
                    { "id": "RAYON", "quantity": 36 }
                ],
                "bufferProfile": "I",
                "MOQ": 100,
                "orderCycle": 15,
                "unitCost": 25.00
            },
            {
                "id": "RAYON",
                "name": "Rayon",
                "type": "purchased",
                "independentADU": 0,
                "leadTime": 10,
                "hasBuffer": false,
                "bufferDecisionMode": "user",
                "bufferRationale": "",
                "children": [],
                "bufferProfile": "U",
                "MOQ": 1000,
                "orderCycle": 30,
                "unitCost": 0.50
            }
        ]
    },
    
    simple_assembly: {
        "metadata": {
            "name": "Simple Assembly",
            "description": "V-structure convergent network: 2 components converge into 1 assembly",
            "version": "1.0",
            "nodeCount": 3,
            "author": "DDOptim"
        },
        "nodes": [
            {
                "id": "ASSEMBLY",
                "name": "Assembly",
                "type": "finished",
                "independentADU": 50,
                "leadTime": 2,
                "hasBuffer": false,
                "bufferDecisionMode": "user",
                "bufferRationale": "",
                "children": [
                    { "id": "COMP_A", "quantity": 1 },
                    { "id": "COMP_B", "quantity": 1 }
                ],
                "bufferProfile": "F",
                "MOQ": 20,
                "orderCycle": 7,
                "unitCost": 100.00
            },
            {
                "id": "COMP_A",
                "name": "Component A",
                "type": "purchased",
                "independentADU": 0,
                "leadTime": 15,
                "hasBuffer": true,
                "bufferDecisionMode": "user",
                "bufferRationale": "Long lead time purchased item",
                "children": [],
                "bufferProfile": "U",
                "MOQ": 100,
                "orderCycle": 30,
                "unitCost": 30.00
            },
            {
                "id": "COMP_B",
                "name": "Component B",
                "type": "purchased",
                "independentADU": 0,
                "leadTime": 20,
                "hasBuffer": true,
                "bufferDecisionMode": "user",
                "bufferRationale": "Critical component with high variability",
                "children": [],
                "bufferProfile": "U",
                "MOQ": 50,
                "orderCycle": 30,
                "unitCost": 40.00
            }
        ]
    },
    
    simple_distribution: {
        "metadata": {
            "name": "Simple Distribution",
            "description": "A-structure divergent network: 1 component distributed to multiple customers",
            "version": "1.0",
            "nodeCount": 4,
            "author": "DDOptim"
        },
        "nodes": [
            {
                "id": "CUSTOMER_1",
                "name": "Customer 1",
                "type": "finished",
                "independentADU": 30,
                "leadTime": 1,
                "hasBuffer": false,
                "bufferDecisionMode": "user",
                "bufferRationale": "",
                "children": [
                    { "id": "PRODUCT", "quantity": 1 }
                ],
                "bufferProfile": "F",
                "MOQ": 10,
                "orderCycle": 1,
                "unitCost": 0.00
            },
            {
                "id": "CUSTOMER_2",
                "name": "Customer 2",
                "type": "finished",
                "independentADU": 40,
                "leadTime": 1,
                "hasBuffer": false,
                "bufferDecisionMode": "user",
                "bufferRationale": "",
                "children": [
                    { "id": "PRODUCT", "quantity": 1 }
                ],
                "bufferProfile": "F",
                "MOQ": 10,
                "orderCycle": 1,
                "unitCost": 0.00
            },
            {
                "id": "CUSTOMER_3",
                "name": "Customer 3",
                "type": "finished",
                "independentADU": 20,
                "leadTime": 1,
                "hasBuffer": false,
                "bufferDecisionMode": "user",
                "bufferRationale": "",
                "children": [
                    { "id": "PRODUCT", "quantity": 1 }
                ],
                "bufferProfile": "F",
                "MOQ": 5,
                "orderCycle": 1,
                "unitCost": 0.00
            },
            {
                "id": "PRODUCT",
                "name": "Shared Product",
                "type": "semi-finished",
                "independentADU": 0,
                "leadTime": 10,
                "hasBuffer": true,
                "bufferDecisionMode": "user",
                "bufferRationale": "Strategic buffer for multi-customer distribution",
                "children": [],
                "bufferProfile": "I",
                "MOQ": 100,
                "orderCycle": 14,
                "unitCost": 50.00
            }
        ]
    }
};

// Populate Weber Pignons from WEBER_PIGNONS_NETWORK when available
(function() {
    function tryPopulateWeber() {
        if (typeof WEBER_PIGNONS_NETWORK === 'undefined') {
            setTimeout(tryPopulateWeber, 50);
            return;
        }
        
        // Convert WEBER_PIGNONS_NETWORK nodes object to array format
        const weberNodes = [];
        Object.values(WEBER_PIGNONS_NETWORK.nodes).forEach(node => {
            // Map old field names to new format
            weberNodes.push({
                id: node.id,
                name: node.name,
                type: node.type,
                independentADU: node.independentADU || 0,
                leadTime: node.leadTime,
                hasBuffer: node.hasBuffer || false,
                bufferDecisionMode: node.bufferDecisionMode || "user",
                bufferRationale: node.bufferRationale || "",
                children: node.children.map(child => ({
                    id: child.id,
                    quantity: child.quantity
                })),
                bufferProfile: node.bufferProfile,
                MOQ: node.moq || 0,
                orderCycle: node.orderCycle || 0,
                unitCost: node.unitCost || 0
            });
        });
        
        window.MODEL_LIBRARY.weber_pignons = {
            "metadata": {
                "name": "Weber Pignons",
                "description": "Complete 27-node bicycle assembly supply chain from Grenoble case study",
                "version": "1.0",
                "nodeCount": 27,
                "author": "DDOptim - Weber Pignons Case Study"
            },
            "nodes": weberNodes
        };
        
        console.log('âœ“ Model Library: Weber Pignons populated with', weberNodes.length, 'nodes');
    }
    
    tryPopulateWeber();
})();

console.log('âœ“ Model Library: JSON data store initialized with 4 models');
