import { 
  FCMNode, 
  FCMEdge, 
  ActivationFunction, 
  InferenceRule,
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
 * Linear activation function (continuous, clamped to [0,1])
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
 * A detected limit cycle: the trajectory repeats every `period` steps
 * from `startIteration` onward instead of settling to a fixed point.
 */
export interface LimitCycle {
  period: number;
  startIteration: number;
}

/**
 * Structured outcome of a simulation run.
 * `steps[0]` is the initial state; each following entry is one inference update.
 */
export interface SimulationOutcome {
  steps: SimulationResult[];
  /** True when the state change fell below the convergence threshold. */
  converged: boolean;
  /** Number of inference updates performed (steps.length - 1). */
  iterations: number;
  /** Present when the run didn't converge but the trajectory repeats. */
  limitCycle?: LimitCycle;
}

/** Optional behavior tweaks for a simulation run. */
export interface SimulationOptions {
  /**
   * Concepts to clamp for scenario analysis: their activation is held at
   * the initial value on every iteration instead of being updated.
   */
  clampedNodeIds?: string[];
  /** Inference rule; defaults to 'modified-kosko' (the historical behavior). */
  inferenceRule?: InferenceRule;
}

/**
 * Scan the trajectory for a repeating state (limit cycle). Two states are
 * considered equal when every concept differs by less than `tolerance`.
 * Returns the shortest cycle ending at the final state, or null.
 */
export const detectLimitCycle = (
  steps: SimulationResult[],
  nodeIds: string[],
  tolerance: number
): LimitCycle | null => {
  if (steps.length < 3 || nodeIds.length === 0) return null;

  const statesEqual = (a: SimulationResult, b: SimulationResult) =>
    nodeIds.every(id => Math.abs((a[id] ?? 0) - (b[id] ?? 0)) < tolerance);

  const lastIndex = steps.length - 1;

  // Try each candidate period (shortest first, so the minimal cycle wins)
  // and accept it only if one full period actually repeats at the tail.
  for (let period = 1; period <= Math.floor(lastIndex / 2); period++) {
    if (!statesEqual(steps[lastIndex], steps[lastIndex - period])) continue;

    let verified = true;
    for (let j = lastIndex; j > lastIndex - period; j--) {
      if (!statesEqual(steps[j], steps[j - period])) {
        verified = false;
        break;
      }
    }
    if (verified) {
      return { period, startIteration: steps[lastIndex - 2 * period + 1].iteration };
    }
  }

  return null;
};

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
  convergenceThreshold: number = 0.001,
  options: SimulationOptions = {}
): SimulationOutcome => {
  const steps: SimulationResult[] = [];
  const clamped = new Set(options.clampedNodeIds ?? []);
  const rule: InferenceRule = options.inferenceRule ?? 'modified-kosko';
  // The rescaled rule maps activations to [−1,1] before combining them
  const transform = rule === 'rescaled' ? (a: number) => 2 * a - 1 : (a: number) => a;

  // Initialize activation state
  let currentActivations = nodes.reduce((acc, node) => {
    acc[node.id] = node.initialActivation;
    return acc;
  }, {} as Record<string, number>);

  steps.push({ iteration: 0, ...currentActivations });

  const f = getActivationFunction(activationFn);
  let converged = false;

  for (let k = 0; k < maxIterations; k++) {
    const nextActivations: Record<string, number> = {};
    let maxDiff = 0;

    for (const node of nodes) {
      // Clamped concepts are scenario inputs: they hold their value
      if (clamped.has(node.id)) {
        nextActivations[node.id] = currentActivations[node.id];
        continue;
      }

      // Calculate weighted sum of incoming activations (self-loop edges
      // where source === target contribute here like any other edge)
      const weightedSum = edges
        .filter(edge => edge.target === node.id)
        .reduce((acc, edge) => {
          const sourceActivation = currentActivations[edge.source] || 0;
          return acc + (transform(sourceActivation) * edge.weight);
        }, 0);

      // Self-memory term depends on the inference rule
      const selfTerm = rule === 'kosko' ? 0 : transform(currentActivations[node.id]);
      const newValue = f(weightedSum + selfTerm, lambda);
      nextActivations[node.id] = newValue;

      const diff = Math.abs(newValue - currentActivations[node.id]);
      if (diff > maxDiff) maxDiff = diff;
    }

    steps.push({ iteration: k + 1, ...nextActivations });
    currentActivations = nextActivations;

    // Check for convergence
    if (maxDiff < convergenceThreshold) {
      converged = true;
      break;
    }
  }

  const outcome: SimulationOutcome = { steps, converged, iterations: steps.length - 1 };

  if (!converged) {
    const cycle = detectLimitCycle(steps, nodes.map(n => n.id), convergenceThreshold);
    if (cycle) outcome.limitCycle = cycle;
  }

  return outcome;
};

/**
 * Run simulation using a model configuration object
 * This is the preferred API for the modular architecture
 */
export const runSimulationWithConfig = (
  nodes: FCMNode[],
  edges: FCMEdge[],
  config: Partial<FCMModelConfig> = {}
): SimulationOutcome => {
  const fullConfig = { ...DEFAULT_MODEL_CONFIG, ...config };

  return runSimulation(
    nodes,
    edges,
    fullConfig.activationFunction,
    fullConfig.lambda,
    fullConfig.maxIterations,
    fullConfig.convergenceThreshold,
    { inferenceRule: fullConfig.inferenceRule }
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
