/**
 * Monte Carlo uncertainty analysis.
 *
 * Expert-elicited FCM weights are rarely exact. Each edge can carry an
 * optional ± uncertainty; this module samples many weight matrices within
 * those bounds, runs the simulation for each, and summarizes the resulting
 * distribution of final activations per concept.
 */

import { FCMNode, FCMEdge, ActivationFunction, InferenceRule } from '../types';
import { runSimulation } from './fcmEngine';

export interface MonteCarloConfig {
  activationFunction: ActivationFunction;
  lambda: number;
  maxIterations: number;
  convergenceThreshold: number;
  inferenceRule?: InferenceRule;
  clampedNodeIds?: string[];
}

export interface MonteCarloOptions {
  samples: number;
  /** Seed for the RNG so analyses are reproducible. */
  seed?: number;
}

export interface ConceptDistribution {
  id: string;
  label: string;
  mean: number;
  min: number;
  max: number;
  p05: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
}

export interface MonteCarloResult {
  distributions: ConceptDistribution[];
  /** Fraction of sampled runs that converged. */
  convergedFraction: number;
  samples: number;
  seed: number;
}

/** Deterministic 32-bit RNG (mulberry32) so results are reproducible. */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * p;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
};

export const runMonteCarlo = (
  nodes: FCMNode[],
  edges: FCMEdge[],
  config: MonteCarloConfig,
  options: MonteCarloOptions
): MonteCarloResult => {
  const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rand = mulberry32(seed);
  const samples = Math.max(1, options.samples);

  const finals = new Map<string, number[]>(nodes.map(n => [n.id, []]));
  let convergedCount = 0;

  for (let s = 0; s < samples; s++) {
    // Sample each uncertain weight uniformly within [w−δ, w+δ] ∩ [−1, 1]
    const sampledEdges: FCMEdge[] = edges.map(e => {
      const delta = e.uncertainty ?? 0;
      if (delta === 0) return e;
      const w = e.weight + (rand() * 2 - 1) * delta;
      return { ...e, weight: Math.max(-1, Math.min(1, w)) };
    });

    const outcome = runSimulation(
      nodes,
      sampledEdges,
      config.activationFunction,
      config.lambda,
      config.maxIterations,
      config.convergenceThreshold,
      { clampedNodeIds: config.clampedNodeIds, inferenceRule: config.inferenceRule }
    );

    if (outcome.converged) convergedCount++;
    const final = outcome.steps[outcome.steps.length - 1];
    for (const node of nodes) {
      finals.get(node.id)!.push(final[node.id] ?? node.initialActivation);
    }
  }

  const distributions: ConceptDistribution[] = nodes.map(node => {
    const values = [...finals.get(node.id)!].sort((a, b) => a - b);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return {
      id: node.id,
      label: node.label,
      mean,
      min: values[0],
      max: values[values.length - 1],
      p05: percentile(values, 0.05),
      p25: percentile(values, 0.25),
      median: percentile(values, 0.5),
      p75: percentile(values, 0.75),
      p95: percentile(values, 0.95),
    };
  });

  return {
    distributions,
    convergedFraction: convergedCount / samples,
    samples,
    seed,
  };
};
