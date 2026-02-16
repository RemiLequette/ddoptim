// JSON Export Module - Captures complete model state
// Exports: nodes, BOM, user modifications (ADU, lead times, buffers, costs, etc.)
// ONLY SAVES USER INPUT - calculated values are recomputed on import

window.JSONExport = (function() {
  'use strict';

  /**
   * Export current network state to JSON file
   * Captures all user modifications from detail panel
   */
  function exportToFile() {
    try {
      // Get current network from global state
      const network = window.currentNetwork;
      if (!network || !network.nodes) {
        alert('No network loaded. Please load a model first.');
        return;
      }

      // Get actual model name from the display
      const actualModelName = getActualModelName();

      // Build export object
      const exportData = {
        metadata: {
          name: actualModelName,  // Use 'name' to match MODEL_LIBRARY format
          description: network.metadata?.description || '',
          version: network.metadata?.version || '1.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'DDoptim v1.0'
        },
        nodes: serializeNodes(network.nodes),
        bufferProfiles: window.BUFFER_PROFILES || {}
      };

      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create download
      downloadJSON(jsonString, generateFilename(actualModelName));

      console.log('âœ… Network exported successfully:', actualModelName);
    } catch (error) {
      console.error('âŒ Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  }

  /**
   * Get the actual model name from the UI display
   * Reads from the model name display element
   */
  function getActualModelName() {
    // Try to read from UI display
    const displayElement = document.getElementById('modelNameDisplay');
    if (displayElement && displayElement.textContent.trim()) {
      return displayElement.textContent.trim();
    }

    // Fallback to global variable
    if (window.currentModelName) {
      return window.currentModelName;
    }

    // Fallback to network metadata
    if (window.currentNetwork?.metadata?.name) {
      return window.currentNetwork.metadata.name;
    }

    // Last resort
    return 'Custom Model';
  }

  /**
   * Serialize nodes Map to array with ONLY user-input data
   * Excludes calculated values: parents, calculatedADU, clt, dlt, bufferSizing
   * These will be recomputed on import
   */
  function serializeNodes(nodesMap) {
    const nodesArray = [];

    nodesMap.forEach((node, nodeId) => {
      const serialized = {
        // Core identity
        id: node.id,
        name: node.name,
        type: node.type,

        // BOM relationships - ONLY children (parents are computed)
        children: node.children || [],

        // Basic parameters (user-editable)
        independentADU: node.independentADU || 0,
        leadTime: node.leadTime || 0,
        bufferProfile: node.bufferProfile || null,

        // Customer lead time requirement (only meaningful if independentADU > 0)
        customerTolerance: node.customerTolerance || null,

        // Scenario parameters (user-editable)
        moq: node.moq || 0,
        orderCycle: node.orderCycle || 0,
        unitCost: node.unitCost || 0,

        // Buffer decisions (user-editable)
        hasBuffer: node.hasBuffer || false,
        bufferLocked: node.bufferLocked || false,
        bufferRationale: node.bufferRationale || ''
      };

      // Remove null buffer profile (let import use defaults)
      if (!serialized.bufferProfile) {
        delete serialized.bufferProfile;
      }

      // Remove null customerTolerance if not applicable
      if (!serialized.customerTolerance) {
        delete serialized.customerTolerance;
      }

      nodesArray.push(serialized);
    });

    return nodesArray;
  }

  /**
   * Generate filename with timestamp
   */
  function generateFilename(modelName) {
    const cleanName = (modelName || 'model')
      .toLowerCase()
      .replace(/\s+/g, '_');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `ddoptim_${cleanName}_${timestamp}.json`;
  }

  /**
   * Trigger browser download of JSON file
   */
  function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Public API
  return {
    exportToFile: exportToFile
  };
})();

console.log('âœ… JSON Export module loaded');
