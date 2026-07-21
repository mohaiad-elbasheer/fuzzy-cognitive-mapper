import { describe, it, expect } from 'vitest';
import { findFeedbackLoops, checkModel } from './loops';
import { FCMNode, FCMEdge } from '../../types';

const node = (id: string): FCMNode => ({ id, label: id.toUpperCase(), activation: 0.5, initialActivation: 0.5 });
const edge = (source: string, target: string, weight: number): FCMEdge => ({
  id: `e${source}-${target}`, source, target, weight,
});

describe('findFeedbackLoops', () => {
  it('finds no loops in a DAG', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b', 0.5), edge('b', 'c', 0.5), edge('a', 'c', -0.3)];
    expect(findFeedbackLoops(nodes, edges)).toHaveLength(0);
  });

  it('classifies a two-node positive cycle as reinforcing', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b', 0.8), edge('b', 'a', 0.5)];
    const loops = findFeedbackLoops(nodes, edges);
    expect(loops).toHaveLength(1);
    expect(loops[0].type).toBe('reinforcing');
    expect(loops[0].strength).toBeCloseTo(0.4);
    expect(loops[0].nodeIds).toEqual(['a', 'b']);
  });

  it('classifies a cycle with one negative edge as balancing', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b', 0.8), edge('b', 'a', -0.5)];
    const loops = findFeedbackLoops(nodes, edges);
    expect(loops).toHaveLength(1);
    expect(loops[0].type).toBe('balancing');
  });

  it('two negative edges make a reinforcing loop', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b', -0.6), edge('b', 'a', -0.5)];
    expect(findFeedbackLoops(nodes, edges)[0].type).toBe('reinforcing');
  });

  it('counts self-loops as period-1 loops', () => {
    const nodes = [node('a')];
    const edges = [edge('a', 'a', -0.4)];
    const loops = findFeedbackLoops(nodes, edges);
    expect(loops).toHaveLength(1);
    expect(loops[0].nodeIds).toEqual(['a']);
    expect(loops[0].type).toBe('balancing');
  });

  it('finds each cycle exactly once regardless of rotation', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b', 0.5), edge('b', 'c', 0.5), edge('c', 'a', 0.5)];
    const loops = findFeedbackLoops(nodes, edges);
    expect(loops).toHaveLength(1);
    expect(loops[0].nodeIds).toHaveLength(3);
  });

  it('finds nested cycles separately and sorts by strength', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [
      edge('a', 'b', 0.9), edge('b', 'a', 0.9),           // strong 2-cycle
      edge('b', 'c', 0.2), edge('c', 'a', 0.2),           // weak 3-cycle via a→b→c→a
    ];
    const loops = findFeedbackLoops(nodes, edges);
    expect(loops).toHaveLength(2);
    expect(loops[0].strength).toBeGreaterThan(loops[1].strength);
  });

  it('ignores zero-weight edges', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b', 0.8), edge('b', 'a', 0)];
    expect(findFeedbackLoops(nodes, edges)).toHaveLength(0);
  });

  it('respects the loop cap', () => {
    // Complete graph on 6 nodes has many cycles; cap at 5
    const nodes = Array.from({ length: 6 }, (_, i) => node(`n${i}`));
    const edges: FCMEdge[] = [];
    for (const a of nodes) for (const b of nodes) {
      if (a.id !== b.id) edges.push(edge(a.id, b.id, 0.5));
    }
    expect(findFeedbackLoops(nodes, edges, 5)).toHaveLength(5);
  });
});

describe('checkModel', () => {
  it('flags isolated concepts', () => {
    const nodes = [node('a'), node('b'), node('lone')];
    const edges = [edge('a', 'b', 0.5)];
    const warnings = checkModel(nodes, edges);
    const isolated = warnings.find(w => w.kind === 'isolated');
    expect(isolated?.nodeIds).toEqual(['lone']);
  });

  it('flags duplicate edges and zero weights', () => {
    const nodes = [node('a'), node('b')];
    const edges = [
      { ...edge('a', 'b', 0.5), id: 'e1' },
      { ...edge('a', 'b', 0.2), id: 'e2' },
      { ...edge('b', 'a', 0), id: 'e3' },
    ];
    const kinds = checkModel(nodes, edges).map(w => w.kind);
    expect(kinds).toContain('duplicate-edge');
    expect(kinds).toContain('zero-weight');
  });

  it('notes active self-loops', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'a', 0.3), edge('a', 'b', 0.5)];
    expect(checkModel(nodes, edges).some(w => w.kind === 'self-loop')).toBe(true);
  });

  it('returns no warnings for a clean model', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b', 0.5), edge('b', 'a', -0.3)];
    expect(checkModel(nodes, edges)).toHaveLength(0);
  });
});
