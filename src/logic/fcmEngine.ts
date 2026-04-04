import { 
  FCMNode, 
  FCMEdge, 
  ActivationFunction, 
  SimulationResult,
  FCMModelConfig,
  DEFAULT_MODEL_CONFIG,
  FCMSimulationEngine 
} from '../types';

// ============================================================================
// ACTIVATION FUNCTIONS
// ============================================================================

/**
 * Sigmoid activation function (continuous, bounded [0,1])
 * f(x) = 1 / (1 + e^(-lambda * x))
 */
const sigmoid = (x: number, lambda: number = 1): number => {
  return 1 / (1 + Math.exp(-lambda * x));
};

/**
 * Hyperbolic Tangent activation function (continuous, bounded [-1,1])
 * f(x) = tanh(lambda * x)
 */
const tanh = (x: number, lambda: number = 1): number => {
  return Math.tanh(lambda * x);
};

/**
 * Bivalent activation function (discrete, binary {0,1})
 * f(x) = 1 if x > 0, else 0
 */
const bivalent = (x: number, _lambda: number = 1): number => {
  return x > 0 ? 1 : 0;
};

/**
 * Trivalent activation function (discrete, ternary {-1,0,1})
 * f(x) = 1 if x > 0.5, -1 if x < -0.5, else 0
 */
const trivalent = (x: number, _lambda: number = 1): number => {
  if (x > 0.5) return 1;
  if (x < -0.5) return -1;
  return 0;
};

/**
 * Linear activation function (continuous, unbounded)
 * f(x) = clamp(lambda * x, 0, 1)
 */
const linear = (x: number, lambda: number = 1): number => {
  return Math.max(0, Math.min(1, lambda * x));
};

/**
 * Get the activation function by name
 */
export const getActivationFunction = (
  name: ActivationFunction
): (x: number, lambda: number) => number => {
  const functions: Record<ActivationFunction, (x: number, lambda: number) => number> = {
    sigmoid,
    tanh,
    bivalent,
    trivalent,
    linear,
  };
  return functions[name] || sigmoid;
};

// ============================================================================
// STANDARD FCM SIMULATION ENGINE
// ============================================================================

/**
 * Standard FCM inference rule:
 * A_i(k+1) = f( Σ A_j(k) · w_ji + A_i(k) )
 * 
 * This is the classic Kosko inference formula used in most FCM applications.
 */
export const runSimulation = (
  nodes: FCMNode[],
  edges: FCMEdge[],
  activationFn: ActivationFunction,
  lambda: number = 1,
  maxIterations: number = 25,
  convergenceThreshold: number = 0.001
): SimulationResult[] => {
  const results: SimulationResult[] = [];
  
  // Initialize activation state
  let currentActivations = nodes.reduce((acc, node) => {
    acc[node.id] = node.initialActivation;
    return acc;
  }, {} as Record<string, number>);

  results.push({ iteration: 0, ...currentActivations });

  const f = getActivationFunction(activationFn);

  for (let k = 0; k < maxIterations; k++) {
    const nextActivations: Record<string, number> = {};
    let maxDiff = 0;

    for (const node of nodes) {
      // Calculate weighted sum of incoming activations
      const weightedSum = edges
        .filter(edge => edge.target === node.id)
        .reduce((acc, edge) => {
          const sourceActivation = currentActivations[edge.source] || 0;
          return acc + (sourceActivation * edge.weight);
        }, 0);

      // Apply inference formula: A_i(k+1) = f(sum + A_i(k))
      const newValue = f(weightedSum + currentActivations[node.id], lambda);
      nextActivations[node.id] = newValue;

      const diff = Math.abs(newValue - currentActivations[node.id]);
      if (diff > maxDiff) maxDiff = diff;
    }

    results.push({ iteration: k + 1, ...nextActivations });
    currentActivations = nextActivations;

    // Check for convergence
    if (maxDiff < convergenceThreshold) break;
  }

  return results;
};

/**
 * Run simulation using a model configuration object
 * This is the preferred API for the modular architecture
 */
export const runSimulationWithConfig = (
  nodes: FCMNode[],
  edges: FCMEdge[],
  config: Partial<FCMModelConfig> = {}
): SimulationResult[] => {
  const fullConfig = { ...DEFAULT_MODEL_CONFIG, ...config };
  
  return runSimulation(
    nodes,
    edges,
    fullConfig.activationFunction,
    fullConfig.lambda,
    fullConfig.maxIterations,
    fullConfig.convergenceThreshold
  );
};

// ============================================================================
// ENGINE FACTORY - For future FCM variant implementations
// ============================================================================

/**
 * Standard FCM Engine implementation
 * Implements the FCMSimulationEngine interface for pluggable engines
 */
export const StandardFCMEngine: FCMSimulationEngine = {
  run: (nodes, edges, config) => runSimulationWithConfig(nodes, edges, config),
};

/**
 * Placeholder for future engines - extend this pattern for E-FCM, Temporal FCM, etc.
 * 
 * Example for Temporal FCM (to be implemented):
 * export const TemporalFCMEngine: FCMSimulationEngine = {
 *   run: (nodes, edges, config) => {
 *     // Custom temporal inference logic with time delays
 *   }
 * };
 */
