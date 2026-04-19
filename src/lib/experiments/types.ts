/**
 * Experiment Types - Data models for simulation runs and analysis
 */

import { FCMNode, FCMEdge, ActivationFunction } from '../../types';

/**
 * A single simulation run with full history
 */
export interface SimulationRun {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  
  // Input configuration
  config: SimulationConfig;
  
  // Initial state (before simulation)
  initialState: ConceptState[];
  
  // Full convergence history (each iteration)
  history: ConceptState[][];
  
  // Final converged state
  finalState: ConceptState[];
  
  // Simulation metadata
  converged: boolean;
  iterations: number;
  
  // Optional: clamped/input concepts for scenario mode
  clampedConcepts?: string[];
}

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  activationFunction: ActivationFunction;
  lambda: number;
  maxIterations: number;
  convergenceThreshold: number;
}

/**
 * State of a single concept at a point in time
 */
export interface ConceptState {
  id: string;
  label: string;
  activation: number;
  initialActivation: number;
}

/**
 * Comparison result between two runs
 */
export interface ComparisonResult {
  runA: SimulationRun;
  runB: SimulationRun;
  deltas: ConceptDelta[];
  summary: ComparisonSummary;
}

/**
 * Delta for a single concept
 */
export interface ConceptDelta {
  id: string;
  label: string;
  valueA: number;
  valueB: number;
  delta: number;
  percentChange: number;
}

/**
 * Summary of comparison
 */
export interface ComparisonSummary {
  mostIncreased: ConceptDelta | null;
  mostDecreased: ConceptDelta | null;
  averageAbsDelta: number;
  unchangedCount: number;
}

/**
 * Sensitivity analysis result for one input concept
 */
export interface SensitivityResult {
  inputConceptId: string;
  inputConceptLabel: string;
  sweepValues: number[];
  outputResults: {
    conceptId: string;
    conceptLabel: string;
    values: number[];
  }[];
}

/**
 * Centrality analysis for concepts
 */
export interface CentralityAnalysis {
  concepts: ConceptCentrality[];
}

export interface ConceptCentrality {
  id: string;
  label: string;
  inDegree: number;
  outDegree: number;
  totalCentrality: number;
  role: 'transmitter' | 'receiver' | 'ordinary' | 'isolated';
}

/**
 * Interpretation mappings for output concepts
 */
export interface OutputInterpretation {
  conceptId: string;
  value: number;
  label: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
}

/**
 * Default simulation config
 */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  activationFunction: 'sigmoid',
  lambda: 1,
  maxIterations: 50,
  convergenceThreshold: 0.001,
};

/**
 * Generate unique run ID
 */
export const generateRunId = (): string => {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Calculate concept centrality from weight matrix
 */
export const calculateCentrality = (
  nodes: FCMNode[],
  edges: FCMEdge[]
): CentralityAnalysis => {
  const concepts: ConceptCentrality[] = nodes.map(node => {
    const outEdges = edges.filter(e => e.source === node.id);
    const inEdges = edges.filter(e => e.target === node.id);
    
    const outDegree = outEdges.reduce((sum, e) => sum + Math.abs(e.weight), 0);
    const inDegree = inEdges.reduce((sum, e) => sum + Math.abs(e.weight), 0);
    const totalCentrality = outDegree + inDegree;
    
    let role: ConceptCentrality['role'] = 'ordinary';
    if (outDegree === 0 && inDegree === 0) role = 'isolated';
    else if (outDegree > inDegree * 1.5) role = 'transmitter';
    else if (inDegree > outDegree * 1.5) role = 'receiver';
    
    return {
      id: node.id,
      label: node.label,
      inDegree,
      outDegree,
      totalCentrality,
      role,
    };
  });
  
  return { concepts: concepts.sort((a, b) => b.totalCentrality - a.totalCentrality) };
};

/**
 * Compare two simulation runs
 */
export const compareRuns = (runA: SimulationRun, runB: SimulationRun): ComparisonResult => {
  const deltas: ConceptDelta[] = runA.finalState.map(conceptA => {
    const conceptB = runB.finalState.find(c => c.id === conceptA.id);
    const valueB = conceptB?.activation ?? 0;
    const delta = valueB - conceptA.activation;
    const percentChange = conceptA.activation !== 0 
      ? (delta / conceptA.activation) * 100 
      : (valueB !== 0 ? 100 : 0);
    
    return {
      id: conceptA.id,
      label: conceptA.label,
      valueA: conceptA.activation,
      valueB,
      delta,
      percentChange,
    };
  });
  
  const sortedByDelta = [...deltas].sort((a, b) => b.delta - a.delta);
  const mostIncreased = sortedByDelta[0]?.delta > 0.01 ? sortedByDelta[0] : null;
  const mostDecreased = sortedByDelta[sortedByDelta.length - 1]?.delta < -0.01 
    ? sortedByDelta[sortedByDelta.length - 1] 
    : null;
  
  const averageAbsDelta = deltas.reduce((sum, d) => sum + Math.abs(d.delta), 0) / deltas.length;
  const unchangedCount = deltas.filter(d => Math.abs(d.delta) < 0.01).length;
  
  return {
    runA,
    runB,
    deltas,
    summary: {
      mostIncreased,
      mostDecreased,
      averageAbsDelta,
      unchangedCount,
    },
  };
};

/**
 * Interpret output value with semantic labels
 */
export const interpretOutput = (
  value: number,
  conceptLabel: string
): OutputInterpretation => {
  let label: string;
  let level: OutputInterpretation['level'];
  let color: string;
  
  if (value < 0.25) {
    level = 'low';
    label = 'Low';
    color = '#22c55e'; // green
  } else if (value < 0.5) {
    level = 'medium';
    label = 'Moderate';
    color = '#eab308'; // yellow
  } else if (value < 0.75) {
    level = 'high';
    label = 'High';
    color = '#f97316'; // orange
  } else {
    level = 'critical';
    label = 'Critical';
    color = '#ef4444'; // red
  }
  
  return {
    conceptId: '',
    value,
    label: `${label} (${(value * 100).toFixed(0)}%)`,
    level,
    color,
  };
};
