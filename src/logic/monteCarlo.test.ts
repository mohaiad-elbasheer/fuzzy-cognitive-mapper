import { describe, it, expect } from 'vitest';
import { runMonteCarlo, mulberry32 } from './monteCarlo';
import { runSimulation } from './fcmEngine';
import { FCMNode, FCMEdge } from '../types';

const node = (id: string, initialActivation: number): FCMNode => ({
  id, label: id, activation: initialActivation, initialActivation,
});
const edge = (source: string, target: string, weight: number, uncertainty = 0): FCMEdge => ({
  id: `e${source}-${target}`, source, target, weight, uncertainty,
});

const CONFIG = {
  activationFunction: 'sigmoid' as const,
  lambda: 1,
  maxIterations: 50,
  convergenceThreshold: 0.001,
};

describe('mulberry32', () => {
  it('is deterministic for a given seed and uniform-ish in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
    expect(seqA.every(v => v >= 0 && v < 1)).toBe(true);
  });
});

describe('runMonteCarlo', () => {
  const nodes = [node('a', 0.6), node('b', 0.4)];

  it('collapses to the deterministic run when no edge has uncertainty', () => {
    const edges = [edge('a', 'b', 0.8)];
    const mc = runMonteCarlo(nodes, edges, CONFIG, { samples: 20, seed: 1 });
    const single = runSimulation(nodes, edges, CONFIG.activationFunction, CONFIG.lambda, CONFIG.maxIterations, CONFIG.convergenceThreshold);
    const expected = single.steps[single.steps.length - 1];

    for (const dist of mc.distributions) {
      expect(dist.min).toBeCloseTo(expected[dist.id], 10);
      expect(dist.max).toBeCloseTo(expected[dist.id], 10);
      expect(dist.median).toBeCloseTo(expected[dist.id], 10);
    }
    expect(mc.convergedFraction).toBe(1);
  });

  it('produces ordered percentiles and spread under uncertainty', () => {
    const edges = [edge('a', 'b', 0.5, 0.4)];
    const mc = runMonteCarlo(nodes, edges, CONFIG, { samples: 200, seed: 7 });
    const b = mc.distributions.find(d => d.id === 'b')!;

    expect(b.min).toBeLessThanOrEqual(b.p05);
    expect(b.p05).toBeLessThanOrEqual(b.p25);
    expect(b.p25).toBeLessThanOrEqual(b.median);
    expect(b.median).toBeLessThanOrEqual(b.p75);
    expect(b.p75).toBeLessThanOrEqual(b.p95);
    expect(b.p95).toBeLessThanOrEqual(b.max);
    expect(b.max - b.min).toBeGreaterThan(0); // uncertainty produced spread
  });

  it('is reproducible for the same seed and differs across seeds', () => {
    const edges = [edge('a', 'b', 0.5, 0.3)];
    const r1 = runMonteCarlo(nodes, edges, CONFIG, { samples: 50, seed: 11 });
    const r2 = runMonteCarlo(nodes, edges, CONFIG, { samples: 50, seed: 11 });
    const r3 = runMonteCarlo(nodes, edges, CONFIG, { samples: 50, seed: 12 });
    expect(r1.distributions).toEqual(r2.distributions);
    expect(r1.distributions).not.toEqual(r3.distributions);
  });

  it('honors clamps: clamped concepts show zero spread', () => {
    const edges = [edge('a', 'b', 0.5, 0.4), edge('b', 'a', 0.5, 0.4)];
    const mc = runMonteCarlo(nodes, edges, { ...CONFIG, clampedNodeIds: ['a'] }, { samples: 50, seed: 3 });
    const a = mc.distributions.find(d => d.id === 'a')!;
    expect(a.min).toBe(0.6);
    expect(a.max).toBe(0.6);
  });

  it('sampled weights stay within [-1, 1]', () => {
    // weight 0.9 with ±0.5 would exceed 1 without clamping; b's final value
    // must never exceed the value produced by weight exactly 1
    const hot = [edge('a', 'b', 0.9, 0.5)];
    const mc = runMonteCarlo(nodes, hot, CONFIG, { samples: 100, seed: 5 });
    const capped = runSimulation(nodes, [edge('a', 'b', 1)], CONFIG.activationFunction, CONFIG.lambda, CONFIG.maxIterations, CONFIG.convergenceThreshold);
    const cappedFinal = capped.steps[capped.steps.length - 1].b;
    expect(mc.distributions.find(d => d.id === 'b')!.max).toBeLessThanOrEqual(cappedFinal + 1e-9);
  });
});
