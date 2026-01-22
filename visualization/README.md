# Network Visualization Tool

## Overview

Interactive web-based visualization tool for DDoptim supply chain networks with tree/hierarchical layout similar to the case study presentation.

## Features

### ✅ Tree/Hierarchical Graph Layout
- Nodes arranged by BOM levels
- Finished products at the top
- Components flowing downward
- Clear parent-child relationships

### ✅ Color-Coded Nodes
- **Blue**: Finished Products
- **Green**: Intermediate/Semi-finished
- **Orange**: Machined Parts
- **Red**: Purchased Local
- **Purple**: Purchased International

### ✅ Buffer Status (Border Colors)
- **Gray**: No Buffer
- **Green**: User Fixed Buffer
- **Red**: User Forbidden
- **Blue**: Algorithm Recommended

### ✅ Interactive Features
- **Zoom**: Mouse wheel or zoom buttons
- **Pan**: Click and drag
- **Hover**: Shows node details
- **Click**: Selects node and shows detail panel

### ✅ Mini-Map Overview
- Shows complete network at bottom
- Helps navigate large networks
- Always visible for orientation

### ✅ Editable Side Panel
- Select any node to view details
- Edit properties:
  - Lead time
  - Unit cost
  - MOQ
  - Order cycle
  - Buffer status
  - Buffer rationale
- View BOM relationships (parents/children)

### ✅ Load/Save Functionality
- Load network from JSON file
- Save modifications back to file
- Default: `data/weber_pignons_network.json`

## Quick Start

### Option 1: Double-Click Launcher
```
view_network.bat
```
This will:
1. Install required packages (dash, plotly)
2. Start the web server
3. Open your browser automatically

### Option 2: Command Line
```cmd
# Install dependencies (first time only)
pip install dash plotly dash-bootstrap-components

# Run the viewer
python visualization\network_viewer.py
```

### Option 3: From Python
```python
from visualization.network_viewer import NetworkVisualizer

viewer = NetworkVisualizer()
viewer.run(debug=True, port=8050)
```

## Usage

### 1. Start the Server
Run `view_network.bat` or `python visualization\network_viewer.py`

You'll see:
```
============================================================
DDoptim Network Viewer
============================================================

Starting server on http://localhost:8050
Open this URL in your web browser.

Press Ctrl+C to stop the server.
============================================================
```

### 2. Open in Browser
Navigate to: **http://localhost:8050**

### 3. Load a Network
1. Click **"📂 Load Network"** button
2. Enter file path (default: `data/weber_pignons_network.json`)
3. Click **"Load"**

The network will be displayed with:
- Tree layout (finished products at top)
- Color-coded by node type
- Interactive zoom and pan
- Mini-map at bottom

### 4. Explore the Network
- **Zoom**: Mouse wheel or toolbar buttons
- **Pan**: Click and drag the graph
- **Hover**: See node details in tooltip
- **Click**: Select a node to see full details

### 5. View/Edit Node Details
Click any node to open the side panel showing:
- Node name and ID
- Type and buffer profile
- Lead time and costs
- MOQ and order cycle
- Buffer status and rationale
- ADU (if calculated)
- Customer tolerance (for finished products)
- BOM relationships (parents and children)

You can edit:
- Lead time
- Unit cost
- MOQ
- Order cycle
- Buffer status
- Buffer rationale

### 6. Save Changes
1. Click **"💾 Save Network"** button
2. Enter filename
3. Click **"Save"**

## Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│  DDoptim Network Viewer                [Load] [Save]    │
├───────────────────────────┬─────────────────────────────┤
│                           │                             │
│   Main Network Graph      │    Node Detail Panel        │
│   (zoom, pan, click)      │    - Name & ID              │
│                           │    - Type & Profile         │
│                           │    - Lead Time              │
│                           │    - Costs                  │
│                           │    - MOQ/Cycle              │
│                           │    - Buffer Status          │
│                           │    - BOM Relationships      │
│   [Mini-map overview]     │                             │
│                           │                             │
├───────────────────────────┴─────────────────────────────┤
│  Legend: Node Types & Buffer Status                     │
└─────────────────────────────────────────────────────────┘
```

## Controls

### Graph Controls (Toolbar)
- 🏠 **Home**: Reset zoom and pan
- 🔍 **Zoom In**: Zoom in on graph
- 🔎 **Zoom Out**: Zoom out
- ↔️ **Pan**: Pan mode (also click-drag)
- 📷 **Camera**: Save as PNG

### Keyboard Shortcuts
- **Mouse Wheel**: Zoom in/out
- **Click + Drag**: Pan the graph
- **Click Node**: Select and show details

## Tips

### For Large Networks
1. Use the **mini-map** at the bottom to see the full network
2. **Zoom in** to focus on specific areas
3. **Pan** to navigate between sections
4. The **legend** helps identify node types

### For Editing
1. **Select a node** by clicking it (border becomes highlighted)
2. **Edit fields** in the side panel
3. **Save** to persist changes to file
4. **Reload** to discard changes

### For Analysis
1. **Color coding** shows node types at a glance
2. **Border colors** indicate buffer status
3. **Node size** shows if buffered (larger = buffered)
4. **Hover tooltips** show key information quickly

## Troubleshooting

### Server won't start
- Check Python is installed: `python --version`
- Install dependencies: `pip install dash plotly dash-bootstrap-components`
- Check port 8050 is not in use

### Can't load network
- Check file path is correct (relative to project directory)
- Verify JSON file is valid
- Check network validates (no cycles, complete data)

### Graph is too small/large
- Use **zoom controls** in the toolbar
- **Adjust window size** - graph is responsive
- **Mini-map** shows the full network

### Node details not showing
- Make sure you're **clicking directly on a node** (colored circle)
- Check the browser console for errors (F12)

### Changes not saving
- Check you have **write permissions** for the target file
- Verify **file path** in save dialog
- Check the save status message

## Advanced Usage

### Custom Port
```python
from visualization.network_viewer import NetworkVisualizer

viewer = NetworkVisualizer()
viewer.run(debug=True, port=9000)  # Use port 9000 instead
```

### Load Network Programmatically
```python
viewer = NetworkVisualizer()

# Load network before starting
from core import Network
import json

with open('data/weber_pignons_network.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

viewer.network = Network.from_dict(data)
viewer.run()
```

### Customize Colors
Edit `NODE_TYPE_COLORS` in `network_viewer.py`:
```python
NODE_TYPE_COLORS = {
    NodeType.FINISHED_PRODUCT: '#YOUR_COLOR',
    # ... etc
}
```

## Requirements

- Python 3.7+
- dash >= 2.14.0
- plotly >= 5.17.0
- dash-bootstrap-components >= 1.5.0
- networkx >= 3.0

All dependencies are in `requirements.txt` and will be installed by `view_network.bat`.

## Browser Compatibility

Tested with:
- ✅ Google Chrome (recommended)
- ✅ Microsoft Edge
- ✅ Firefox
- ✅ Safari

## Performance

- Networks with **< 50 nodes**: Excellent performance
- Networks with **50-100 nodes**: Good performance
- Networks with **> 100 nodes**: May need layout optimization

The Weber Pignons network (27 nodes) renders instantly.

## Future Enhancements

Planned features:
- [ ] Export graph as PNG/SVG
- [ ] Search/filter nodes
- [ ] Show ADU propagation visually
- [ ] Show DLT calculations
- [ ] Highlight critical paths
- [ ] Buffer positioning visualization
- [ ] Scenario comparison view

## Support

For issues or questions:
1. Check this README
2. Check the main project README.md
3. Check the console output for errors
4. Verify your network file is valid

---

**Enjoy exploring your supply chain networks! 🚀**
