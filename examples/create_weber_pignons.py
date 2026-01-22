"""
Weber Pignons Network Builder

Builds the complete Weber Pignons bicycle assembly network based on the case study.
Reference: Soutenance DDP (pages 3, 5, 8)

Network structure:
- Finished product: Vélo SUPERVELO
- Semi-finished: Roue, E-Cadre, E-Guidon, E-Selle
- Machined parts: Plateau, Pignon, Chaine (with assemblies MPA, MPB)
- Purchased local: Cadre, Pédalier, Guidon, Poignée, Frein, Selle, Tige
- Purchased international: Rayons, Pneu, Jante, Valve, Réflecteur

Based on the presentation diagrams showing lead times and BOM structure.
"""

import sys
import os
import json

# Add project to path
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_dir)

from core import Network, NetworkNode, NodeType, get_default_profiles


def create_weber_pignons_network() -> Network:
    """
    Create the complete Weber Pignons network.
    
    Returns:
        Network object with all nodes and BOM relationships
    """
    network = Network()
    
    # Add profiles
    print("Adding buffer profiles...")
    for profile in get_default_profiles().values():
        network.add_profile(profile)
    
    # ========== Finished Product ==========
    print("Adding finished product...")
    
    bike = NetworkNode(
        node_id="BIKE_SUPERVELO",
        name="Vélo SUPERVELO",
        node_type=NodeType.FINISHED_PRODUCT,
        lead_time=5,  # Assembly time
        buffer_profile_name="F",
        unit_cost=500.0,  # Estimated
        customer_tolerance_time=5,  # 5 days for custom, 2 days for standard
        adu=40.0,  # Base: ~1000 bikes/month ≈ 40/day (excluding summer)
        sales_order_visibility_horizon=7,  # 1 week normal, 30 days for promotions
        metadata={
            "description": "Custom assembled bikes for SUPERVELO brand",
            "production_type": "FTO (Finish To Order)",
            "seasonal_adjustment": "85% winter, 130% summer"
        }
    )
    network.add_node(bike)
    
    # ========== Semi-Finished Products (Intermediates) ==========
    print("Adding semi-finished products...")
    
    # Roue (Wheel) - 2 per bike
    roue = NetworkNode(
        node_id="ROUE",
        name="Roue (Wheel)",
        node_type=NodeType.INTERMEDIATE,
        lead_time=4,  # Assembly time for wheel
        buffer_profile_name="I",
        moq=200,  # MOQ from presentation
        unit_cost=50.0,  # Estimated
        metadata={
            "description": "Wheel assembly - bottleneck operation",
            "note": "Complex assembly, 2 per bike, skilled labor required"
        }
    )
    network.add_node(roue)
    
    # E-Cadre (Frame assembly)
    e_cadre = NetworkNode(
        node_id="E_CADRE",
        name="E-Cadre (Frame Assembly)",
        node_type=NodeType.INTERMEDIATE,
        lead_time=4,  # Assembly time
        buffer_profile_name="I",
        unit_cost=80.0,  # Estimated
        metadata={
            "description": "Frame with mounted components"
        }
    )
    network.add_node(e_cadre)
    
    # E-Guidon (Handlebar assembly)
    e_guidon = NetworkNode(
        node_id="E_GUIDON",
        name="E-Guidon (Handlebar Assembly)",
        node_type=NodeType.INTERMEDIATE,
        lead_time=3,  # Assembly time
        buffer_profile_name="I",
        unit_cost=25.0,  # Estimated
        metadata={
            "description": "Handlebar with grips and brakes"
        }
    )
    network.add_node(e_guidon)
    
    # E-Selle (Saddle assembly)
    e_selle = NetworkNode(
        node_id="E_SELLE",
        name="E-Selle (Saddle Assembly)",
        node_type=NodeType.INTERMEDIATE,
        lead_time=2,  # Assembly time
        buffer_profile_name="I",
        order_cycle=7,  # Once per week batch from presentation
        unit_cost=20.0,  # Estimated
        metadata={
            "description": "Saddle with post",
            "note": "Produced once per week in batches"
        }
    )
    network.add_node(e_selle)
    
    # ========== Machined Parts ==========
    print("Adding machined parts...")
    
    # Plateau (Chainring)
    plateau = NetworkNode(
        node_id="PLATEAU",
        name="Plateau (Chainring)",
        node_type=NodeType.MACHINED,
        lead_time=8,  # Machining time (8-15 days range)
        buffer_profile_name="U",
        moq=300,  # Machining MOQ
        unit_cost=15.0,  # Estimated
        metadata={
            "description": "Machined chainring",
            "spare_parts": True,
            "spare_parts_adjustment": 1.05  # +5% for spare parts demand
        }
    )
    network.add_node(plateau)
    
    # Pignon (Sprocket/Cog)
    pignon = NetworkNode(
        node_id="PIGNON",
        name="Pignon (Sprocket)",
        node_type=NodeType.MACHINED,
        lead_time=8,  # Machining time
        buffer_profile_name="U",
        moq=300,  # Machining MOQ
        unit_cost=12.0,  # Estimated
        metadata={
            "description": "Machined sprocket",
            "spare_parts": True,
            "spare_parts_adjustment": 1.05
        }
    )
    network.add_node(pignon)
    
    # Chaine (Chain)
    chaine = NetworkNode(
        node_id="CHAINE",
        name="Chaîne (Chain)",
        node_type=NodeType.MACHINED,
        lead_time=5,  # Machining/assembly time
        buffer_profile_name="U",
        unit_cost=10.0,  # Estimated
        metadata={
            "description": "Chain assembly",
            "spare_parts": True,
            "spare_parts_adjustment": 1.05
        }
    )
    network.add_node(chaine)
    
    # Machined part assemblies (from diagram - page 5)
    # MPA (MP A) - intermediate machined assembly
    mpa = NetworkNode(
        node_id="MPA",
        name="MP A (Machined Parts Assembly A)",
        node_type=NodeType.MACHINED,
        lead_time=15,  # From raw material through machining
        buffer_profile_name="U",
        unit_cost=5.0,  # Estimated
        metadata={
            "description": "Intermediate machined assembly"
        }
    )
    network.add_node(mpa)
    
    # MPB (MP B) - intermediate machined assembly
    mpb = NetworkNode(
        node_id="MPB",
        name="MP B (Machined Parts Assembly B)",
        node_type=NodeType.MACHINED,
        lead_time=15,  # From raw material through machining
        buffer_profile_name="U",
        unit_cost=5.0,  # Estimated
        metadata={
            "description": "Intermediate machined assembly"
        }
    )
    network.add_node(mpb)
    
    # ========== Purchased Local ==========
    print("Adding purchased local components...")
    
    # Cadre (Frame)
    cadre = NetworkNode(
        node_id="CADRE",
        name="Cadre (Frame)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=7,  # 2-7 days range, using 7 for conservative estimate
        buffer_profile_name="AL",
        unit_cost=70.0,  # Estimated
        metadata={
            "description": "Bicycle frame from local supplier",
            "note": "Long lead time local supplier - leverage point for DLT reduction"
        }
    )
    network.add_node(cadre)
    
    # Pédalier (Pedal assembly)
    pedalier = NetworkNode(
        node_id="PEDALIER",
        name="Pédalier (Pedal Assembly)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=15,  # From diagram
        buffer_profile_name="AL",
        unit_cost=20.0,  # Estimated
        metadata={
            "description": "Pedal assembly from local supplier"
        }
    )
    network.add_node(pedalier)
    
    # Guidon (Handlebar)
    guidon = NetworkNode(
        node_id="GUIDON",
        name="Guidon (Handlebar)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=5,  # Estimated
        buffer_profile_name="AL",
        unit_cost=15.0,  # Estimated
        metadata={
            "description": "Handlebar from local supplier"
        }
    )
    network.add_node(guidon)
    
    # Poignée (Grips)
    poignee = NetworkNode(
        node_id="POIGNEE",
        name="Poignée (Grips)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=8,  # From diagram
        buffer_profile_name="AL",
        unit_cost=5.0,  # Estimated
        metadata={
            "description": "Handlebar grips"
        }
    )
    network.add_node(poignee)
    
    # Frein (Brakes)
    frein = NetworkNode(
        node_id="FREIN",
        name="Frein (Brakes)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=2,  # Estimated
        buffer_profile_name="AL",
        unit_cost=18.0,  # Estimated
        metadata={
            "description": "Brake system"
        }
    )
    network.add_node(frein)
    
    # Selle (Saddle)
    selle = NetworkNode(
        node_id="SELLE",
        name="Selle (Saddle)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=2,  # Estimated
        buffer_profile_name="AL",
        unit_cost=15.0,  # Estimated
        metadata={
            "description": "Bicycle saddle"
        }
    )
    network.add_node(selle)
    
    # Tige (Seatpost)
    tige = NetworkNode(
        node_id="TIGE",
        name="Tige (Seatpost)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=2,  # Estimated
        buffer_profile_name="AL",
        unit_cost=8.0,  # Estimated
        metadata={
            "description": "Saddle post"
        }
    )
    network.add_node(tige)
    
    # ========== Purchased International ==========
    print("Adding purchased international components...")
    
    # Rayons (Spokes) - 72 per wheel
    rayons = NetworkNode(
        node_id="RAYONS",
        name="Rayons (Spokes)",
        node_type=NodeType.PURCHASED_INTERNATIONAL,
        lead_time=15,  # 10-15 days range
        buffer_profile_name="AI",
        moq=5000,  # High MOQ for international
        order_cycle=30,  # Monthly shipment batching
        unit_cost=0.5,  # Estimated per spoke
        metadata={
            "description": "Spokes from Asia",
            "note": "High variability - maritime transport delays, quality issues"
        }
    )
    network.add_node(rayons)
    
    # Pneu (Tire) - 1 per wheel
    pneu = NetworkNode(
        node_id="PNEU",
        name="Pneu (Tire)",
        node_type=NodeType.PURCHASED_INTERNATIONAL,
        lead_time=30,  # From diagram
        buffer_profile_name="AI",
        order_cycle=30,  # Monthly shipment batching
        unit_cost=8.0,  # Estimated
        metadata={
            "description": "Tires from Asia"
        }
    )
    network.add_node(pneu)
    
    # Jante (Rim) - 1 per wheel
    jante = NetworkNode(
        node_id="JANTE",
        name="Jante (Rim)",
        node_type=NodeType.PURCHASED_INTERNATIONAL,
        lead_time=10,  # From diagram
        buffer_profile_name="AI",
        order_cycle=30,  # Monthly shipment batching
        unit_cost=12.0,  # Estimated
        metadata={
            "description": "Wheel rims from Asia"
        }
    )
    network.add_node(jante)
    
    # Valve (Valve) - per wheel
    valve = NetworkNode(
        node_id="VALVE",
        name="Valve",
        node_type=NodeType.PURCHASED_INTERNATIONAL,
        lead_time=5,  # From diagram
        buffer_profile_name="AI",
        unit_cost=1.0,  # Estimated
        metadata={
            "description": "Tire valve"
        }
    )
    network.add_node(valve)
    
    # Réflecteur (Reflector) - per wheel
    reflecteur = NetworkNode(
        node_id="REFLECTEUR",
        name="Réflecteur (Reflector)",
        node_type=NodeType.PURCHASED_INTERNATIONAL,
        lead_time=5,  # From diagram
        buffer_profile_name="AI",
        unit_cost=1.5,  # Estimated
        metadata={
            "description": "Wheel reflector"
        }
    )
    network.add_node(reflecteur)
    
    # ========== Raw Materials ==========
    print("Adding raw materials...")
    
    # Acier VMI (Steel - Vendor Managed Inventory)
    acier = NetworkNode(
        node_id="ACIER_VMI",
        name="Acier VMI (Steel)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=12,  # From diagram - Plaque int/ext
        buffer_profile_name="AL",
        unit_cost=3.0,  # Estimated per unit
        metadata={
            "description": "Steel for machining - Vendor Managed Inventory"
        }
    )
    network.add_node(acier)
    
    # Raw materials for machining
    douille = NetworkNode(
        node_id="DOUILLE",
        name="Douille (Bushing)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=8,  # From diagram
        buffer_profile_name="AL",
        unit_cost=2.0,  # Estimated
        metadata={
            "description": "Bushing for machined parts"
        }
    )
    network.add_node(douille)
    
    axe = NetworkNode(
        node_id="AXE",
        name="Axe (Axle)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=10,  # From diagram
        buffer_profile_name="AL",
        unit_cost=4.0,  # Estimated
        metadata={
            "description": "Axle for wheel assembly"
        }
    )
    network.add_node(axe)
    
    rouleau = NetworkNode(
        node_id="ROULEAU",
        name="Rouleau (Bearing)",
        node_type=NodeType.PURCHASED_LOCAL,
        lead_time=12,  # From diagram
        buffer_profile_name="AL",
        unit_cost=3.5,  # Estimated
        metadata={
            "description": "Bearing for wheel assembly"
        }
    )
    network.add_node(rouleau)
    
    # ========== BOM Relationships ==========
    print("Adding BOM relationships...")
    
    # Bike assembly
    network.add_bom_relationship("BIKE_SUPERVELO", "ROUE", 2)  # 2 wheels per bike
    network.add_bom_relationship("BIKE_SUPERVELO", "E_CADRE", 1)
    network.add_bom_relationship("BIKE_SUPERVELO", "E_GUIDON", 1)
    network.add_bom_relationship("BIKE_SUPERVELO", "E_SELLE", 1)
    
    # Wheel assembly (Roue)
    network.add_bom_relationship("ROUE", "RAYONS", 72)  # 72 spokes per wheel
    network.add_bom_relationship("ROUE", "PNEU", 1)
    network.add_bom_relationship("ROUE", "JANTE", 1)
    network.add_bom_relationship("ROUE", "VALVE", 1)
    network.add_bom_relationship("ROUE", "REFLECTEUR", 2)  # 2 reflectors per wheel
    
    # Frame assembly (E-Cadre)
    network.add_bom_relationship("E_CADRE", "CADRE", 1)
    network.add_bom_relationship("E_CADRE", "PEDALIER", 2)  # From diagram
    network.add_bom_relationship("E_CADRE", "PLATEAU", 3)  # From diagram
    network.add_bom_relationship("E_CADRE", "PIGNON", 5)  # From diagram
    network.add_bom_relationship("E_CADRE", "CHAINE", 1)
    
    # Handlebar assembly (E-Guidon)
    network.add_bom_relationship("E_GUIDON", "GUIDON", 1)
    network.add_bom_relationship("E_GUIDON", "POIGNEE", 2)  # 2 grips
    network.add_bom_relationship("E_GUIDON", "FREIN", 2)  # 2 brakes
    
    # Saddle assembly (E-Selle)
    network.add_bom_relationship("E_SELLE", "SELLE", 1)
    network.add_bom_relationship("E_SELLE", "TIGE", 1)
    
    # Machined parts from raw materials (from diagram page 5)
    network.add_bom_relationship("PLATEAU", "MPA", 3)  # From diagram
    network.add_bom_relationship("PIGNON", "MPB", 5)  # From diagram
    
    # MPA from raw materials
    network.add_bom_relationship("MPA", "ACIER_VMI", 3)  # From diagram (Plaque int/ext)
    
    # MPB from raw materials
    network.add_bom_relationship("MPB", "DOUILLE", 80)  # From diagram
    network.add_bom_relationship("MPB", "AXE", 80)  # From diagram
    network.add_bom_relationship("MPB", "ROULEAU", 80)  # From diagram
    
    print(f"\n✓ Network created with {len(network)} nodes")
    return network


