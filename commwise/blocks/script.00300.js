// DDMRP Buffer Profile Definitions
// Each profile defines DLT thresholds and factors for buffer sizing

const BUFFER_PROFILES = {
  // F - FabriquÃ©s (Manufactured/Finished Products)
  // Low variability, predictable demand, reliable production
  F: {
    name: 'F',
    description: 'FabriquÃ©s (Manufactured/Finished)',
    
    // DLT thresholds (days) for lead time factor determination
    dlt_threshold_short: 1,    // If DLT â‰¤ 1 day â†’ short category
    dlt_threshold_medium: 3,   // If DLT â‰¤ 3 days â†’ medium category
    dlt_threshold_long: 7,     // If DLT > 3 days â†’ long category
    
    // Lead time factors by DLT category
    leadTimeFactor_short: 0.7,   // DLT â‰¤ 1 day
    leadTimeFactor_medium: 0.5,  // 1 < DLT â‰¤ 3 days
    leadTimeFactor_long: 0.25,   // DLT > 3 days
    
    // Variability factor (combined supply/demand)
    variabilityFactor: 0.25      // Low variability (Faible)
  },
  
  // I - IntermÃ©diaires (Semi-finished/Intermediate Products)
  // Low variability, not sold separately, pure intermediate
  I: {
    name: 'I',
    description: 'IntermÃ©diaires (Semi-finished)',
    
    dlt_threshold_short: 1,
    dlt_threshold_medium: 3,
    dlt_threshold_long: 7,
    
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    
    variabilityFactor: 0.25      // Low variability (Faible)
  },
  
  // U - UsinÃ©s (Machined Parts)
  // Medium variability from capacity constraints, includes spare parts demand
  U: {
    name: 'U',
    description: 'UsinÃ©s (Machined)',
    
    dlt_threshold_short: 1,
    dlt_threshold_medium: 5,     // Longer medium threshold
    dlt_threshold_long: 21,      // Longer long threshold
    
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    
    variabilityFactor: 0.5       // Medium variability (Moyen)
  },
  
  // AL - AchetÃ©s Local (Purchased Local)
  // Medium variability, local suppliers, generally reliable with occasional delays
  AL: {
    name: 'AL',
    description: 'AchetÃ©s Local (Purchased Local)',
    
    dlt_threshold_short: 1,
    dlt_threshold_medium: 3,
    dlt_threshold_long: 7,
    
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    
    variabilityFactor: 0.5       // Medium variability (Moyen)
  },
  
  // AI - AchetÃ©s International (Purchased International)
  // High variability, long lead times, transport delays, quality issues
  AI: {
    name: 'AI',
    description: 'AchetÃ©s International (Purchased International)',
    
    dlt_threshold_short: 1,
    dlt_threshold_medium: 5,     // Longer medium threshold
    dlt_threshold_long: 21,      // Longer long threshold
    
    leadTimeFactor_short: 0.7,
    leadTimeFactor_medium: 0.5,
    leadTimeFactor_long: 0.25,
    
    variabilityFactor: 0.7       // High variability (Haute)
  }
};

// Helper function: Get lead time factor for a given DLT and profile
function getLeadTimeFactor(dlt, profile) {
  const p = BUFFER_PROFILES[profile];
  if (!p) {
    console.error(`Invalid buffer profile: ${profile}`);
    return 0.5; // Default fallback
  }
  
  if (dlt <= p.dlt_threshold_short) {
    return p.leadTimeFactor_short;
  } else if (dlt <= p.dlt_threshold_medium) {
    return p.leadTimeFactor_medium;
  } else {
    return p.leadTimeFactor_long;
  }
}

// Helper function: Get variability factor for a profile
function getVariabilityFactor(profile) {
  const p = BUFFER_PROFILES[profile];
  if (!p) {
    console.error(`Invalid buffer profile: ${profile}`);
    return 0.5; // Default fallback
  }
  return p.variabilityFactor;
}

// Expose to window for JSON export/import and external access
window.BUFFER_PROFILES = BUFFER_PROFILES;
console.log('âœ… Buffer profiles loaded and exposed to window');
