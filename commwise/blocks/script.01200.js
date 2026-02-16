// DDoptim Initialization
// Load Simple Chain model by default on startup

(function() {
    console.log('DDoptim initialization starting...');
    
    function tryInitialize() {
        // Check dependencies
        if (typeof d3 === 'undefined') {
            console.log('Waiting for D3.js...');
            setTimeout(tryInitialize, 100);
            return;
        }
        
        if (typeof NetworkRenderer === 'undefined') {
            console.log('Waiting for NetworkRenderer...');
            setTimeout(tryInitialize, 100);
            return;
        }
        
        if (!window.ModelLoader || !window.ModelLoader.loadFromLibrary) {
            console.log('Waiting for ModelLoader...');
            setTimeout(tryInitialize, 100);
            return;
        }
        
        if (!window.MODEL_LIBRARY || !window.MODEL_LIBRARY.simple_chain) {
            console.log('Waiting for MODEL_LIBRARY...');
            setTimeout(tryInitialize, 100);
            return;
        }
        
        // All dependencies ready!
        console.log('All modules loaded, initializing...');
        console.log('D3.js version:', d3.version);
        
        try {
            // Initialize network renderer
            NetworkRenderer.init();
            console.log('âœ“ NetworkRenderer initialized');
            
            // Load Simple Chain model using unified loader
            console.log('Loading default model: Simple Chain...');
            const result = window.ModelLoader.loadFromLibrary('simple_chain');
            
            if (result.success) {
                console.log('âœ“ Initialization complete:', result.message);
                
                // Update model selector UI to reflect loaded model
                const modelSelect = document.getElementById('modelSelect');
                const modelStatus = document.getElementById('modelStatus');
                if (modelSelect) {
                    modelSelect.value = 'simple_chain';
                }
                if (modelStatus) {
                    modelStatus.textContent = result.message;
                    modelStatus.style.color = '#10b981';
                }
            } else {
                console.error('âŒ Initialization failed:', result.message);
            }
            
        } catch (error) {
            console.error('âœ— Error during initialization:', error);
            console.error('Stack trace:', error.stack);
        }
    }
    
    // Start initialization
    setTimeout(tryInitialize, 100);
})();