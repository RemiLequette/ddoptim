"""
Supply Chain Network Structure

Manages the complete supply chain network as a directed acyclic graph (DAG)
with BOM relationships and buffer positioning.
"""

import networkx as nx
from typing import Dict, List, Optional, Set, Tuple
from .network_node import NetworkNode, NodeType, BufferStatus
from .buffer_profile import BufferProfile


class Network:
    """
    Supply chain network represented as a directed acyclic graph.
    
    The graph structure:
    - Nodes: Items/operations (NetworkNode objects)
    - Edges: BOM relationships (parent -> child with quantity attribute)
    - Direction: Raw materials -> Components -> Subassemblies -> Finished products
    
    Attributes:
        graph: NetworkX DiGraph containing the supply chain
        profiles: Dictionary of available buffer profiles
    
    Examples:
        >>> network = Network()
        >>> network.add_profile(profile_f)
        >>> network.add_node(bike_node)
        >>> network.add_node(wheel_node)
        >>> network.add_bom_relationship(bike_node.node_id, wheel_node.node_id, quantity=2)
    """
    
    def __init__(self):
        """Initialize an empty supply chain network."""
        self.graph = nx.DiGraph()
        self.profiles: Dict[str, BufferProfile] = {}
        self._auto_propagate = True  # Control automatic ADU propagation
    
    # ========== Profile Management ==========
    
    def add_profile(self, profile: BufferProfile):
        """
        Add a buffer profile to the network.
        
        Args:
            profile: BufferProfile to add
            
        Raises:
            ValueError: If profile name already exists
        """
        if profile.name in self.profiles:
            raise ValueError(f"Profile {profile.name} already exists")
        self.profiles[profile.name] = profile
    
    def get_profile(self, profile_name: str) -> BufferProfile:
        """
        Get a buffer profile by name.
        
        Args:
            profile_name: Name of the profile
            
        Returns:
            BufferProfile object
            
        Raises:
            KeyError: If profile doesn't exist
        """
        if profile_name not in self.profiles:
            raise KeyError(f"Profile {profile_name} not found. Available: {list(self.profiles.keys())}")
        return self.profiles[profile_name]
    
    # ========== Node Management ==========
    
    def add_node(self, node: NetworkNode):
        """
        Add a node to the network.
        
        Args:
            node: NetworkNode to add
            
        Raises:
            ValueError: If node_id already exists or profile doesn't exist
        """
        if node.node_id in self.graph:
            raise ValueError(f"Node {node.node_id} already exists")
        
        # Validate profile exists
        if node.buffer_profile_name not in self.profiles:
            raise ValueError(
                f"Profile {node.buffer_profile_name} not found for node {node.node_id}. "
                f"Available profiles: {list(self.profiles.keys())}"
            )
        
        self.graph.add_node(node.node_id, data=node)
    
    def get_node(self, node_id: str) -> NetworkNode:
        """
        Get a node by ID.
        
        Args:
            node_id: ID of the node
            
        Returns:
            NetworkNode object
            
        Raises:
            KeyError: If node doesn't exist
        """
        if node_id not in self.graph:
            raise KeyError(f"Node {node_id} not found")
        return self.graph.nodes[node_id]['data']
    
    def get_all_nodes(self) -> List[NetworkNode]:
        """Get all nodes in the network."""
        return [self.graph.nodes[node_id]['data'] for node_id in self.graph.nodes()]
    
    def get_finished_products(self) -> List[NetworkNode]:
        """Get all finished product nodes."""
        return [
            node for node in self.get_all_nodes()
            if node.node_type == NodeType.FINISHED_PRODUCT
        ]
    
    # ========== BOM Relationship Management ==========
    
    def add_bom_relationship(self, parent_id: str, child_id: str, quantity: float):
        """
        Add a BOM relationship (parent uses child).
        
        Args:
            parent_id: ID of parent item (assembled item)
            child_id: ID of child item (component)
            quantity: Quantity of child needed per parent
            
        Raises:
            ValueError: If nodes don't exist, quantity invalid, or cycle detected
        """
        # Validate nodes exist
        if parent_id not in self.graph:
            raise ValueError(f"Parent node {parent_id} not found")
        if child_id not in self.graph:
            raise ValueError(f"Child node {child_id} not found")
        
        # Validate quantity
        if quantity <= 0:
            raise ValueError(f"Quantity must be > 0, got {quantity}")
        
        # Add edge (parent -> child in our representation)
        # This represents "parent needs child"
        self.graph.add_edge(parent_id, child_id, quantity=quantity)
        
        # Validate no cycles (must be DAG)
        if not nx.is_directed_acyclic_graph(self.graph):
            # Remove the edge that caused the cycle
            self.graph.remove_edge(parent_id, child_id)
            raise ValueError(
                f"Adding edge {parent_id} -> {child_id} would create a cycle. "
                "Supply chain must be a directed acyclic graph (DAG)."
            )
        
        # Propagate ADU after BOM change (if auto-propagation enabled)
        if self._auto_propagate:
            self.propagate_adu()
        
        # Propagate ADU after BOM change
        self.propagate_adu()
    
    def get_bom_quantity(self, parent_id: str, child_id: str) -> float:
        """
        Get the quantity of child needed per parent.
        
        Args:
            parent_id: ID of parent item
            child_id: ID of child item
            
        Returns:
            Quantity per parent
            
        Raises:
            ValueError: If relationship doesn't exist
        """
        if not self.graph.has_edge(parent_id, child_id):
            raise ValueError(f"No BOM relationship between {parent_id} and {child_id}")
        return self.graph.edges[parent_id, child_id]['quantity']
    
    def get_parents(self, node_id: str) -> Dict[str, float]:
        """
        Get all parents of a node (items that use this node).
        
        Args:
            node_id: ID of the node
            
        Returns:
            Dictionary mapping parent_id -> quantity_per_parent
        """
        # In our representation, parents are predecessors
        parents = {}
        for parent_id in self.graph.predecessors(node_id):
            quantity = self.graph.edges[parent_id, node_id]['quantity']
            parents[parent_id] = quantity
        return parents
    
    def get_children(self, node_id: str) -> Dict[str, float]:
        """
        Get all children of a node (components this node uses).
        
        Args:
            node_id: ID of the node
            
        Returns:
            Dictionary mapping child_id -> quantity_needed
        """
        # In our representation, children are successors
        children = {}
        for child_id in self.graph.successors(node_id):
            quantity = self.graph.edges[node_id, child_id]['quantity']
            children[child_id] = quantity
        return children
    
    # ========== Network Analysis ==========
    
    def get_topological_order(self) -> List[str]:
        """
        Get nodes in topological order (parents before children).
        
        This is useful for processing nodes in dependency order, e.g.,
        propagating ADU from finished products to components.
        
        Returns:
            List of node_ids in topological order
            
        Raises:
            ValueError: If graph has cycles
        """
        if not nx.is_directed_acyclic_graph(self.graph):
            raise ValueError("Cannot compute topological order: graph has cycles")
        return list(nx.topological_sort(self.graph))
    
    def get_reverse_topological_order(self) -> List[str]:
        """
        Get nodes in reverse topological order (children before parents).
        
        This is useful for bottom-up calculations, e.g., calculating
        cumulative lead times from components to finished products.
        
        Returns:
            List of node_ids in reverse topological order
        """
        return list(reversed(self.get_topological_order()))
    
    def get_downstream_nodes(self, node_id: str) -> Set[str]:
        """
        Get all nodes downstream of a given node (all descendants).
        
        Args:
            node_id: ID of the node
            
        Returns:
            Set of downstream node_ids
        """
        return nx.descendants(self.graph, node_id)
    
    def get_upstream_nodes(self, node_id: str) -> Set[str]:
        """
        Get all nodes upstream of a given node (all ancestors).
        
        Args:
            node_id: ID of the node
            
        Returns:
            Set of upstream node_ids
        """
        return nx.ancestors(self.graph, node_id)
    
    def get_all_paths_to_finished_products(self, node_id: str) -> List[List[str]]:
        """
        Get all paths from a node to finished products.
        
        Args:
            node_id: ID of the starting node
            
        Returns:
            List of paths, where each path is a list of node_ids
        """
        finished_products = [n.node_id for n in self.get_finished_products()]
        all_paths = []
        
        for fp_id in finished_products:
            if nx.has_path(self.graph, fp_id, node_id):
                # Get all simple paths from finished product to this node
                # Note: In our representation, edge direction is parent->child
                paths = list(nx.all_simple_paths(self.graph, fp_id, node_id))
                all_paths.extend(paths)
        
        return all_paths
    
    def propagate_adu(self):
        """
        Propagate ADU (Average Daily Usage) through the BOM structure.
        
        Starting from finished products with independent_adu, calculates total ADU
        for all components using the formula:
        
            adu = independent_adu + sum(parent_adu * quantity_per_parent)
        
        This propagates demand through the supply chain, accounting for:
        - Independent customer demand (finished products)
        - Dependent demand from parent items (components)
        - BOM quantities (e.g., 2 wheels per bike)
        - Multi-product usage (shared components)
        
        The calculation proceeds in topological order (finished products first)
        to ensure parent ADU values are available when calculating child ADU.
        
        Modifies node.adu values in place.
        
        Raises:
            ValueError: If network has cycles (not a DAG)
        """
        # Get reverse topological order (finished products to raw materials)
        try:
            order = self.get_topological_order()
        except ValueError:
            raise ValueError("Cannot propagate ADU: network contains cycles")
               
        # Propagate ADU from parents to children
        for node_id in order:
            node = self.get_node(node_id)
            
            # Start with independent ADU (0 if None)
            node.adu = node.independent_adu if node.independent_adu is not None else 0.0
            
            # Get parents and their quantities
            parents = self.get_parents(node_id)
            
            # Add dependent demand from all parents
            for parent_id, quantity in parents.items():
                parent_node = self.get_node(parent_id)
                if parent_node.adu is not None and parent_node.adu > 0:
                    # Add parent's demand multiplied by quantity needed
                    node.adu += parent_node.adu * quantity
            
            # If final ADU is zero, set to None (no demand for this component)
            if node.adu == 0.0:
                node.adu = None
    
    # ========== Validation ==========
    
    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validate the network for completeness and consistency.
        
        Returns:
            (is_valid, error_messages)
            
        Validation checks:
        1. All nodes have valid required fields
        2. All finished goods have customer tolerance and ADU
        3. All buffer profile references are valid
        4. Network is a valid DAG (no cycles)
        5. All BOM relationships are defined
        """
        errors = []
        
        # Check if network is empty
        if len(self.graph.nodes()) == 0:
            errors.append("Network is empty - no nodes defined")
            return False, errors
        
        # Check DAG property
        if not nx.is_directed_acyclic_graph(self.graph):
            errors.append("Network contains cycles - must be a directed acyclic graph (DAG)")
        
        # Validate each node
        for node in self.get_all_nodes():
            # Check profile exists
            if node.buffer_profile_name not in self.profiles:
                errors.append(
                    f"Node {node.node_id}: references undefined profile '{node.buffer_profile_name}'"
                )
            
            # Check finished products
            if node.is_finished_product():
                if node.customer_tolerance_time is None:
                    errors.append(
                        f"Finished product {node.node_id}: missing customer_tolerance_time"
                    )
                # Note: ADU can be None initially, will be set during propagation
        
        is_valid = len(errors) == 0
        return is_valid, errors
    
    # ========== Serialization ==========
    
    def to_dict(self) -> dict:
        """
        Convert network to dictionary for JSON serialization.
        
        Returns:
            Dictionary with profiles, nodes, and edges
        """
        return {
            "profiles": {name: profile.to_dict() for name, profile in self.profiles.items()},
            "nodes": [node.to_dict() for node in self.get_all_nodes()],
            "edges": [
                {
                    "parent_id": parent_id,
                    "child_id": child_id,
                    "quantity": data['quantity']
                }
                for parent_id, child_id, data in self.graph.edges(data=True)
            ]
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Network':
        """
        Create network from dictionary (JSON deserialization).
        
        Args:
            data: Dictionary with profiles, nodes, and edges
            
        Returns:
            Network object
        """
        network = cls()
        
        # Load profiles
        for profile_data in data.get("profiles", {}).values():
            profile = BufferProfile.from_dict(profile_data)
            network.add_profile(profile)
        
        # Load nodes
        for node_data in data.get("nodes", []):
            node = NetworkNode.from_dict(node_data)
            network.add_node(node)
        
        # Load edges (disable auto-propagation during batch loading)
        network._auto_propagate = False
        for edge_data in data.get("edges", []):
            network.add_bom_relationship(
                edge_data["parent_id"],
                edge_data["child_id"],
                edge_data["quantity"]
            )
        network._auto_propagate = True
        
        # Propagate ADU through network once after all edges loaded
        network.propagate_adu()
        
        return network
    
    def __len__(self) -> int:
        """Return number of nodes in network."""
        return len(self.graph.nodes())
    
    def __contains__(self, node_id: str) -> bool:
        """Check if node_id exists in network."""
        return node_id in self.graph
