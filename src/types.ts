// ============================================================================
// CORE FCM TYPES - Base types for all FCM variants
// ============================================================================

export interface SemanticState {
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface FCMNode {
  id: string;
  label: string;
  activation: number;
  initialActivation: number;
  /** Scenario mode: hold this concept at its initial activation during simulation */
  clamped?: boolean;
  x?: number;
  y?: number;
  semanticStates?: SemanticState[];
}

export interface FCMEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  label?: string;
}

export type ActivationFunction = 'sigmoid' | 'tanh' | 'bivalent' | 'trivalent' | 'linear';

export interface SimulationResult {
  iteration: number;
  [nodeId: string]: number;
}

// ============================================================================
// LINGUISTIC VARIABLES - Configurable fuzzy terms
// ============================================================================

export interface LinguisticTerm {
  label: string;
  value: number;
}

export type LinguisticScalePreset = '5-point' | '7-point' | '9-point' | '11-point';

export const LINGUISTIC_SCALE_PRESETS: Record<LinguisticScalePreset, LinguisticTerm[]> = {
  '5-point': [
    { label: "Strong −", value: -1.0 },
    { label: "Weak −", value: -0.5 },
    { label: "Zero", value: 0 },
    { label: "Weak +", value: 0.5 },
    { label: "Strong +", value: 1.0 },
  ],
  '7-point': [
    { label: "Strong −", value: -1.0 },
    { label: "Medium −", value: -0.67 },
    { label: "Weak −", value: -0.33 },
    { label: "Zero", value: 0 },
    { label: "Weak +", value: 0.33 },
    { label: "Medium +", value: 0.67 },
    { label: "Strong +", value: 1.0 },
  ],
  '9-point': [
    { label: "Very Strong −", value: -1.0 },
    { label: "Strong −", value: -0.75 },
    { label: "Medium −", value: -0.5 },
    { label: "Weak −", value: -0.25 },
    { label: "Zero", value: 0 },
    { label: "Weak +", value: 0.25 },
    { label: "Medium +", value: 0.5 },
    { label: "Strong +", value: 0.75 },
    { label: "Very Strong +", value: 1.0 },
  ],
  '11-point': [
    { label: "Extreme −", value: -1.0 },
    { label: "Very Strong −", value: -0.8 },
    { label: "Strong −", value: -0.6 },
    { label: "Medium −", value: -0.4 },
    { label: "Weak −", value: -0.2 },
    { label: "Zero", value: 0 },
    { label: "Weak +", value: 0.2 },
    { label: "Medium +", value: 0.4 },
    { label: "Strong +", value: 0.6 },
    { label: "Very Strong +", value: 0.8 },
    { label: "Extreme +", value: 1.0 },
  ],
};

export const LINGUISTIC_SCALE_INFO: Record<LinguisticScalePreset, { name: string; description: string }> = {
  '5-point': { name: 'Simple', description: 'Basic scale for quick assessments' },
  '7-point': { name: 'Balanced', description: 'Good balance of precision and simplicity' },
  '9-point': { name: 'Standard', description: 'Most common in FCM literature' },
  '11-point': { name: 'Detailed', description: 'Fine-grained for expert analysis' },
};

// Default linguistic terms (9-point standard scale)
export const LINGUISTIC_TERMS: LinguisticTerm[] = LINGUISTIC_SCALE_PRESETS['9-point'];

// ============================================================================
// MEMBERSHIP FUNCTIONS - Fuzzy set definitions
// ============================================================================

export type MembershipFunctionType = 'triangular' | 'trapezoidal' | 'gaussian';

export const MEMBERSHIP_FUNCTION_INFO: Record<MembershipFunctionType, { name: string; description: string }> = {
  triangular: { name: 'Triangular', description: 'Sharp transitions, simple interpretation' },
  trapezoidal: { name: 'Trapezoidal', description: 'Flat tops, tolerant of variation' },
  gaussian: { name: 'Gaussian', description: 'Smooth curves, natural uncertainty' },
};

/**
 * Calculate membership degree for a given value and linguistic term
 */
