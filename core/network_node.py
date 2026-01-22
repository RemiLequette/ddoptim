"""
Network Node Definitions for Supply Chain Items

Represents items/operations in the supply chain network with all attributes
needed for buffer positioning and sizing.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict


class NodeType(Enum):
    """Type of node in the supply chain network."""
    FINISHED_PRODUCT = "finished_product"
    INTERMEDIATE = "intermediate"
    MACHINED = "machined"
    PURCHASED_LOCAL = "purchased_local"
    PURCHASED_INTERNATIONAL = "purchased_international"


class BufferStatus(Enum):
    """Buffer status for a node."""
    NO_BUFFER = "no_buffer"              # Not buffered
    USER_FIXED = "user_fixed"            # User mandated this buffer
    USER_FORBIDDEN = "user_forbidden"    # User forbids buffer here
    ALGORITHM_RECOMMENDED = "algorithm_recommended"  # Algorithm recommends buffer


@dataclass
class NetworkNode:
    """
    Represents a single item/operation in the supply chain network.
    
    Attributes:
        node_id: Unique identifier for the node
        name: Human-readable name
        node_type: Type of node (finished product, intermediate, etc.)
        
        # Lead time and profile
        lead_time: Procurement/production lead time in days
        buffer_profile_name: Reference to buffer profile (must exist in profile registry)
        
        # Constraints
        moq: Minimum order quantity (0 if none)
        order_cycle: Desired ordering frequency in days (0 if none, e.g., 30 for monthly batching)
        
        # Costs
        unit_cost: Cost per unit (for inventory value calculation)
        
        # Demand
        customer_tolerance_time: Maximum lead time customer will accept (days, None if not customer-facing)
        independent_adu: Independent demand from customers (set for finished products, None for components)
        adu: Total Average Daily Usage (calculated via BOM propagation from independent demand)
        sales_order_visibility_horizon: How far ahead orders are visible (days, 0 if none)
        
        # Buffer positioning
        buffer_status: Current buffer status
        buffer_rationale: Explanation for buffer decision (user-provided or algorithm-generated)
        
        # BOM relationships (managed by Network class)
        # parents: Dict[node_id, quantity_per_parent]
        # children: Dict[node_id, quantity_needed]
    
    Examples:
        >>> # Finished product
        >>> bike = NetworkNode(
        ...     node_id="BIKE_001",
        ...     name="Vélo SUPERVELO",
        ...     node_type=NodeType.FINISHED_PRODUCT,
        ...     lead_time=5,
        ...     buffer_profile_name="F",
        ...     unit_cost=500.0,
        ...     customer_tolerance_time=5,
        ...     adu=40.0
        ... )
        
        >>> # Purchased international component
        >>> spokes = NetworkNode(
        ...     node_id="SPOKE_001",
        ...     name="Rayons",
        ...     node_type=NodeType.PURCHASED_INTERNATIONAL,
        ...     lead_time=15,
        ...     buffer_profile_name="AI",
        ...     moq=5000,
        ...     order_cycle=30,
        ...     unit_cost=0.5
        ... )
    """
    
    # Identity
    node_id: str
    name: str
    node_type: NodeType
    
    # Lead time and profile
    lead_time: int  # days, must be > 0
    buffer_profile_name: str
    
    # Constraints
    moq: int = 0  # minimum order quantity
    order_cycle: int = 0  # ordering frequency in days
    
    # Costs
    unit_cost: float = 0.0
    
    # Demand
    customer_tolerance_time: Optional[int] = None  # days
    independent_adu: Optional[float] = None  # customer demand (finished products only)
    adu: Optional[float] = None  # total dependent demand (calculated via BOM propagation)
    sales_order_visibility_horizon: int = 0  # days
    
    # Buffer positioning
    buffer_status: BufferStatus = BufferStatus.NO_BUFFER
    buffer_rationale: str = ""
    
    # Additional metadata
    metadata: Dict = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate node parameters."""
        # If adu was provided in constructor, treat it as independent_adu
        if self.adu is not None and self.independent_adu is None:
            self.independent_adu = self.adu
        
        # Validate lead time
        if self.lead_time <= 0:
            raise ValueError(f"Lead time must be > 0, got {self.lead_time} for node {self.node_id}")
        
        # Validate unit cost
        if self.unit_cost < 0:
            raise ValueError(f"Unit cost must be >= 0, got {self.unit_cost} for node {self.node_id}")
        
        # Validate MOQ and order cycle
        if self.moq < 0:
            raise ValueError(f"MOQ must be >= 0, got {self.moq} for node {self.node_id}")
        if self.order_cycle < 0:
            raise ValueError(f"Order cycle must be >= 0, got {self.order_cycle} for node {self.node_id}")
        
        # Validate customer tolerance for finished products
        if self.node_type == NodeType.FINISHED_PRODUCT:
            if self.customer_tolerance_time is None:
                raise ValueError(
                    f"Finished product {self.node_id} must have customer_tolerance_time"
                )
            if self.customer_tolerance_time <= 0:
                raise ValueError(
                    f"Customer tolerance time must be > 0, got {self.customer_tolerance_time}"
                )
        
        # Convert string node_type to enum if needed
        if isinstance(self.node_type, str):
            self.node_type = NodeType(self.node_type)
        
        # Convert string buffer_status to enum if needed
        if isinstance(self.buffer_status, str):
            self.buffer_status = BufferStatus(self.buffer_status)
    
    def is_finished_product(self) -> bool:
        """Check if this is a customer-facing finished product."""
        return self.node_type == NodeType.FINISHED_PRODUCT
    
    def is_buffered(self) -> bool:
        """Check if this node has a buffer (user-fixed or algorithm-recommended)."""
        return self.buffer_status in [BufferStatus.USER_FIXED, BufferStatus.ALGORITHM_RECOMMENDED]
    
    def can_be_buffered(self) -> bool:
        """Check if this node can have a buffer (not forbidden)."""
        return self.buffer_status != BufferStatus.USER_FORBIDDEN
    
    def set_user_fixed_buffer(self, rationale: str):
        """Mark this node as having a user-mandated buffer."""
        self.buffer_status = BufferStatus.USER_FIXED
        self.buffer_rationale = rationale
    
    def set_user_forbidden_buffer(self, rationale: str):
        """Mark this node as forbidden from having a buffer."""
        self.buffer_status = BufferStatus.USER_FORBIDDEN
        self.buffer_rationale = rationale
    
    def set_algorithm_recommended_buffer(self, rationale: str):
        """Mark this node as having an algorithm-recommended buffer."""
        self.buffer_status = BufferStatus.ALGORITHM_RECOMMENDED
        self.buffer_rationale = rationale
    
    def clear_buffer(self):
        """Remove buffer from this node (if not user-fixed or forbidden)."""
        if self.buffer_status == BufferStatus.ALGORITHM_RECOMMENDED:
            self.buffer_status = BufferStatus.NO_BUFFER
            self.buffer_rationale = ""
    
    def to_dict(self) -> dict:
        """Convert node to dictionary for JSON serialization."""
        return {
            "node_id": self.node_id,
            "name": self.name,
            "node_type": self.node_type.value,
            "lead_time": self.lead_time,
            "buffer_profile_name": self.buffer_profile_name,
            "moq": self.moq,
            "order_cycle": self.order_cycle,
            "unit_cost": self.unit_cost,
            "customer_tolerance_time": self.customer_tolerance_time,
            "independent_adu": self.independent_adu,
            "adu": self.adu,
            "sales_order_visibility_horizon": self.sales_order_visibility_horizon,
            "buffer_status": self.buffer_status.value,
            "buffer_rationale": self.buffer_rationale,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'NetworkNode':
        """Create node from dictionary (JSON deserialization)."""
        # Create a copy to avoid modifying input
        data = data.copy()
        
        # Convert enums
        if "node_type" in data and isinstance(data["node_type"], str):
            data["node_type"] = NodeType(data["node_type"])
        if "buffer_status" in data and isinstance(data["buffer_status"], str):
            data["buffer_status"] = BufferStatus(data["buffer_status"])
        
        return cls(**data)
