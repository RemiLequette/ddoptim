# Weber Pignons Network Example

## Overview

This directory contains the complete Weber Pignons bicycle assembly network based on the case study.

## Files

- **`create_weber_pignons.py`** - Script to build the network from scratch
- **`../load_weber_pignons.py`** - Script to load and display the network
- **`../build_network.bat`** - Windows batch file to run the builder

## Network Structure

### Finished Product (1 node)
- **Vélo SUPERVELO** - Custom assembled bicycle (5-day lead time)

### Semi-Finished Products (4 nodes)
- **Roue** - Wheel assembly (bottleneck, 2 per bike)
- **E-Cadre** - Frame assembly
- **E-Guidon** - Handlebar assembly  
- **E-Selle** - Saddle assembly (weekly batching)

### Machined Parts (7 nodes)
- **Plateau** - Chainring (spare parts +5%)
- **Pignon** - Sprocket (spare parts +5%)
- **Chaîne** - Chain (spare parts +5%)
- **MPA, MPB** - Intermediate machined assemblies

### Purchased Local (10 nodes)
- **Cadre** - Frame (7-day lead time)
- **Pédalier** - Pedal assembly
- **Guidon** - Handlebar
- **Poignée** - Grips
- **Frein** - Brakes
- **Selle** - Saddle
- **Tige** - Seatpost
- **Acier VMI** - Steel (raw material)
- **Douille** - Bushing
- **Axe, Rouleau** - Axle, Bearing

### Purchased International (5 nodes)
- **Rayons** - Spokes (72 per wheel, high MOQ, monthly batching)
- **Pneu** - Tires (30-day lead time)
- **Jante** - Rims (10-day lead time)
- **Valve** - Valves
- **Réflecteur** - Reflectors

## How to Build the Network

### Option 1: Windows Batch File
```cmd
build_network.bat
```

### Option 2: Python Direct
```cmd
python examples\create_weber_pignons.py
```

### Option 3: From Python Code
```python
from examples.create_weber_pignons import create_weber_pignons_network

network = create_weber_pignons_network()
print(f"Created network with {len(network)} nodes")
```

## How to Load the Network

After building, load it with:

```cmd
python load_weber_pignons.py
```

Or in Python:

```python
from core import Network
import json

with open('data/weber_pignons_network.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

network = Network.from_dict(data)
```

## Key Features

### Buffer Profiles Used
- **F** (Fabriqués): Finished bikes - Low variability
- **I** (Intermédiaires): Semi-finished - Low variability
- **U** (Usinés): Machined parts - Medium variability
- **AL** (Achetés Local): Local suppliers - Medium variability  
- **AI** (Achetés International): International suppliers - High variability

### Notable Characteristics
1. **Wheel assembly** is the bottleneck (complex, 2 per bike, skilled labor)
2. **International components** have high MOQ and monthly batching cycles
3. **Machined parts** have +5% demand for spare parts
4. **Saddles** are produced in weekly batches
5. **Customer tolerance** is 5 days for custom bikes, 2 days for standard

### Demand Patterns
- **Base ADU**: 40 bikes/day (~1000/month)
- **Seasonal**: 85% in winter, 130% in summer
- **Visibility**: 1 week normal, 1 month for promotions (Christmas, Father's Day)
- **Spike detection**: 5-day horizon, 200% threshold

## Data Sources

Based on:
- Case study presentation (pages 3, 5, 8)
- BOM diagrams (page 5)  
- Lead time analysis (page 5)
- Buffer positioning recommendations (pages 8-9)
- Calculation spreadsheet

## Next Steps

After creating the network:

1. **Propagate ADU** through BOM structure
2. **Calculate DLT** from buffers to customers
3. **Apply buffer positioning** recommendations
4. **Size buffers** using DDMRP formulas
5. **Compare scenarios** (SUPERVELO only vs. new brands)

## Validation

The network includes:
- ✅ All node types from case study
- ✅ Lead times from diagrams
- ✅ MOQ constraints (wheels, international parts)
- ✅ Order cycles (international monthly batching, saddle weekly)
- ✅ Customer tolerance time (5 days)
- ✅ Base ADU (40 bikes/day)
- ✅ Complete BOM structure
- ✅ Spare parts adjustments for machined parts
- ✅ All 5 buffer profiles assigned

## Troubleshooting

**If build fails:**
1. Make sure you're in the `ddoptim` project directory
2. Check Python is installed: `python --version`
3. Check NetworkX is installed: `python -c "import networkx"`
4. Run verification: `python verify.py`

**If validation errors appear:**
Check that all referenced profiles exist and all BOM relationships are valid (no cycles).