export const calculateMembership = (
  value: number,
  termValue: number,
  allTerms: LinguisticTerm[],
  functionType: MembershipFunctionType
): number => {
  const sortedTerms = [...allTerms].sort((a, b) => a.value - b.value);
  const termIndex = sortedTerms.findIndex(t => t.value === termValue);
  
  const prevValue = termIndex > 0 ? sortedTerms[termIndex - 1].value : termValue - 0.5;
  const nextValue = termIndex < sortedTerms.length - 1 ? sortedTerms[termIndex + 1].value : termValue + 0.5;
  
  const leftWidth = termValue - prevValue;
  const rightWidth = nextValue - termValue;

  switch (functionType) {
    case 'triangular': {
      if (value <= prevValue || value >= nextValue) return 0;
      if (value < termValue) return (value - prevValue) / leftWidth;
      if (value > termValue) return (nextValue - value) / rightWidth;
      return 1;
    }
    case 'trapezoidal': {
      const plateauWidth = Math.min(leftWidth, rightWidth) * 0.3;
      const leftPlateau = termValue - plateauWidth / 2;
      const rightPlateau = termValue + plateauWidth / 2;
      
      if (value <= prevValue || value >= nextValue) return 0;
      if (value >= leftPlateau && value <= rightPlateau) return 1;
      if (value < leftPlateau) return (value - prevValue) / (leftPlateau - prevValue);
      return (nextValue - value) / (nextValue - rightPlateau);
    }
    case 'gaussian': {
      const sigma = Math.min(leftWidth, rightWidth) / 2.5;
      return Math.exp(-Math.pow(value - termValue, 2) / (2 * sigma * sigma));
    }
    default:
      return 0;
  }
};

// ============================================================================
// MODEL CONFIGURATION - Extensible configuration for FCM variants
// ============================================================================

export type FCMModelType = 'standard' | 'extended' | 'temporal' | 'rule-based';

export interface FCMModelConfig {
  type: FCMModelType;
  activationFunction: ActivationFunction;
  lambda: number;
  maxIterations: number;
  convergenceThreshold: number;
  linguisticTerms: LinguisticTerm[];
}

export const DEFAULT_MODEL_CONFIG: FCMModelConfig = {
  type: 'standard',
  activationFunction: 'sigmoid',
  lambda: 1,
  maxIterations: 25,
  convergenceThreshold: 0.001,
  linguisticTerms: LINGUISTIC_TERMS,
};

// ============================================================================
// EXTENSION INTERFACES - Hooks for future FCM variants
// These interfaces define the contract for extending FCM functionality
// ============================================================================

/**
 * Extended Edge - For E-FCM with interval weights or uncertainty
 * Usage: Extend FCMEdge when implementing E-FCM
 */
export interface ExtendedFCMEdge extends FCMEdge {
  weightMin?: number;
  weightMax?: number;
  confidence?: number;
}

/**
 * Temporal Edge - For time-delayed causal relationships
 * Usage: Extend FCMEdge when implementing Temporal FCM
 */
export interface TemporalFCMEdge extends FCMEdge {
  delay?: number;
  timeUnit?: 'steps' | 'seconds' | 'minutes';
}

/**
 * Rule-based Node - For nodes with conditional activation rules
 * Usage: Extend FCMNode when implementing Rule-based FCM
 */
export interface RuleBasedFCMNode extends FCMNode {
  rules?: {
    condition: string;
    action: 'activate' | 'deactivate' | 'modify';
    value?: number;
  }[];
}

/**
 * Structured result of a simulation engine run.
 * Mirrors SimulationOutcome in logic/fcmEngine.ts; declared here so the
 * engine interface has no dependency on a concrete implementation.
 */
export interface FCMEngineOutcome {
  steps: SimulationResult[];
  converged: boolean;
  iterations: number;
}

/**
 * Simulation Engine Interface - Implement this for custom FCM variants
 * This allows plugging in different inference algorithms
 */
export interface FCMSimulationEngine {
  run(
    nodes: FCMNode[],
    edges: FCMEdge[],
    config: FCMModelConfig
  ): FCMEngineOutcome;
}
