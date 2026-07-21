import { describe, it, expect } from 'vitest';
import { SAMPLE_MODELS } from './samples';
import { runSimulation } from '../logic/fcmEngine';
import { FCMNode, FCMEdge } from '../types';

/**
 * Benchmark tests: the bundled sample models act as regression fixtures.
 * If an engine change alters these converged values, the change is either
 * a bug or an intentional semantic change that must be reviewed.
 */
describe('sample model benchmarks (sigmoid, modified-kosko, λ=1)', () => {
  const runSample = (sampleId: string) => {
    const sample = SAMPLE_MODELS.find(s => s.id === sampleId)!;
    const nodes: FCMNode[] = sample.nodes.map(n => ({
      id: n.id, label: n.label, activation: n.initialActivation, initialActivation: n.initialActivation,
    }));
    const edges: FCMEdge[] = sample.edges.map(e => ({
      id: `e${e.source}-${e.target}`, source: e.source, target: e.target, weight: e.weight,
    }));
    return runSimulation(nodes, edges, 'sigmoid', 1, 100, 0.001);
  };

  it('every sample converges under default settings', () => {
    for (const sample of SAMPLE_MODELS) {
      const outcome = runSample(sample.id);
      expect(outcome.converged, `${sample.name} should converge`).toBe(true);
    }
  });

  it('urban sustainability reaches its known fixed point', () => {
    const outcome = runSample('sustainability');
    const final = outcome.steps[outcome.steps.length - 1];
    // Expected values cross-validated against an independent Python
    // implementation of the modified-Kosko rule (agreement to 4 decimals).
    expect(final.s2).toBeCloseTo(0.6775, 3); // Air Pollution
    expect(final.s6).toBeCloseTo(0.8233, 3); // Quality of Life
  });

  it('project risk reaches its known fixed point', () => {
    const outcome = runSample('project-risk');
    const final = outcome.steps[outcome.steps.length - 1];
    expect(final.p4).toBeCloseTo(0.7009, 3); // Defect Rate
    expect(final.p6).toBeCloseTo(0.5864, 3); // Delivery Confidence
  });
});