def main():
    """Create and save Weber Pignons network."""
    print("=" * 60)
    print("Weber Pignons Network Builder")
    print("=" * 60 + "\n")
    
    # Create network
    network = create_weber_pignons_network()
    
    # Validate
    print("\nValidating network...")
    is_valid, errors = network.validate()
    if is_valid:
        print("✓ Network validation passed")
    else:
        print("✗ Validation errors:")
        for error in errors:
            print(f"  - {error}")
        return 1
    
    # Display summary
    print(f"\nNetwork Summary:")
    print(f"  Total nodes: {len(network)}")
    print(f"  Finished products: {len(network.get_finished_products())}")
    print(f"  Profiles: {len(network.profiles)}")
    
    # Count by type
    type_counts = {}
    for node in network.get_all_nodes():
        node_type = node.node_type.value
        type_counts[node_type] = type_counts.get(node_type, 0) + 1
    
    print(f"\nNodes by type:")
    for node_type, count in sorted(type_counts.items()):
        print(f"  {node_type}: {count}")
    
    # Save to JSON
    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'weber_pignons_network.json'
    )
    
    print(f"\nSaving to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(network.to_dict(), f, indent=2, ensure_ascii=False)
    
    print("✓ Network saved successfully")
    
    print("\n" + "=" * 60)
    print("✓ Weber Pignons network created successfully!")
    print("=" * 60)
    print(f"\nTo load this network:")
    print("  from core import Network")
    print("  import json")
    print(f"  with open('{output_path}', 'r', encoding='utf-8') as f:")
    print("      data = json.load(f)")
    print("  network = Network.from_dict(data)")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
