// Export/Import Button Handlers
// Wires up UI buttons to JSONExport and JSONImport modules

(function() {
  'use strict';

  // Wait for DOM to be ready
  function initExportImportHandlers() {
    // Export button
    const exportBtn = document.getElementById('exportJsonBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        console.log('ðŸ“¤ Export button clicked');
        
        if (window.JSONExport && window.JSONExport.exportToFile) {
          window.JSONExport.exportToFile();
        } else {
          console.error('âŒ JSONExport module not loaded');
          alert('Export functionality not available. Please refresh the page.');
        }
      });
      console.log('âœ… Export button handler attached');
    } else {
      console.warn('âš ï¸ Export button not found in DOM');
    }

    // Import button
    const importBtn = document.getElementById('importJsonBtn');
    if (importBtn) {
      importBtn.addEventListener('click', function() {
        console.log('ðŸ“¥ Import button clicked');
        
        if (window.JSONImport && window.JSONImport.importFromFile) {
          window.JSONImport.importFromFile();
        } else {
          console.error('âŒ JSONImport module not loaded');
          alert('Import functionality not available. Please refresh the page.');
        }
      });
      console.log('âœ… Import button handler attached');
    } else {
      console.warn('âš ï¸ Import button not found in DOM');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExportImportHandlers);
  } else {
    initExportImportHandlers();
  }
})();

console.log('âœ… Export/Import button handlers initialized');