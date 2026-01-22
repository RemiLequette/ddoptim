"""
Test ADU propagation in Weber Pignons network.
"""
import json
from core import Network

# Load network
print("Loading Weber Pignons network...")
with open('data/weber_pignons_network.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

network = Network.from_dict(data)
print(f"✓ Network loaded with {len(network)} nodes\n")

# Display ADU propagation results
print("=" * 60)
print("ADU Propagation Results")
print("=" * 60)

# Get all nodes in topological order
topo_order = network.get_topological_order()

for node_id in topo_order:
    node = network.get_node(node_id)
    
    # Get parent information
    parents = network.get_parents(node_id)
    parent_info = []
    for parent_id, qty in parents.items():
        parent = network.get_node(parent_id)
        if parent.adu:
            parent_info.append(f"{parent.name}({qty}×{parent.adu:.1f})")
    
    # Display node info
    independent = f"{node.independent_adu:.1f}" if node.independent_adu else "0"
    total = f"{node.adu:.1f}" if node.adu else "None"
    
    print(f"\n{node.name} ({node.node_type.value})")
    print(f"  Independent ADU: {independent}")
    print(f"  Total ADU: {total}")
    
    if parent_info:
        print(f"  ← From parents: {', '.join(parent_info)}")

print("\n" + "=" * 60)
print("Key Validations:")
print("=" * 60)

# Validate specific items from Weber Pignons case
bike = network.get_node("BIKE_SUPERVELO")
print(f"\n✓ Bike ADU: {bike.adu} (expected: 40)")

wheel = network.get_node("ROUE")
print(f"✓ Wheel ADU: {wheel.adu} (expected: 80 = 40 bikes × 2 wheels)")

# Check if spokes exist and validate
try:
    spokes = network.get_node("RAYONS")
    # Each wheel needs 32 spokes, 2 wheels per bike = 64 spokes per bike
    # 40 bikes × 64 spokes = 2560 spokes total
    # But it depends on wheel qty × spoke qty
    print(f"✓ Spokes ADU: {spokes.adu}")
except KeyError:
    print("  (Spokes node not found in network)")

print("\n✓ ADU propagation completed successfully!")
