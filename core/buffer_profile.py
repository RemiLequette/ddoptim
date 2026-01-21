"""
Buffer Profile Definitions for DDMRP Buffer Sizing

A buffer profile determines how buffer zones are calculated based on:
- DLT thresholds (short/medium/long lead times)
- Lead time factors for each category
- Variability factor (supply/demand combined)
"""

from dataclasses import dataclass
from typing import Dict


@dataclass
class BufferProfile:
    """
    Defines buffer sizing parameters for a category of items.
    
    Attributes:
        name: Profile identifier (e.g., "F", "AI", "Custom_Strategic")
        description: Human-readable description of when to use this profile
        
        dlt_threshold_short: DLT threshold for "short" category (days)
        dlt_threshold_medium: DLT threshold for "medium" category (days)
        dlt_threshold_long: DLT threshold for "long" category (days)
        
        lead_time_factor_short: Factor applied when DLT <= short threshold (typically 0.7)
        lead_time_factor_medium: Factor applied when short < DLT <= medium threshold (typically 0.5)
        lead_time_factor_long: Factor applied when DLT > medium threshold (typically 0.25)
        
        variability_factor: Combined supply/demand variability factor
                           0.25 (Low), 0.5 (Medium), 0.7 (High)
    
    Examples:
        >>> # Weber Pignons profile for finished goods
        >>> profile_f = BufferProfile(
        ...     name="F",
        ...     description="Fabriqués (Manufactured/Finished)",
        ...     dlt_threshold_short=1,
        ...     dlt_threshold_medium=3,
        ...     dlt_threshold_long=7,
        ...     lead_time_factor_short=0.7,
        ...     lead_time_factor_medium=0.5,
        ...     lead_time_factor_long=0.25,
        ...     variability_factor=0.25
        ... )
    """
    name: str
    description: str
    
    # DLT thresholds (days)
    dlt_threshold_short: int
    dlt_threshold_medium: int
    dlt_threshold_long: int
    
    # Lead time factors
    lead_time_factor_short: float
    lead_time_factor_medium: float
    lead_time_factor_long: float
    
    # Variability
    variability_factor: float
    
    def __post_init__(self):
        """Validate profile parameters."""
        # Validate thresholds are in ascending order
        if not (self.dlt_threshold_short < self.dlt_threshold_medium < self.dlt_threshold_long):
            raise ValueError(
                f"DLT thresholds must be in ascending order: "
                f"short({self.dlt_threshold_short}) < "
                f"medium({self.dlt_threshold_medium}) < "
                f"long({self.dlt_threshold_long})"
            )
        
        # Validate factors are in valid range
        for factor_name, factor_value in [
            ("short", self.lead_time_factor_short),
            ("medium", self.lead_time_factor_medium),
            ("long", self.lead_time_factor_long),
            ("variability", self.variability_factor)
        ]:
            if not (0 < factor_value <= 1):
                raise ValueError(
                    f"{factor_name} factor must be between 0 and 1, got {factor_value}"
                )
        
        # Validate lead time factors are in descending order
        if not (self.lead_time_factor_short >= self.lead_time_factor_medium >= self.lead_time_factor_long):
            raise ValueError(
                f"Lead time factors should be in descending order: "
                f"short({self.lead_time_factor_short}) >= "
                f"medium({self.lead_time_factor_medium}) >= "
                f"long({self.lead_time_factor_long})"
            )
    
    def get_lead_time_factor(self, dlt: float) -> float:
        """
        Get the appropriate lead time factor based on DLT length.
        
        Args:
            dlt: Decoupled Lead Time in days
            
        Returns:
            Lead time factor (0.7, 0.5, or 0.25 typically)
            
        Example:
            >>> profile = BufferProfile(...)
            >>> profile.get_lead_time_factor(2)  # DLT=2 days
            0.5  # Medium category for profile F
        """
        if dlt <= self.dlt_threshold_short:
            return self.lead_time_factor_short
        elif dlt <= self.dlt_threshold_medium:
            return self.lead_time_factor_medium
        else:
            return self.lead_time_factor_long
    
    def to_dict(self) -> dict:
        """Convert profile to dictionary for JSON serialization."""
        return {
            "name": self.name,
            "description": self.description,
            "dlt_threshold_short": self.dlt_threshold_short,
            "dlt_threshold_medium": self.dlt_threshold_medium,
            "dlt_threshold_long": self.dlt_threshold_long,
            "lead_time_factor_short": self.lead_time_factor_short,
            "lead_time_factor_medium": self.lead_time_factor_medium,
            "lead_time_factor_long": self.lead_time_factor_long,
            "variability_factor": self.variability_factor
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'BufferProfile':
        """Create profile from dictionary (JSON deserialization)."""
        return cls(**data)


# Weber Pignons default profiles
WEBER_PIGNONS_PROFILES: Dict[str, BufferProfile] = {
    "F": BufferProfile(
        name="F",
        description="Fabriqués (Manufactured/Finished) - Low variability, predictable demand",
        dlt_threshold_short=1,
        dlt_threshold_medium=3,
        dlt_threshold_long=7,
        lead_time_factor_short=0.7,
        lead_time_factor_medium=0.5,
        lead_time_factor_long=0.25,
        variability_factor=0.25
    ),
    "I": BufferProfile(
        name="I",
        description="Intermédiaires (Semi-finished) - Low variability, internal control",
        dlt_threshold_short=1,
        dlt_threshold_medium=3,
        dlt_threshold_long=7,
        lead_time_factor_short=0.7,
        lead_time_factor_medium=0.5,
        lead_time_factor_long=0.25,
        variability_factor=0.25
    ),
    "U": BufferProfile(
        name="U",
        description="Usinés (Machined) - Medium variability, capacity constraints, spare parts demand",
        dlt_threshold_short=1,
        dlt_threshold_medium=5,
        dlt_threshold_long=21,
        lead_time_factor_short=0.7,
        lead_time_factor_medium=0.5,
        lead_time_factor_long=0.25,
        variability_factor=0.5
    ),
    "AL": BufferProfile(
        name="AL",
        description="Achetés Local (Purchased Local) - Medium variability, generally reliable",
        dlt_threshold_short=1,
        dlt_threshold_medium=3,
        dlt_threshold_long=7,
        lead_time_factor_short=0.7,
        lead_time_factor_medium=0.5,
        lead_time_factor_long=0.25,
        variability_factor=0.5
    ),
    "AI": BufferProfile(
        name="AI",
        description="Achetés International - High variability, long lead times, transport delays",
        dlt_threshold_short=1,
        dlt_threshold_medium=5,
        dlt_threshold_long=21,
        lead_time_factor_short=0.7,
        lead_time_factor_medium=0.5,
        lead_time_factor_long=0.25,
        variability_factor=0.7
    )
}


def get_default_profiles() -> Dict[str, BufferProfile]:
    """Get Weber Pignons default profiles."""
    return WEBER_PIGNONS_PROFILES.copy()
