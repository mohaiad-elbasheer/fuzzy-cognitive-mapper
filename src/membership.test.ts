import { describe, it, expect } from 'vitest';
import { calculateMembership, LINGUISTIC_SCALE_PRESETS } from './types';

const terms = LINGUISTIC_SCALE_PRESETS['5-point']; // -1, -0.5, 0, 0.5, 1

describe('calculateMembership', () => {
  describe('triangular', () => {
    it('peaks at 1 on the term value', () => {
      expect(calculateMembership(0, 0, terms, 'triangular')).toBe(1);
      expect(calculateMembership(0.5, 0.5, terms, 'triangular')).toBe(1);
    });

    it('is 0 at and beyond the neighboring term values', () => {
      expect(calculateMembership(-0.5, 0, terms, 'triangular')).toBe(0);
      expect(calculateMembership(0.5, 0, terms, 'triangular')).toBe(0);
      expect(calculateMembership(1, 0, terms, 'triangular')).toBe(0);
    });

    it('interpolates linearly between neighbors', () => {
      expect(calculateMembership(0.25, 0, terms, 'triangular')).toBeCloseTo(0.5);
      expect(calculateMembership(-0.25, 0, terms, 'triangular')).toBeCloseTo(0.5);
    });
  });

  describe('trapezoidal', () => {
    it('is 1 across the plateau around the term value', () => {
      expect(calculateMembership(0, 0, terms, 'trapezoidal')).toBe(1);
      expect(calculateMembership(0.05, 0, terms, 'trapezoidal')).toBe(1);
    });

    it('is 0 at the neighboring term values', () => {
      expect(calculateMembership(0.5, 0, terms, 'trapezoidal')).toBe(0);
      expect(calculateMembership(-0.5, 0, terms, 'trapezoidal')).toBe(0);
    });
  });

  describe('gaussian', () => {
    it('peaks at 1 on the term value and decays symmetrically', () => {
      expect(calculateMembership(0, 0, terms, 'gaussian')).toBe(1);
      const left = calculateMembership(-0.2, 0, terms, 'gaussian');
      const right = calculateMembership(0.2, 0, terms, 'gaussian');
      expect(left).toBeCloseTo(right);
      expect(left).toBeGreaterThan(0);
      expect(left).toBeLessThan(1);
    });

    it('decays monotonically away from the peak', () => {
      const near = calculateMembership(0.1, 0, terms, 'gaussian');
      const far = calculateMembership(0.4, 0, terms, 'gaussian');
      expect(near).toBeGreaterThan(far);
    });
  });
});
