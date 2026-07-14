import { describe, it, expect } from 'vitest';
import {
  calculateCentrality,
  compareRuns,
  interpretOutput,
  SimulationRun,
  ConceptState,
  DEFAULT_SIMULATION_CONFIG,
} from './types';
import { FCMNode, FCMEdge } from '../../types';

const node = (id: string): FCMNode => ({
  id,
  label: id,
  activation: 0.5,
  initialActivation: 0.5,
});

const edge = (source: string, target: string, weight: number): FCMEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  weight,
});

const state = (id: string, activation: number): ConceptState => ({
  id,
  label: id,
  activation,
  initialActivation: 0.5,
});

const mockRun = (finalState: ConceptState[]): SimulationRun => ({
  id: `run_${Math.random()}`,
  name: 'test',
  createdAt: new Date().toISOString(),
  config: DEFAULT_SIMULATION_CONFIG,
  initialState: finalState.map(s => ({ ...s, activation: s.initialActivation })),
  history: [finalState],
  finalState,
  converged: true,
  iterations: 1,
});

describe('calculateCentrality', () => {
  it('computes degree centrality from absolute weights', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b', 0.8), edge('a', 'c', -0.5), edge('b', 'c', 0.3)];
    const { concepts } = calculateCentrality(nodes, edges);

    const a = concepts.find(c => c.id === 'a')!;
    expect(a.outDegree).toBeCloseTo(1.3);
    expect(a.inDegree).toBe(0);
    expect(a.totalCentrality).toBeCloseTo(1.3);
  });

  it('classifies transmitter, receiver, and isolated roles', () => {
    const nodes = [node('tx'), node('rx'), node('lone')];
    const edges = [edge('tx', 'rx', 1)];
    const { concepts } = calculateCentrality(nodes, edges);

    expect(concepts.find(c => c.id === 'tx')!.role).toBe('transmitter');
    expect(concepts.find(c => c.id === 'rx')!.role).toBe('receiver');
    expect(concepts.find(c => c.id === 'lone')!.role).toBe('isolated');
  });

  it('sorts concepts by total centrality descending', () => {
    const nodes = [node('minor'), node('other'), node('hub')];
    const edges = [edge('hub', 'minor', 1), edge('hub', 'other', 1), edge('minor', 'other', 0.1)];
    const { concepts } = calculateCentrality(nodes, edges);
    expect(concepts[0].id).toBe('hub');
  });
});

describe('compareRuns', () => {
  it('computes per-concept deltas between runs', () => {
    const runA = mockRun([state('a', 0.5), state('b', 0.8)]);
    const runB = mockRun([state('a', 0.7), state('b', 0.8)]);
    const result = compareRuns(runA, runB);

    const deltaA = result.deltas.find(d => d.id === 'a')!;
    expect(deltaA.delta).toBeCloseTo(0.2);
    expect(deltaA.percentChange).toBeCloseTo(40);

    const deltaB = result.deltas.find(d => d.id === 'b')!;
    expect(deltaB.delta).toBeCloseTo(0);
  });

  it('summarizes most increased/decreased and unchanged count', () => {
    const runA = mockRun([state('up', 0.2), state('down', 0.9), state('same', 0.5)]);
    const runB = mockRun([state('up', 0.6), state('down', 0.3), state('same', 0.5)]);
    const { summary } = compareRuns(runA, runB);

    expect(summary.mostIncreased?.id).toBe('up');
    expect(summary.mostDecreased?.id).toBe('down');
    expect(summary.unchangedCount).toBe(1);
    expect(summary.averageAbsDelta).toBeCloseTo((0.4 + 0.6 + 0) / 3);
  });

  it('reports no most-increased/decreased when runs are identical', () => {
    const runA = mockRun([state('a', 0.5)]);
    const runB = mockRun([state('a', 0.5)]);
    const { summary } = compareRuns(runA, runB);
    expect(summary.mostIncreased).toBeNull();
    expect(summary.mostDecreased).toBeNull();
  });
});

describe('interpretOutput', () => {
  it('maps value ranges to semantic levels', () => {
    expect(interpretOutput(0.1, 'x').level).toBe('low');
    expect(interpretOutput(0.3, 'x').level).toBe('medium');
    expect(interpretOutput(0.6, 'x').level).toBe('high');
    expect(interpretOutput(0.9, 'x').level).toBe('critical');
  });

  it('includes the percentage in the label', () => {
    expect(interpretOutput(0.42, 'x').label).toContain('42%');
  });
});
