# DDoptim - DDMRP Buffer Positioning Optimizer

A research and prototyping tool for automated buffer positioning in supply chains using DDMRP (Demand Driven Material Requirements Planning) methodology.

## Project Status

**Phase 2: Core Implementation** - ✅ Data structures complete

## What's Been Built

### Core Data Structures (Phase 2 - Complete)

Three foundational classes that represent the supply chain network:

1. **BufferProfile** (`core/buffer_profile.py`)
   - Defines buffer sizing parameters (DLT thresholds, lead time factors, variability)
   - Includes Weber Pignons default profiles (F, I, U, AL, AI)
   - Fully configurable for custom profiles
   - Serializable to/from JSON

2. **NetworkNode** (`core/network_node.py`)
   - Represents items/operations in the supply chain
   - Node types: finished products, intermediates, machined, purchased (local/international)
   - Attributes: lead times, costs, MOQ/cycle constraints, customer tolerances
   - Buffer status management: no_buffer, user_fixed, user_forbidden, algorithm_recommended
   - Serializable to/from JSON

3. **Network** (`core/network.py`)
   - Complete supply chain represented as a directed acyclic graph (DAG)
   - Built on NetworkX for graph operations
   - BOM relationship management with automatic cycle detection
   - Topological ordering for dependency-based calculations
   - Network validation (completeness checks, DAG verification)
   - Serializable to/from JSON

### Features

✅ **Configurable buffer profiles** - Define custom sizing parameters or use Weber Pignons defaults  
✅ **Multi-level BOM support** - Complex assembly structures with convergence/divergence  
✅ **Cycle detection** - Prevents invalid circular dependencies  
✅ **Buffer status tracking** - User-fixed, forbidden, or algorithm-recommended positions  
✅ **Full serialization** - Save/load networks from JSON  
✅ **Comprehensive validation** - Ensures data completeness before optimization  
✅ **Graph analysis utilities** - Topological sort, upstream/downstream queries, path finding

## Quick Start

### Installation

```bash
cd /home/claude/ddoptim
# No external dependencies yet - just Python 3.7+
```

### Basic Usage

```python
from core import Network, NetworkNode, NodeType, get_default_profiles

# Create network
network = Network()

# Add profiles
for profile in get_default_profiles().values():
    network.add_profile(profile)

# Add finished product
bike = NetworkNode(
    node_id="BIKE_001",
    name="Vélo SUPERVELO",
    node_type=NodeType.FINISHED_PRODUCT,
    lead_time=5,
    buffer_profile_name="F",
    unit_cost=500.0,
    customer_tolerance_time=5,
    adu=40.0
)
network.add_node(bike)

# Add component
wheel = NetworkNode(
    node_id="WHEEL_001",
    name="Roue",
    node_type=NodeType.INTERMEDIATE,
    lead_time=4,
    buffer_profile_name="I",
    unit_cost=50.0
)
network.add_node(wheel)

# Add BOM relationship (bike needs 2 wheels)
network.add_bom_relationship("BIKE_001", "WHEEL_001", quantity=2)

# Validate network
is_valid, errors = network.validate()
if is_valid:
    print("Network is valid!")

# Save to JSON
import json
with open('my_network.json', 'w') as f:
    json.dump(network.to_dict(), f, indent=2)
```

### Running Tests

```bash
python tests/test_core_simple.py
```

Expected output:
```
============================================================
DDoptim Core Data Structure Tests
============================================================

Testing BufferProfile...
  ✓ Profile creation works
  ✓ Lead time factor selection works
  ✓ Serialization works
✓ BufferProfile tests passed!

[... more tests ...]

✓ ALL TESTS PASSED!
```

## Project Structure

```
ddoptim/
├── core/                      # Core data structures
│   ├── __init__.py
│   ├── buffer_profile.py     # Buffer sizing profiles
│   ├── network_node.py       # Supply chain items/operations
│   └── network.py            # Complete network graph
├── tests/                     # Tests
│   ├── test_core_basic.py    # Pytest tests (requires pytest)
│   └── test_core_simple.py   # Standalone tests
├── data/                      # Test data (future)
├── examples/                  # Usage examples (future)
└── visualization/             # Network visualization (future)
```

## Design Decisions

### Why NetworkX?
- Mature graph library with excellent algorithms
- DAG validation built-in
- Topological sorting for dependency-based calculations
- Path finding for DLT calculations
- Easy visualization integration

### Why Dataclasses?
- Clean, readable data definitions
- Automatic `__init__`, `__repr__`, `__eq__`
- Type hints for better IDE support
- Validation in `__post_init__`

### Buffer Status Design
Three independent states:
- **User-fixed**: User mandates this buffer (must include in solution)
- **User-forbidden**: User forbids buffer here (exclude from consideration)
- **Algorithm-recommended**: Algorithm suggests this buffer
- **No buffer**: Not buffered

This allows partial optimization: user fixes strategic buffers, algorithm optimizes the rest.

## Next Steps

### Phase 2: Core Implementation (Continued)
- [ ] ADU propagation through BOM (`adu_propagator.py`)
- [ ] DLT calculation from buffers to customers (`dlt_calculator.py`)
- [ ] Buffer sizing calculations (`buffer_sizing.py`)
- [ ] Scenario management system (`scenario.py`)

### Phase 3: Optimization Algorithm
- [ ] Three-tier prioritization framework
- [ ] Tier 1: Customer tolerance constraint satisfaction
- [ ] Tier 2: Mandatory buffers + inventory optimization
- [ ] Tier 3: Market opportunity scenario analysis
- [ ] Performance metrics calculation (`evaluator.py`)

### Phase 4: Visualization & Analysis
- [ ] Network diagrams with buffer highlights
- [ ] Scenario comparison dashboards
- [ ] Trade-off analysis charts
- [ ] Report generation

### Phase 5: Testing & Refinement
- [ ] Weber Pignons case study validation
- [ ] Scenario comparison testing
- [ ] Sensitivity analysis
- [ ] Algorithm vs. expert comparison

## Reference Documentation

- **Requirements**: `/mnt/project/DDoptim_requirements.md`
- **Case Study**: `/mnt/project/Soutenance_CPF_DDP_Rémi_LEQUETTE__20250205.pdf`
- **Calculations**: `/mnt/project/Soutenance_DDP_Rémi_LEQUETTE__20250205__Calculs.xlsx`

## License

Research/Academic Project - See requirements document for details.

## Contact

This is a research project for exploring DDMRP buffer positioning algorithms. For questions about methodology, see the DDMRP requirements document.
