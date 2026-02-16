// ============================================================================
// SCRIPT 650: Required Lead Time Propagation Engine
// ============================================================================
// PURPOSE: Automated buffer positioning based on customer lead time requirements
// ALGORITHM: Single-pass propagation through topologically sorted BOM
// ============================================================================

(function() {
  'use strict';
  
  console.log('[RLT] Loading Required Lead Time Propagation Engine...');
  
  // =========================================================================
  // MODULE: RequiredLeadTimePropagation
  // =========================================================================
  
  window.RequiredLeadTimePropagation = {
    
    // =======================================================================
    // MAIN ENTRY POINT: Auto-Position Buffers
    // =======================================================================
    
    autoPositionBuffers: function(options = {}) {
      const {
        respectLockedBuffers = true,
        logIterations = true
      } = options;
      
      console.log('[RLT] Starting auto-position algorithm...');
      console.log('[RLT] Options:', { respectLockedBuffers, logIterations });
      
      // Step 1: Validate network
      const validation = this.validateNetwork();
      if (!validation.valid) {
        console.error('[RLT] Network validation failed:', validation.errors);
        return { 
          success: false, 
          errors: validation.errors 
        };
      }
      console.log('[RLT] Network validation passed');
      
      // Step 2: Save current buffer state (for comparison)
      const beforeState = this.captureBufferState();
      
      // Step 3: Initialize required lead times and reset unlocked buffers
      this.initializeRequiredLeadTimes(respectLockedBuffers);
      console.log('[RLT] Initialized required lead times from customerTolerance');
      
      // Step 4: Run single-pass propagation
      const result = this.propagateRequirements(logIterations);
      
      // Step 5: Capture final state
      const afterState = this.captureBufferState();
      const changes = this.compareBufferStates(beforeState, afterState);
      
      console.log('[RLT] Algorithm complete:', {
        buffersSet: result.buffersSet.length,
        unsolvableConstraints: result.unsolvableConstraints.length,
        changes
      });
      
      return {
        success: result.unsolvableConstraints.length === 0,
        buffersSet: result.buffersSet,
        unsolvableConstraints: result.unsolvableConstraints,
        changes,
        beforeState,
        afterState
      };
    },
    
    // =======================================================================
    // INITIALIZATION: Set Required Lead Times & Reset Unlocked Buffers
    // =======================================================================
    
    initializeRequiredLeadTimes: function(respectLockedBuffers) {
      const nodes = window.currentNetwork.nodes;
      let initializedCount = 0;
      let resetCount = 0;
      
      for (const [id, node] of nodes) {
        // Reset unlocked buffers (start fresh)
        if (respectLockedBuffers && !node.bufferLocked) {
          if (node.hasBuffer) {
            resetCount++;
          }
          node.hasBuffer = false;
          node.bufferRationale = ''; // âœ… Clear rationale when clearing buffer
        } else if (!respectLockedBuffers) {
          if (node.hasBuffer) {
            resetCount++;
          }
          node.hasBuffer = false;
          node.bufferRationale = ''; // âœ… Clear rationale when clearing buffer
        }
        
        // customerTolerance interpretation:
        // - undefined or 0: Immediate delivery required (0 days)
        // - > 0: Specific lead time tolerance (days)
        // Normalize undefined â†’ 0 for nodes with independent demand
        if (node.independentADU > 0 && node.customerTolerance === undefined) {
          node.customerTolerance = 0;
        }
        
        if (node.independentADU > 0 && node.customerTolerance !== undefined) {
          // Customer-facing node with lead time requirement (including 0 = immediate)
          node.requiredLeadTime = node.customerTolerance;
          initializedCount++;
          console.log(`[RLT] Initialized ${id}: RLT = ${node.requiredLeadTime} days`);
        } else {
          // No customer requirement: set to Infinity (no constraint)
          node.requiredLeadTime = Infinity;
        }
      }
      
      console.log(`[RLT] Initialized ${initializedCount} customer-facing nodes`);
      console.log(`[RLT] Reset ${resetCount} unlocked buffers`);
    },
    
    // =======================================================================
    // SINGLE-PASS PROPAGATION: Process nodes in topological order
    // =======================================================================
    
    propagateRequirements: function(logIterations) {
      const EPSILON = 0.001; // Numerical stability for comparisons
      
      const result = {
        buffersSet: [],
        unsolvableConstraints: [],
        nodesProcessed: 0,
        propagations: 0
      };
      
      // Get nodes in topological order (parents before children)
      const nodes = this.getTopologicalOrder();
      
      // Single pass through all nodes
      for (const node of nodes) {
        // Process nodes with finite RLT (skip Infinity = no constraint yet)
        // Note: RLT = 0 is valid (immediate delivery required)
        if (node.requiredLeadTime >= Infinity) {
          continue;
        }
        
        result.nodesProcessed++;
        
        // Calculate remaining time after this node's operation
        const remainingTime = node.requiredLeadTime - node.leadTime;
        
        // CASE 1: Node is locked WITH buffer â†’ stop propagation (decoupling point)
        if (node.bufferLocked && node.hasBuffer) {
          if (logIterations) {
            console.log(`[RLT] ${node.id}: Locked buffer present â†’ decoupling (no propagation)`);
          }
          continue;
        }
        
        // CASE 2: Deficit (remainingTime < 0) â†’ buffer needed
        if (remainingTime < -EPSILON) {
          
          // CASE 2a: Node is NOT locked â†’ set mandatory buffer
          if (!node.bufferLocked) {
            node.hasBuffer = true;
            result.buffersSet.push({
              nodeId: node.id,
              nodeName: node.name,
              reason: 'mandatory',
              requiredLeadTime: node.requiredLeadTime,
              leadTime: node.leadTime,
              remainingTime
            });
            
            if (logIterations) {
              console.log(`[RLT] BUFFER ${node.id} (mandatory, deficit=${(-remainingTime).toFixed(2)} days)`);
            }
          }
          
          // CASE 2b: Node is locked WITHOUT buffer â†’ unsolvable constraint
          else {
            result.unsolvableConstraints.push({
              nodeId: node.id,
              nodeName: node.name,
              requiredLeadTime: node.requiredLeadTime,
              leadTime: node.leadTime,
              deficit: -remainingTime,
              reason: 'locked_without_buffer'
            });
            
            if (logIterations) {
              console.warn(`[RLT] âš  ${node.id}: UNSOLVABLE (locked without buffer, deficit=${(-remainingTime).toFixed(2)} days)`);
            }
            
            // Do not propagate negative time to children
            continue;
          }
        }
        
        // CASE 3: Sufficient time (remainingTime >= 0) â†’ propagate to children
        else {
          if (!node.children || node.children.length === 0) {
            continue;
          }
          
          for (const childRef of node.children) {
            const child = window.currentNetwork.nodes.get(childRef.id);
            if (!child) continue;
            
            const oldRLT = child.requiredLeadTime;
            
            // Propagate WITHOUT checking child.hasBuffer
            // Use Math.min to keep the most restrictive requirement
            child.requiredLeadTime = Math.min(
              child.requiredLeadTime,
              remainingTime
            );
            
            if (child.requiredLeadTime < oldRLT - EPSILON) {
              result.propagations++;
              
              if (logIterations) {
                const oldDisplay = oldRLT === Infinity ? 'âˆž' : oldRLT.toFixed(2);
                console.log(`[RLT] PROPAGATE ${node.id} â†’ ${child.id} (RLT: ${oldDisplay} â†’ ${child.requiredLeadTime.toFixed(2)} days)`);
              }
            }
          }
        }
      }
      
      if (logIterations) {
        console.log(`[RLT] Propagation complete: ${result.nodesProcessed} nodes, ${result.buffersSet.length} buffers, ${result.propagations} propagations`);
        if (result.unsolvableConstraints.length > 0) {
          console.warn(`[RLT] âš  ${result.unsolvableConstraints.length} unsolvable constraints (locked nodes without buffers)`);
        }
      }
      
      return result;
    },
    
    // =======================================================================
    // TOPOLOGICAL SORT: Parents Before Children
    // =======================================================================
    
    getTopologicalOrder: function() {
      const nodes = Array.from(window.currentNetwork.nodes.values());
      const visited = new Set();
      const order = [];
      
      // DFS-based topological sort
      function visit(node) {
        if (visited.has(node.id)) return;
        visited.add(node.id);
        
        // Visit parents first (parents before children)
        for (const parentRef of node.parents) {
          const parentNode = window.currentNetwork.nodes.get(parentRef.id);
          if (parentNode) {
            visit(parentNode);
          }
        }
        
        order.push(node);
      }
      
      // Start from all nodes (ensures all are visited)
      for (const node of nodes) {
        visit(node);
      }
      
      return order;
    },
    
    // =======================================================================
    // VALIDATION: Check Network Before Running
    // =======================================================================
    
    validateNetwork: function() {
      const errors = [];
      const nodes = window.currentNetwork.nodes;
      
      // Check 1: Customer-facing nodes have valid customerTolerance
      // customerTolerance interpretation:
      // - undefined or 0: Immediate delivery required (valid)
      // - > 0: Specific lead time tolerance (valid)
      // - < 0: Invalid (reject)
      let customerFacingCount = 0;
      for (const [id, node] of nodes) {
        if (node.independentADU > 0) {
          customerFacingCount++;
          // Only reject negative customerTolerance values
          if (node.customerTolerance !== undefined && node.customerTolerance < 0) {
            errors.push(`Node "${node.name}" (${id}) has negative customerTolerance (${node.customerTolerance})`);
          }
          // Note: undefined or 0 are both valid (interpreted as immediate delivery)
        }
      }
      
      if (customerFacingCount === 0) {
        errors.push('No customer-facing nodes found (independentADU > 0). Cannot run auto-positioning without customer requirements.');
      }
      
      // Check 2: Detect cycles using DFS
      const hasCycle = this.detectCycles();
      if (hasCycle) {
        errors.push('Network contains cycles - topological sort undefined');
      }
      
      // Check 3: All lead times are positive
      for (const [id, node] of nodes) {
        if (node.leadTime <= 0) {
          errors.push(`Node "${node.name}" (${id}) has invalid leadTime: ${node.leadTime}`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    },
    
    // =======================================================================
    // CYCLE DETECTION: Ensure DAG
    // =======================================================================
    
    detectCycles: function() {
      const nodes = window.currentNetwork.nodes;
      const visited = new Set();
      const recursionStack = new Set();
      
      function hasCycleDFS(nodeId) {
        if (recursionStack.has(nodeId)) return true; // Cycle detected
        if (visited.has(nodeId)) return false; // Already processed
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const node = nodes.get(nodeId);
        if (!node) {
          recursionStack.delete(nodeId);
          return false;
        }
        
        if (!node.children || node.children.length === 0) {
          recursionStack.delete(nodeId);
          return false;
        }
        
        for (const childRef of node.children) {
          if (hasCycleDFS(childRef.id)) {
            return true;
          }
        }
        
        recursionStack.delete(nodeId);
        return false;
      }
      
      for (const [id] of nodes) {
        if (!visited.has(id)) {
          if (hasCycleDFS(id)) {
            return true;
          }
        }
      }
      
      return false;
    },
    
    // =======================================================================
    // BUFFER STATE MANAGEMENT
    // =======================================================================
    
    captureBufferState: function() {
      const state = [];
      const nodes = window.currentNetwork.nodes;
      for (const [id, node] of nodes) {
        if (node.hasBuffer) {
          state.push({
            nodeId: id,
            nodeName: node.name,
            locked: node.bufferLocked || false
          });
        }
      }
      return state;
    },
    
    compareBufferStates: function(before, after) {
      const beforeIds = new Set(before.map(b => b.nodeId));
      const afterIds = new Set(after.map(b => b.nodeId));
      
      const added = after.filter(b => !beforeIds.has(b.nodeId));
      const removed = before.filter(b => !afterIds.has(b.nodeId));
      const unchanged = after.filter(b => beforeIds.has(b.nodeId));
      
      return { added, removed, unchanged };
    }
  };
  
  console.log('[RLT] âœ“ Required Lead Time Propagation Engine loaded');
  
})();