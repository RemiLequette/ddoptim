"""
Simple script to load and display Weber Pignons network.

Usage: python load_weber_pignons.py
"""

import sys
import os
import json

# Add project to path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_dir)

from core import Network

# Load network
data_path = os.path.join(project_dir, 'data', 'weber_pignons_network.json')
print(f"Loading network from: {data_path}")

with open(data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

network = Network.from_dict(data)

print(f"\n✓ Network loaded successfully!")
print(f"  Nodes: {len(network)}")
print(f"  Profiles: {len(network.profiles)}")

# Display some details
print(f"\nFinished products:")
for node in network.get_finished_products():
    print(f"  - {node.name} (ID: {node.node_id})")
    print(f"    Customer tolerance: {node.customer_tolerance_time} days")
    print(f"    ADU: {node.adu}")

print(f"\nSample BOM relationships:")
bike = network.get_node("BIKE_SUPERVELO")
children = network.get_children("BIKE_SUPERVELO")
for child_id, qty in children.items():
    child = network.get_node(child_id)
    print(f"  - {bike.name} needs {qty}x {child.name}")

print(f"\n✓ Network is ready to use!")
