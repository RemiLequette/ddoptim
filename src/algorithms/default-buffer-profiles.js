export const DEFAULT_BUFFER_PROFILES = {
  F: {
    variabilityFactor: 0.5,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.5, medium: 0.4, long: 0.3 }
  },
  I: {
    variabilityFactor: 0.4,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.5, medium: 0.4, long: 0.3 }
  },
  U: {
    variabilityFactor: 0.6,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.6, medium: 0.5, long: 0.4 }
  },
  AL: {
    variabilityFactor: 0.3,
    dltThresholds: { C: 5, M: 15 },
    leadTimeFactors: { short: 0.4, medium: 0.3, long: 0.2 }
  },
  AI: {
    variabilityFactor: 0.7,
    dltThresholds: { C: 10, M: 30 },
    leadTimeFactors: { short: 0.6, medium: 0.5, long: 0.4 }
  }
};

export const FALLBACK_BUFFER_PROFILE = {
  variabilityFactor: 0,
  dltThresholds: { C: 1, M: 3 },
  leadTimeFactors: { short: 0, medium: 0, long: 0 }
};
