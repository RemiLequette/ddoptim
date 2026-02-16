// Model Selector Event Handler
(function() {
    console.log('ðŸ”§ Model Selector: Initializing event handlers...');
    
    const modelSelect = document.getElementById('modelSelect');
    const loadModelBtn = document.getElementById('loadModelBtn');
    const modelStatus = document.getElementById('modelStatus');
    const leadTimeDisplaySelect = document.getElementById('leadTimeDisplaySelect');
    
    if (!modelSelect || !loadModelBtn || !modelStatus) {
        console.error('âŒ Model selector elements not found!');
        return;
    }
    
    // Initialize lead time display mode (default: decoupled)
    window.leadTimeDisplayMode = 'decoupled';
    
    loadModelBtn.addEventListener('click', function() {
        const selectedModel = modelSelect.value;
        
        if (!selectedModel) {
            modelStatus.textContent = 'Please select a model first';
            modelStatus.style.color = '#ef4444';
            return;
        }
        
        // Check if ModelLoader is available
        if (!window.ModelLoader || !window.ModelLoader.loadFromLibrary) {
            modelStatus.textContent = 'ModelLoader not available';
            modelStatus.style.color = '#ef4444';
            console.error('âŒ ModelLoader not found');
            return;
        }
        
        modelStatus.textContent = `Loading ${selectedModel}...`;
        modelStatus.style.color = '#6b7280';
        
        // Use unified loader
        const result = window.ModelLoader.loadFromLibrary(selectedModel);
        
        if (result.success) {
            modelStatus.textContent = result.message;
            modelStatus.style.color = '#10b981';
            console.log(`âœ“ Model loaded: ${selectedModel}`);
        } else {
            modelStatus.textContent = result.message;
            modelStatus.style.color = '#ef4444';
            console.error(`âŒ Failed to load model: ${selectedModel}`, result.message);
        }
    });
    
    // Lead Time Display Selector Event Handler
    if (leadTimeDisplaySelect) {
        leadTimeDisplaySelect.addEventListener('change', function() {
            const newMode = leadTimeDisplaySelect.value;
            console.log(`ðŸ”„ Lead time display mode changed: ${window.leadTimeDisplayMode} â†’ ${newMode}`);
            
            window.leadTimeDisplayMode = newMode;
            
            // Re-render network if one is loaded
            if (window.currentNetwork && window.NetworkRenderer && window.NetworkRenderer.render) {
                console.log('ðŸ”„ Re-rendering network with new lead time display mode...');
                window.NetworkRenderer.render(window.currentNetwork);
                console.log('âœ“ Network updated with new lead time display');
            }
        });
        console.log('âœ“ Lead Time Display Selector: Event handler registered');
    } else {
        console.warn('âš ï¸ Lead time display selector not found');
    }
    
    console.log('âœ“ Model Selector: Event handlers registered');
})();