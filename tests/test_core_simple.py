"""
Simple tests for core data structures (no pytest required).

Run with: python tests/test_core_simple.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import (
    BufferProfile, NetworkNode, Network,
    NodeType, BufferStatus,
    get_default_profiles
)


def test_buffer_profile():
    """Test BufferProfile class."""
    print("Testing BufferProfile...")
    
    # Test creating a valid profile
    profile = BufferProfile(
        name="TEST",
        description="Test profile",
        dlt_threshold_short=1,
        dlt_threshold_medium=5,
        dlt_threshold_long=10,
        lead_time_factor_short=0.7,
        lead_time_factor_medium=0.5,
        lead_time_factor_long=0.25,
        variability_factor=0.5
    )
    assert profile.name == "TEST"
    assert profile.variability_factor == 0.5
    print("  ✓ Profile creation works")
    
    # Test lead time factor selection
    profile_f = get_default_profiles()["F"]
    assert profile_f.get_lead_time_factor(1) == 0.7  # Short
    assert profile_f.get_lead_time_factor(2) == 0.5  # Medium
    assert profile_f.get_lead_time_factor(8) == 0.25  # Long
    print("  ✓ Lead time factor selection works")
    
    # Test serialization
    profile_dict = profile_f.to_dict()
    reconstructed = BufferProfile.from_dict(profile_dict)
    assert reconstructed.name == profile_f.name
    print("  ✓ Serialization works")
    
    print("✓ BufferProfile tests passed!\n")


def test_network_node():
    """Test NetworkNode class."""
    print("Testing NetworkNode...")
    
    # Test finished product
    bike = NetworkNode(
        node_id="BIKE_001",
        name="Vélo",
        node_type=NodeType.FINISHED_PRODUCT,
        lead_time=5,
        buffer_profile_name="F",
        unit_cost=500.0,
        customer_tolerance_time=5,
        adu=40.0
    )
    assert bike.is_finished_product()
    assert bike.customer_tolerance_time == 5
    print("  ✓ Finished product node creation works")
    
    # Test component
    spoke = NetworkNode(
        node_id="SPOKE_001",
        name="Rayons",
        node_type=NodeType.PURCHASED_INTERNATIONAL,
        lead_time=15,
        buffer_profile_name="AI",
        moq=5000,
        order_cycle=30,
        unit_cost=0.5
    )
    assert not spoke.is_finished_product()
    assert spoke.moq == 5000
    print("  ✓ Component node creation works")
    
    # Test buffer status
    node = NetworkNode(
        node_id="TEST",
        name="Test",
        node_type=NodeType.INTERMEDIATE,
        lead_time=3,
        buffer_profile_name="I",
        unit_cost=10.0
    )
    assert not node.is_buffered()
    node.set_user_fixed_buffer("Critical")
    assert node.is_buffered()
    print("  ✓ Buffer status management works")
    
    print("✓ NetworkNode tests passed!\n")


def test_network():
    """Test Network class."""
    print("Testing Network...")
    
    # Create network
    network = Network()
    assert len(network) == 0
    print("  ✓ Empty network creation works")
    
    # Add profiles
    for profile in get_default_profiles().values():
        network.add_profile(profile)
    assert len(network.profiles) == 5
    print("  ✓ Profile addition works")
    
    # Add nodes
    bike = NetworkNode(
        node_id="BIKE",
        name="Vélo",
        node_type=NodeType.FINISHED_PRODUCT,
        lead_time=5,
        buffer_profile_name="F",
        unit_cost=500.0,
        customer_tolerance_time=5
    )
    wheel = NetworkNode(
        node_id="WHEEL",
        name="Roue",
        node_type=NodeType.INTERMEDIATE,
        lead_time=4,
        buffer_profile_name="I",
        unit_cost=50.0
    )
    spoke = NetworkNode(
        node_id="SPOKE",
        name="Rayon",
        node_type=NodeType.PURCHASED_INTERNATIONAL,
        lead_time=15,
        buffer_profile_name="AI",
        unit_cost=0.5
    )
    
    network.add_node(bike)
    network.add_node(wheel)
    network.add_node(spoke)
    assert len(network) == 3
    print("  ✓ Node addition works")
    
    # Add BOM relationships
    network.add_bom_relationship("BIKE", "WHEEL", 2)
    network.add_bom_relationship("WHEEL", "SPOKE", 72)
    
    parents = network.get_parents("WHEEL")
    assert "BIKE" in parents
    assert parents["BIKE"] == 2
    
    children = network.get_children("BIKE")
    assert "WHEEL" in children
    assert children["WHEEL"] == 2
    print("  ✓ BOM relationships work")
    
    # Test topological order
    topo_order = network.get_topological_order()
    assert topo_order.index("BIKE") < topo_order.index("WHEEL")
    assert topo_order.index("WHEEL") < topo_order.index("SPOKE")
    print("  ✓ Topological ordering works")
    
    # Test serialization
    data = network.to_dict()
    reconstructed = Network.from_dict(data)
    assert len(reconstructed) == 3
    assert "BIKE" in reconstructed
    assert reconstructed.get_bom_quantity("BIKE", "WHEEL") == 2
    print("  ✓ Serialization works")
    
    # Test validation
    is_valid, errors = network.validate()
    assert is_valid
    print("  ✓ Validation works")
    
    print("✓ Network tests passed!\n")


def test_cycle_detection():
    """Test that cycles are prevented."""
    print("Testing cycle detection...")
    
    network = Network()
    for profile in get_default_profiles().values():
        network.add_profile(profile)
    
    # Add nodes
    for node_id in ["A", "B", "C"]:
        node = NetworkNode(
            node_id=node_id,
            name=node_id,
            node_type=NodeType.INTERMEDIATE,
            lead_time=3,
            buffer_profile_name="I",
            unit_cost=10.0
        )
        network.add_node(node)
    
    # Create chain: A -> B -> C
    network.add_bom_relationship("A", "B", 1)
    network.add_bom_relationship("B", "C", 1)
    
    # Try to create cycle: C -> A (should fail)
    try:
        network.add_bom_relationship("C", "A", 1)
        assert False, "Should have raised ValueError for cycle"
    except ValueError as e:
        assert "cycle" in str(e).lower()
    
    print("  ✓ Cycle detection works")
    print("✓ Cycle detection test passed!\n")


def main():
    """Run all tests."""
    print("=" * 60)
    print("DDoptim Core Data Structure Tests")
    print("=" * 60 + "\n")
    
    try:
        test_buffer_profile()
        test_network_node()
        test_network()
        test_cycle_detection()
        
        print("=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        return 0
    
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
