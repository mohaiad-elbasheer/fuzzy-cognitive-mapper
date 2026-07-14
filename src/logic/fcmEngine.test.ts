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
    const { steps } = runSimulation([node('a', 0.3)], [], 'sigmoid', 1);
    expect(steps[0]).toEqual({ iteration: 0, a: 0.3 });
  });

  it('converges for a simple stable map and reports it', () => {
    const nodes = [node('a', 0.6), node('b', 0.4)];
    const edges = [edge('a', 'b', 0.8)];
    const outcome = runSimulation(nodes, edges, 'sigmoid', 1, 100, 0.001);

    expect(outcome.converged).toBe(true);
    // Stops well before maxIterations because the state stabilizes
    expect(outcome.iterations).toBeLessThan(100);
    expect(outcome.steps.length).toBe(outcome.iterations + 1);
    const last = outcome.steps[outcome.steps.length - 1];
    const prev = outcome.steps[outcome.steps.length - 2];
    expect(Math.abs(last.a - prev.a)).toBeLessThan(0.001);
    expect(Math.abs(last.b - prev.b)).toBeLessThan(0.001);
  });

  it('never exceeds maxIterations and reports non-convergence', () => {
    // Negative feedback loop that produces a period-8 limit cycle under
    // trivalent activation: the state never settles.
    const nodes = [node('a', 1), node('b', 0)];
    const edges = [edge('a', 'b', 1), edge('b', 'a', -1)];
    const outcome = runSimulation(nodes, edges, 'trivalent', 1, 10, 1e-9);
    expect(outcome.iterations).toBe(10);
    expect(outcome.steps.length).toBe(11);
    expect(outcome.converged).toBe(false);
  });

  it('a positive edge pushes the target above its no-input baseline', () => {
    const base = runSimulation([node('t', 0.5)], [], 'sigmoid', 1).steps;
    const boosted = runSimulation(
      [node('s', 1), node('t', 0.5)],
      [edge('s', 't', 1)],
      'sigmoid',
      1
    ).steps;
    const baseFinal = base[base.length - 1].t;
    const boostedFinal = boosted[boosted.length - 1].t;
    expect(boostedFinal).toBeGreaterThan(baseFinal);
  });

  it('a negative edge pushes the target below its no-input baseline', () => {
    const base = runSimulation([node('t', 0.5)], [], 'sigmoid', 1).steps;
    const inhibited = runSimulation(
      [node('s', 1), node('t', 0.5)],
      [edge('s', 't', -1)],
      'sigmoid',
      1
    ).steps;
    const baseFinal = base[base.length - 1].t;
    const inhibitedFinal = inhibited[inhibited.length - 1].t;
    expect(inhibitedFinal).toBeLessThan(baseFinal);
  });

  it('handles an empty graph', () => {
    const { steps, converged } = runSimulation([], [], 'sigmoid', 1);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps[0]).toEqual({ iteration: 0 });
    expect(converged).toBe(true);
  });

  it('tanh simulation can settle at negative activations', () => {
    const nodes = [node('s', 1), node('t', 0)];
    const edges = [edge('s', 't', -1)];
    const { steps } = runSimulation(nodes, edges, 'tanh', 2, 100, 0.0001);
    const final = steps[steps.length - 1];
    expect(final.t).toBeLessThan(0);
    expect(final.t).toBeGreaterThanOrEqual(-1);
  });
});

describe('scenario clamping', () => {
  it('holds clamped concepts at their initial activation', () => {
    const nodes = [node('driver', 0.9), node('outcome', 0.1)];
    const edges = [edge('outcome', 'driver', 1)]; // pressure that would move the driver
    const { steps } = runSimulation(nodes, edges, 'sigmoid', 1, 25, 0.001, {
      clampedNodeIds: ['driver'],
    });

    for (const step of steps) {
      expect(step.driver).toBe(0.9);
    }
  });

  it('unclamped concepts still respond to clamped inputs', () => {
    const nodes = [node('driver', 1), node('outcome', 0.5)];
    const edges = [edge('driver', 'outcome', 1)];
    const clampedRun = runSimulation(nodes, edges, 'sigmoid', 1, 50, 0.001, {
      clampedNodeIds: ['driver'],
    });
    const final = clampedRun.steps[clampedRun.steps.length - 1];
    expect(final.driver).toBe(1);
    expect(final.outcome).toBeGreaterThan(0.5);
  });
});

describe('limit cycle detection', () => {
  it('flags the trivalent negative-feedback oscillator as a limit cycle', () => {
    const nodes = [node('a', 1), node('b', 0)];
    const edges = [edge('a', 'b', 1), edge('b', 'a', -1)];
    // The trajectory repeats with period 8; run long enough to see 2+ cycles
    const outcome = runSimulation(nodes, edges, 'trivalent', 1, 40, 1e-9);

    expect(outcome.converged).toBe(false);
    expect(outcome.limitCycle).toBeDefined();
    expect(outcome.limitCycle!.period).toBe(8);
  });

  it('does not report a limit cycle for converged runs', () => {
    const outcome = runSimulation([node('a', 0.6)], [], 'sigmoid', 1, 100, 0.001);
    expect(outcome.converged).toBe(true);
    expect(outcome.limitCycle).toBeUndefined();
  });
});
