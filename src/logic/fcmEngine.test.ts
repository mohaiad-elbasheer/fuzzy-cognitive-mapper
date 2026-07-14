import { describe, it, expect } from 'vitest';
import { getActivationFunction, runSimulation } from './fcmEngine';
import { FCMNode, FCMEdge } from '../types';

const node = (id: string, initialActivation: number): FCMNode => ({
  id,
  label: id,
  activation: initialActivation,
  initialActivation,
});

const edge = (source: string, target: string, weight: number): FCMEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  weight,
});

describe('activation functions', () => {
  it('sigmoid is 0.5 at x=0 and bounded in (0,1)', () => {
    const sigmoid = getActivationFunction('sigmoid');
    expect(sigmoid(0, 1)).toBeCloseTo(0.5);
    expect(sigmoid(100, 1)).toBeLessThanOrEqual(1);
    expect(sigmoid(-100, 1)).toBeGreaterThanOrEqual(0);
    expect(sigmoid(100, 1)).toBeGreaterThan(0.99);
    expect(sigmoid(-100, 1)).toBeLessThan(0.01);
  });

  it('sigmoid steepness increases with lambda', () => {
    const sigmoid = getActivationFunction('sigmoid');
    expect(sigmoid(1, 5)).toBeGreaterThan(sigmoid(1, 1));
  });

  it('tanh is 0 at x=0 and bounded in (-1,1)', () => {
    const tanh = getActivationFunction('tanh');
    expect(tanh(0, 1)).toBe(0);
    expect(tanh(100, 1)).toBeLessThanOrEqual(1);
    expect(tanh(-100, 1)).toBeGreaterThanOrEqual(-1);
    expect(tanh(-1, 1)).toBeCloseTo(-Math.tanh(1));
  });

  it('bivalent maps to {0,1}', () => {
    const bivalent = getActivationFunction('bivalent');
    expect(bivalent(0.1, 1)).toBe(1);
    expect(bivalent(0, 1)).toBe(0);
    expect(bivalent(-0.1, 1)).toBe(0);
  });

  it('trivalent maps to {-1,0,1} with ±0.5 thresholds', () => {
    const trivalent = getActivationFunction('trivalent');
    expect(trivalent(0.6, 1)).toBe(1);
    expect(trivalent(0.5, 1)).toBe(0);
    expect(trivalent(-0.5, 1)).toBe(0);
    expect(trivalent(-0.6, 1)).toBe(-1);
  });

  it('linear scales by lambda and clamps to [0,1]', () => {
    const linear = getActivationFunction('linear');
    expect(linear(0.4, 1)).toBeCloseTo(0.4);
    expect(linear(0.4, 2)).toBeCloseTo(0.8);
    expect(linear(5, 1)).toBe(1);
    expect(linear(-5, 1)).toBe(0);
  });

  it('falls back to sigmoid for unknown activation names', () => {
    const fn = getActivationFunction('unknown' as never);
    expect(fn(0, 1)).toBeCloseTo(0.5);
  });
});

describe('runSimulation', () => {
  it('records the initial state as iteration 0', () => {
    const results = runSimulation([node('a', 0.3)], [], 'sigmoid', 1);
    expect(results[0]).toEqual({ iteration: 0, a: 0.3 });
  });

  it('converges for a simple stable map', () => {
    const nodes = [node('a', 0.6), node('b', 0.4)];
    const edges = [edge('a', 'b', 0.8)];
    const results = runSimulation(nodes, edges, 'sigmoid', 1, 100, 0.001);

    // Stops well before maxIterations because the state stabilizes
    expect(results.length).toBeLessThan(101);
    const last = results[results.length - 1];
    const prev = results[results.length - 2];
    expect(Math.abs(last.a - prev.a)).toBeLessThan(0.001);
    expect(Math.abs(last.b - prev.b)).toBeLessThan(0.001);
  });

  it('never exceeds maxIterations', () => {
    const nodes = [node('a', 0.9), node('b', 0.1)];
    // Strong negative feedback loop that oscillates under trivalent
    const edges = [edge('a', 'b', -1), edge('b', 'a', -1)];
    const results = runSimulation(nodes, edges, 'trivalent', 1, 10, 1e-9);
    // results = initial state + at most maxIterations updates
    expect(results.length).toBeLessThanOrEqual(11);
  });

  it('a positive edge pushes the target above its no-input baseline', () => {
    const base = runSimulation([node('t', 0.5)], [], 'sigmoid', 1);
    const boosted = runSimulation(
      [node('s', 1), node('t', 0.5)],
      [edge('s', 't', 1)],
      'sigmoid',
      1
    );
    const baseFinal = base[base.length - 1].t;
    const boostedFinal = boosted[boosted.length - 1].t;
    expect(boostedFinal).toBeGreaterThan(baseFinal);
  });

  it('a negative edge pushes the target below its no-input baseline', () => {
    const base = runSimulation([node('t', 0.5)], [], 'sigmoid', 1);
    const inhibited = runSimulation(
      [node('s', 1), node('t', 0.5)],
      [edge('s', 't', -1)],
      'sigmoid',
      1
    );
    const baseFinal = base[base.length - 1].t;
    const inhibitedFinal = inhibited[inhibited.length - 1].t;
    expect(inhibitedFinal).toBeLessThan(baseFinal);
  });

  it('handles an empty graph', () => {
    const results = runSimulation([], [], 'sigmoid', 1);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toEqual({ iteration: 0 });
  });

  it('tanh simulation can settle at negative activations', () => {
    const nodes = [node('s', 1), node('t', 0)];
    const edges = [edge('s', 't', -1)];
    const results = runSimulation(nodes, edges, 'tanh', 2, 100, 0.0001);
    const final = results[results.length - 1];
    expect(final.t).toBeLessThan(0);
    expect(final.t).toBeGreaterThanOrEqual(-1);
  });
});
