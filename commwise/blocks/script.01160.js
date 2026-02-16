// JSON Import Module
// Import network configuration from JSON file

window.JSONImport = {
    /**
     * Trigger file picker and import network from JSON file
     */
    importFromFile: function() {
        console.log('ðŸ“¥ JSON Import: Opening file picker...');
        
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) {
                console.log('No file selected');
                return;
            }
            
            console.log('ðŸ“¥ JSON Import: Reading file...', file.name);
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    console.log('âœ“ JSON parsed successfully');
                    
                    // Use unified loader
                    if (!window.ModelLoader || !window.ModelLoader.loadModel) {
                        alert('Error: ModelLoader not available');
                        console.error('âŒ ModelLoader not found');
                        return;
                    }
                    
                    const result = window.ModelLoader.loadModel(jsonData, 'JSON Import');
                    
                    if (result.success) {
                        alert(`Import successful!\n${result.message}`);
                        console.log('âœ“ Import complete:', result.message);
                    } else {
                        alert(`Import failed:\n${result.message}`);
                        console.error('âŒ Import failed:', result.message);
                    }
                    
                } catch (error) {
                    alert(`Error parsing JSON file:\n${error.message}`);
                    console.error('âŒ JSON parse error:', error);
                }
            };
            
            reader.onerror = function() {
                alert('Error reading file');
                console.error('âŒ File read error');
            };
            
            reader.readAsText(file);
        };
        
        // Trigger file picker
        fileInput.click();
    }
};

console.log('âœ“ JSON Import: Module initialized');
