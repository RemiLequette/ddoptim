// SCRIPT 900: UI Core Module - State & Event Handlers

// Initialize DDOptim global state if not already initialized
if (!window.DDOptim) {
  window.DDOptim = {};
}

// Add model name properties if not present
if (!window.DDOptim.modelName) {
  window.DDOptim.modelName = "Weber_Pignons";
}
if (!window.DDOptim.modelVersion) {
  window.DDOptim.modelVersion = 1;
}

// Add utility functions if not present
if (!window.DDOptim.utils) {
  window.DDOptim.utils = {
    // Get current date string for filenames
    getDateString: () => {
      const now = new Date();
      return now.toISOString().split('T')[0].replace(/-/g, '');
    },
    
    // Generate filename with model name, date, and version
    generateFilename: (extension = 'json') => {
      const state = window.DDOptim;
      const modelName = (state.modelName || 'Untitled').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = state.utils.getDateString();
      const version = `v${state.modelVersion || 1}`;
      return `${modelName}_${dateStr}_${version}.${extension}`;
    },
    
    // Format currency
    formatCurrency: (value, currency = "â‚¬") => {
      return `${currency}${value.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    }
  };
}

console.log('âœ… DDOptim state initialized');
console.log(`ðŸ“Š Model: ${window.DDOptim.modelName}`);

// UIHandlers compatibility layer for SCRIPT 905 and other refactored handlers
if (!window.UIHandlers) {
  window.UIHandlers = {
    // Current selected node ID
    _currentNodeId: null,
    
    setCurrentNodeId: function(nodeId) {
      this._currentNodeId = nodeId;
    },
    
    getCurrentNodeId: function() {
      return this._currentNodeId;
    },
    
    // Get node from current network
    getNode: function(nodeId) {
      if (!window.currentNetwork || !window.currentNetwork.nodes) return null;
      const nodes = window.currentNetwork.nodes;
      return nodes.get ? nodes.get(nodeId) : nodes[nodeId];
    },
    
    // Format node type for display
    formatType: function(type) {
      const typeMap = {
        'finished_good': 'Finished Good',
        'intermediate': 'Intermediate',
        'raw_material': 'Raw Material',
        'purchased': 'Purchased'
      };
      return typeMap[type] || type;
    },
    
    // Show node details - will be set by SCRIPT 905
    showNodeDetails: null
  };
  
  console.log('âœ… UIHandlers compatibility layer initialized');
}

// UI Event Handlers
(function() {
  'use strict';
  
  console.log('ðŸŽ¯ Loading UI Event Handlers...');
  
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventHandlers);
  } else {
    initEventHandlers();
  }
  
  function initEventHandlers() {
    console.log('ðŸ“Œ Initializing event handlers...');
    
    // Model Name Edit Handlers
    initModelNameHandlers();
    
    // Detail Panel Close Button
    initDetailPanelHandlers();
    
    // Load Data Button
    const loadDataBtn = document.getElementById('loadDataBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (loadDataBtn && fileInput) {
      loadDataBtn.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Export Button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', handleExport);
    }
    
    // Help Button
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        alert('DDoptim Help\n\n' +
              '1. Load network data or use Weber Pignons default\n' +
              '2. Click nodes to view details and position buffers\n' +
              '3. Toggle buffers ON/OFF to see impact\n' +
              '4. Monitor metrics in real-time\n' +
              '5. Export your buffer strategy as JSON');
      });
    }
    
    console.log('âœ… Event handlers initialized');
  }
  
  // Detail Panel Handlers
  function initDetailPanelHandlers() {
    const closeBtn = document.getElementById('detail-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const panel = document.getElementById('node-detail-panel');
        if (panel) {
          panel.classList.remove('open');
          console.log('ðŸ“ Detail panel closed');
        }
      });
      console.log('âœ… Detail panel close button initialized');
    } else {
      console.warn('âš ï¸ Detail panel close button not found');
    }
  }
  
  // Model Name Inline Edit Handlers
  function initModelNameHandlers() {
    const displayDiv = document.getElementById('modelNameDisplay');
    const editDiv = document.getElementById('modelNameEdit');
    const modelNameText = document.getElementById('modelNameText');
    const modelNameInput = document.getElementById('modelNameInput');
    const editBtn = document.getElementById('editModelNameBtn');
    const saveBtn = document.getElementById('saveModelNameBtn');
    const cancelBtn = document.getElementById('cancelModelNameBtn');
    
    if (!displayDiv || !editDiv || !modelNameText || !modelNameInput) {
      console.warn('âš ï¸ Model name elements not found');
      return;
    }
    
    // Load saved model name from localStorage
    try {
      const savedName = localStorage.getItem('ddoptim_model_name');
      if (savedName) {
        window.DDOptim.modelName = savedName;
        modelNameText.textContent = savedName;
        console.log(`ðŸ“‚ Loaded model name from storage: ${savedName}`);
      } else {
        modelNameText.textContent = window.DDOptim.modelName;
      }
    } catch (err) {
      console.warn('Could not load model name from localStorage:', err);
      modelNameText.textContent = window.DDOptim.modelName || 'Weber_Pignons';
    }
    
    // Enter edit mode
    function enterEditMode() {
      displayDiv.classList.add('hidden');
      editDiv.classList.add('active');
      modelNameInput.value = window.DDOptim.modelName || 'Weber_Pignons';
      modelNameInput.focus();
      modelNameInput.select();
    }
    
    // Exit edit mode
    function exitEditMode() {
      displayDiv.classList.remove('hidden');
      editDiv.classList.remove('active');
    }
    
    // Save model name
    function saveModelName() {
      const newName = modelNameInput.value.trim();
      
      if (!newName) {
        alert('Model name cannot be empty');
        modelNameInput.focus();
        return;
      }
      
      // Update app state
      window.DDOptim.modelName = newName;
      modelNameText.textContent = newName;
      
      // Save to localStorage
      try {
        localStorage.setItem('ddoptim_model_name', newName);
        console.log(`ðŸ’¾ Model name saved: ${newName}`);
      } catch (err) {
        console.warn('Could not save model name to localStorage:', err);
      }
      
      exitEditMode();
    }
    
    // Cancel edit
    function cancelEdit() {
      exitEditMode();
    }
    
    // Event listeners
    if (editBtn) {
      editBtn.addEventListener('click', enterEditMode);
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', saveModelName);
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelEdit);
    }
    
    // Enter key to save, Escape to cancel
    if (modelNameInput) {
      modelNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveModelName();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });
    }
    
    console.log('âœ… Model name handlers initialized');
  }
  
  // Update model name display (can be called externally)
  window.updateModelNameDisplay = function(newName) {
    const modelNameText = document.getElementById('modelNameText');
    if (modelNameText) {
      modelNameText.textContent = newName;
    }
    if (window.DDOptim) {
      window.DDOptim.modelName = newName;
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('ddoptim_model_name', newName);
    } catch (err) {
      console.warn('Could not save model name:', err);
    }
  };
  
  // File Upload Handler
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log(`ðŸ“‚ Loading file: ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Extract model name from data if present
        if (data.modelName) {
          window.updateModelNameDisplay(data.modelName);
          console.log(`ðŸ“ Model name from file: ${data.modelName}`);
        }
        
        // Extract version if present
        if (data.modelVersion && window.DDOptim) {
          window.DDOptim.modelVersion = data.modelVersion;
        }
        
        // Load network data
        if (typeof window.loadNetworkData === 'function') {
          window.loadNetworkData(data);
          console.log('âœ… Data loaded successfully');
        } else {
          console.error('âŒ loadNetworkData function not available');
        }
        
      } catch (err) {
        console.error('âŒ Error parsing JSON file:', err);
        alert('Error loading file. Please check the JSON format.');
      }
    };
    
    reader.onerror = () => {
      console.error('âŒ Error reading file');
      alert('Error reading file');
    };
    
    reader.readAsText(file);
    
    // Reset input so same file can be loaded again
    event.target.value = '';
  }
  
  // Export Handler
  function handleExport() {
    console.log('ðŸ’¾ Exporting data...');
    
    try {
      if (!window.DDOptim) {
        alert('Application not fully initialized');
        return;
      }
      
      // Prepare export data
      const exportData = {
        modelName: window.DDOptim.modelName || 'Untitled',
        modelVersion: window.DDOptim.modelVersion || 1,
        exportDate: new Date().toISOString(),
        
        // Input data (user-provided)
        nodes: window.DDOptim.nodes ? Array.from(window.DDOptim.nodes.values()).map(node => ({
          id: node.id,
          name: node.name,
          type: node.type,
          leadTime: node.leadTime,
          unitCost: node.unitCost,
          independentADU: node.independentADU || 0,
          children: node.children || [],
          
          // Buffer configuration (if buffered)
          buffer: node.buffer ? {
            enabled: node.buffer.enabled,
            profile: node.buffer.profile,
            moq: node.buffer.moq,
            cycle: node.buffer.cycle,
            rationale: node.buffer.rationale
          } : null
        })) : [],
        
        // Configuration
        config: window.DDOptim.config || {},
        
        // Scenario info
        scenario: window.DDOptim.currentScenario || {
          name: 'Default',
          created: new Date().toISOString()
        }
      };
      
      // Add calculated metrics if available
      if (window.DDOptim.calculatedMetrics) {
        exportData.calculatedMetrics = window.DDOptim.calculatedMetrics;
      }
      
      // Generate filename with model name, date, and version
      const filename = window.DDOptim.utils.generateFilename('json');
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`âœ… Exported to: ${filename}`);
      
      // Increment version for next export
      window.DDOptim.modelVersion++;
      
    } catch (err) {
      console.error('âŒ Export error:', err);
      alert('Error exporting data: ' + err.message);
    }
  }
  
  console.log('âœ… UI Event Handlers loaded');
  
})();

// CRITICAL FIX: Wire up onNodeSelect handler for NetworkRenderer
// This is called when a node is clicked in the visualization
window.DDOptim.onNodeSelect = function(nodeId) {
  console.log('ðŸ” onNodeSelect triggered for:', nodeId);
  
  // Wait for UIHandlers.showNodeDetails to be defined by SCRIPT 905
  if (window.UIHandlers && typeof window.UIHandlers.showNodeDetails === 'function') {
    window.UIHandlers.showNodeDetails(nodeId);
  } else {
    console.warn('âš ï¸ UIHandlers.showNodeDetails not yet available, retrying...');
    setTimeout(() => {
      if (window.UIHandlers && typeof window.UIHandlers.showNodeDetails === 'function') {
        window.UIHandlers.showNodeDetails(nodeId);
      } else {
        console.error('âŒ UIHandlers.showNodeDetails still not available');
      }
    }, 100);
  }
};

console.log('âœ… onNodeSelect handler registered on DDOptim');