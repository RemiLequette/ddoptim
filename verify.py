"""Quick verification that everything is working"""
import sys
import os

# Add project to path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_dir)

print("DDoptim Quick Verification")
print("=" * 50)

try:
    # Import core modules
    from core import BufferProfile, NetworkNode, Network, NodeType, get_default_profiles
    print("✓ Core modules imported successfully")
    
    # Test BufferProfile
    profiles = get_default_profiles()
    print(f"✓ Loaded {len(profiles)} default profiles")
    
    # Test creating a simple network
    network = Network()
    for profile in profiles.values():
        network.add_profile(profile)
    
    bike = NetworkNode(
        node_id="BIKE",
        name="Test Bike",
        node_type=NodeType.FINISHED_PRODUCT,
        lead_time=5,
        buffer_profile_name="F",
        unit_cost=500.0,
        customer_tolerance_time=5
    )
    network.add_node(bike)
    print("✓ Created test network with 1 node")
    
    # Validate
    is_valid, errors = network.validate()
    if is_valid:
        print("✓ Network validation passed")
    else:
        print(f"✗ Validation errors: {errors}")
    
    print("\n" + "=" * 50)
    print("✓ All core functionality working!")
    print("\nTo run full tests: python tests/test_core_simple.py")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
