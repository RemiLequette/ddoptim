// ============================================================================
// SCRIPT 930: Auto-Position UI Handlers
// ============================================================================
// PURPOSE: UI controls for Required Lead Time auto-positioning workflow
// ============================================================================

(function() {
  'use strict';
  
  console.log('[Auto-Position UI] Loading...');
  
  // Store algorithm results and rationale snapshot for apply/cancel actions
  let pendingResults = null;
  let rationaleSnapshot = null;
  
  // =========================================================================
  // MODULE: AutoPositionUI
  // =========================================================================
  
  window.AutoPositionUI = {
    
    // =======================================================================
    // BUTTON CLICK: Run Algorithm and Show Preview
    // =======================================================================
    
    runAlgorithm: function() {
      console.log('[Auto-Position UI] Running algorithm...');
      
      try {
        // âœ… SNAPSHOT: Capture rationales of existing unlocked buffers
        const nodes = window.currentNetwork.nodes;
        rationaleSnapshot = new Map();
        for (const [id, node] of nodes) {
          if (node.hasBuffer && !node.bufferLocked) {
            rationaleSnapshot.set(id, node.bufferRationale || '');
            console.log(`[Auto-Position UI] Snapshot: ${id} rationale="${node.bufferRationale || ''}"`);
          }
        }
        console.log(`[Auto-Position UI] Captured ${rationaleSnapshot.size} rationale(s) in snapshot`);
        
        // Run algorithm with locked buffer respect
        const result = window.RequiredLeadTimePropagation.autoPositionBuffers({
          respectLockedBuffers: true,
          logIterations: true
        });
        
        // âœ… SET AUTOMATIC RATIONALE: For all buffers positioned by algorithm
        for (const bufferedNode of result.buffersSet) {
          const node = nodes.get(bufferedNode.nodeId);
          if (node && !node.bufferLocked) {
            node.bufferRationale = 'For customer tolerance (automatic)';
            console.log(`[Auto-Position UI] Set automatic rationale for ${bufferedNode.nodeId}`);
          }
        }
        
        // Unsolvable constraints are displayed in the preview modal
        // No need for a blocking alert - user can see details in the modal
        
        // Store results for apply action
        pendingResults = result;
        
        // IMPORTANT: Recalculate immediately to show buffer changes in visualization
        // (before opening preview modal)
        this.refreshAfterAlgorithm();
        
        // Render preview modal
        this.renderPreview(result);
        
        // Show modal
        this.openModal();
        
      } catch (err) {
        console.error('[Auto-Position UI] Error:', err);
        alert('Error running algorithm: ' + err.message);
      }
    },
    
    // =======================================================================
    // REFRESH: Recalculate and Update Visualization After Algorithm
    // =======================================================================
    
    refreshAfterAlgorithm: function() {
      console.log('[Auto-Position UI] Refreshing after algorithm...');
      
      // Get current network
      const nodes = window.currentNetwork.nodes;
      
      // Recalculate DLT (buffer status changed) - PASS nodes parameter
      window.DLTCalculator.calculateDLT(nodes);
      
      // Recalculate delivery lead time metrics (updates missingCustomerLeadTime)
      if (window.DeliveryLeadTimeCalculator && window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime) {
        window.DeliveryLeadTimeCalculator.calculateDeliveryLeadTime(nodes);
      }
      
      // Recalculate buffer sizing for all buffered nodes
      if (typeof window.calculateBufferSizing === 'function') {
        for (const [id, node] of nodes) {
          if (node.hasBuffer) {
            window.calculateBufferSizing(node);
          }
        }
      }
      
      // Update metrics
      if (typeof window.updateMetricsDisplay === 'function') {
        window.updateMetricsDisplay();
      }
      
      // Refresh network visualization (shows new buffer indicators)
      if (window.NetworkRenderer && window.NetworkRenderer.render) {
        window.NetworkRenderer.render(window.currentNetwork);
      }
      
      console.log('[Auto-Position UI] Refresh complete');
    },
    
    // =======================================================================
    // RENDER PREVIEW: Populate Modal with Results
    // =======================================================================
    
    renderPreview: function(result) {
      console.log('[Auto-Position UI] Rendering preview...');
      
      // Summary counts
      document.getElementById('buffers-add-count').textContent = result.changes.added.length;
      document.getElementById('buffers-remove-count').textContent = result.changes.removed.length;
      document.getElementById('buffers-locked-count').textContent = result.changes.unchanged.filter(b => b.locked).length;
      
      // Changes list
      const changesList = document.getElementById('buffer-changes-list');
      changesList.innerHTML = '';
      
      if (result.changes.added.length === 0 && result.changes.removed.length === 0) {
        changesList.innerHTML = '<p style="color: var(--b2w-text-muted); font-style: italic;">No changes proposed. All buffers are optimally positioned.</p>';
      } else {
        // Added buffers
        result.changes.added.forEach(buffer => {
          const bufferInfo = result.buffersSet.find(b => b.nodeId === buffer.nodeId);
          const reasonText = bufferInfo ? 
            (bufferInfo.reason === 'mandatory' ? 
              `Mandatory (remaining time: ${bufferInfo.remainingTime.toFixed(2)} days)` : 
              'Strategic positioning') : 
            'Auto-positioned';
          
          const item = document.createElement('div');
          item.style.cssText = 'padding: 8px; margin-bottom: 8px; border-left: 3px solid var(--b2w-success); background: var(--b2w-surface); border-radius: 4px;';
          item.innerHTML = `
            <strong style="color: var(--b2w-success);">âž• Add Buffer:</strong> ${buffer.nodeName} (${buffer.id})<br>
            <small style="color: var(--b2w-text-muted);">Reason: ${reasonText}</small>
          `;
          changesList.appendChild(item);
        });
        
        // Removed buffers
        result.changes.removed.forEach(buffer => {
          const item = document.createElement('div');
          item.style.cssText = 'padding: 8px; margin-bottom: 8px; border-left: 3px solid var(--b2w-error); background: var(--b2w-surface); border-radius: 4px;';
          item.innerHTML = `
            <strong style="color: var(--b2w-error);">âž– Remove Buffer:</strong> ${buffer.nodeName} (${buffer.id})<br>
            <small style="color: var(--b2w-text-muted);">No longer needed for customer requirements</small>
          `;
          changesList.appendChild(item);
        });
        
        // Locked buffers (preserved)
        const lockedBuffers = result.changes.unchanged.filter(b => b.locked);
        if (lockedBuffers.length > 0) {
          const item = document.createElement('div');
          item.style.cssText = 'padding: 8px; margin-bottom: 8px; border-left: 3px solid var(--b2w-warning); background: var(--b2w-surface); border-radius: 4px;';
          item.innerHTML = `
            <strong style="color: var(--b2w-warning);">ðŸ”’ Locked Buffers (Preserved):</strong><br>
            <small style="color: var(--b2w-text-muted);">${lockedBuffers.map(b => b.nodeName).join(', ')}</small>
          `;
          changesList.appendChild(item);
        }
      }
      
      // Unsolvable constraints warning (if any)
      if (result.unsolvableConstraints && result.unsolvableConstraints.length > 0) {
        const warningItem = document.createElement('div');
        warningItem.style.cssText = 'padding: 8px; margin-bottom: 8px; border-left: 3px solid var(--b2w-error); background: var(--b2w-surface); border-radius: 4px;';
        warningItem.innerHTML = `
          <strong style="color: var(--b2w-error);">âš  Unsolvable Constraints:</strong><br>
          <small style="color: var(--b2w-text-muted);">
            ${result.unsolvableConstraints.map(c => 
              `${c.nodeName}: deficit of ${c.deficit.toFixed(2)} days (locked without buffer)`
            ).join('<br>')}
          </small>
        `;
        changesList.appendChild(warningItem);
      }
      
      // Algorithm summary (single-pass, no iterations)
      const logText = `Single-pass topological sort completed:\n` +
        `- Nodes processed: ${result.buffersSet.length > 0 ? 'multiple' : 'none'}\n` +
        `- Buffers set: ${result.buffersSet.length}\n` +
        `- Unsolvable constraints: ${result.unsolvableConstraints ? result.unsolvableConstraints.length : 0}`;
      
      document.getElementById('algorithm-log-text').textContent = logText;
      
      // Enable/disable Apply button based on whether there are changes
      const applyBtn = document.getElementById('btn-apply-auto-position');
      if (applyBtn) {
        const hasChanges = result.changes.added.length > 0 || result.changes.removed.length > 0;
        applyBtn.disabled = !hasChanges;
        if (!hasChanges) {
          applyBtn.style.opacity = '0.5';
          applyBtn.style.cursor = 'not-allowed';
        } else {
          applyBtn.style.opacity = '1';
          applyBtn.style.cursor = 'pointer';
        }
      }
    },
    
    // =======================================================================
    // APPLY CHANGES: Commit Buffer Decisions (Keep Changes)
    // =======================================================================
    // NOTE: Called by inline onclick in DIV 108 (btn-apply-auto-position)
    // =======================================================================
    
    applyChanges: function() {
      console.log('[Auto-Position UI] Applying changes (keeping buffer decisions with automatic rationales)...');
      
      if (!pendingResults) {
        console.error('[Auto-Position UI] No pending results to apply');
        return;
      }
      
      try {
        // Buffer decisions are already set with automatic rationales
        // Just close modal and clear pending results
        
        const appliedResults = pendingResults;
        pendingResults = null;
        rationaleSnapshot = null; // âœ… Clear snapshot
        
        // Close modal
        this.closeModal();
        
        console.log('[Auto-Position UI] Changes applied successfully');
        console.log(`âœ“ Applied: ${appliedResults.changes.added.length} buffers added, ${appliedResults.changes.removed.length} buffers removed`);
        console.log('âœ“ All automatic buffers have rationale: "For customer tolerance (automatic)"');
        
      } catch (err) {
        console.error('[Auto-Position UI] Error applying changes:', err);
        alert('Error applying changes: ' + err.message);
      }
    },
    
    // =======================================================================
    // MODAL CONTROLS
    // =======================================================================
    // NOTE: closeModal is called by inline onclick in DIV 108
    // - Modal overlay click
    // - Modal close button (Ã—)
    // - Cancel button (btn-cancel-auto-position)
    // =======================================================================
    
    openModal: function() {
      const modal = document.getElementById('auto-position-modal');
      if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
      }
    },
    
    closeModal: function() {
      const modal = document.getElementById('auto-position-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
      }
      
      // If user closes modal without applying, revert changes
      if (pendingResults) {
        console.log('[Auto-Position UI] Modal closed without applying - reverting changes...');
        
        try {
          const nodes = window.currentNetwork.nodes;
          
          // âœ… RESTORE WORKFLOW:
          // Step 1: Clear all unlocked buffers and rationales
          for (const [id, node] of nodes) {
            if (!node.bufferLocked) {
              node.hasBuffer = false;
              node.bufferRationale = '';
            }
          }
          console.log('[Auto-Position UI] Cleared all unlocked buffers');
          
          // Step 2: Restore buffers that existed before (with their original rationales)
          if (rationaleSnapshot) {
            for (const [id, rationale] of rationaleSnapshot) {
              const node = nodes.get(id);
              if (node && !node.bufferLocked) {
                node.hasBuffer = true;
                node.bufferRationale = rationale;
                console.log(`[Auto-Position UI] Restored: ${id} with rationale="${rationale}"`);
              }
            }
            console.log(`[Auto-Position UI] Restored ${rationaleSnapshot.size} buffer(s) with original rationales`);
          }
          
          // Recalculate everything
          this.refreshAfterAlgorithm();
          
          console.log('[Auto-Position UI] âœ“ Changes reverted to before state');
          
        } catch (err) {
          console.error('[Auto-Position UI] Error reverting changes:', err);
        }
        
        // Clear pending results and snapshot
        pendingResults = null;
        rationaleSnapshot = null;
      }
    }
  };
  
  // =========================================================================
  // EVENT LISTENERS: Wire Up Auto-Position Button
  // =========================================================================
  
  document.addEventListener('DOMContentLoaded', function() {
    // Auto-position button (in main toolbar)
    const btn = document.getElementById('autoPositionBtn');
    if (btn) {
      btn.addEventListener('click', function() {
        window.AutoPositionUI.runAlgorithm();
      });
      console.log('[Auto-Position UI] Auto-position button wired up');
    } else {
      console.warn('[Auto-Position UI] Auto-position button not found (id: autoPositionBtn)');
    }
  });
  
  console.log('[Auto-Position UI] âœ“ Module loaded');
  
})();