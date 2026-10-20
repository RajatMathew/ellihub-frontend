import { describe, expect, test } from 'bun:test';

import {
  DOT_MATRIX_PATTERNS,
  dotMatrixDelays,
  randomDotMatrixPattern,
} from '../src/app/lib/dot-matrix';

// elli-ui#817: dot-matrix loaders, a pattern picked at random for each one.

const grid = (values: Array<number | null>, size: number) =>
  Array.from({ length: size }, (_, row) => values.slice(row * size, row * size + size));

describe('every pattern', () => {
  for (const pattern of DOT_MATRIX_PATTERNS) {
    test(`${pattern}: one value per dot, each within the cycle`, () => {
      for (const size of [3, 5]) {
        const delays = dotMatrixDelays(pattern, size);
        expect(delays).toHaveLength(size * size);
        for (const delay of delays) {
          if (delay !== null) {
            expect(delay).toBeGreaterThanOrEqual(0);
            expect(delay).toBeLessThanOrEqual(1);
          }
        }
        // At least two moments, or nothing would appear to move.
        expect(new Set(delays.filter((delay) => delay !== null)).size).toBeGreaterThan(1);
      }
    });
  }
});

describe('the patterns move the way they are named', () => {
  test('spiral lights the border first and the centre last', () => {
    const delays = grid(dotMatrixDelays('spiral', 5), 5);
    expect(delays[0]![0]).toBe(0);
    expect(delays[2]![2]).toBe(1);
  });

  test('ripple lights the centre first, then rings outward', () => {
    const delays = grid(dotMatrixDelays('ripple', 5), 5);
    expect(delays[2]![2]).toBe(0);
    expect(delays[2]![3]).toBeLessThan(delays[2]![4]!);
    expect(delays[0]![0]).toBe(1);
  });

  test('scan sweeps row by row, wave corner to corner', () => {
    const scan = grid(dotMatrixDelays('scan', 5), 5);
    expect(scan[0]).toEqual([0, 0, 0, 0, 0]);
    const wave = grid(dotMatrixDelays('wave', 5), 5);
    expect(wave[0]![0]).toBe(0);
    expect(wave[4]![4]).toBe(1);
  });

  test('orbit runs round the border and leaves the middle dim', () => {
    const delays = grid(dotMatrixDelays('orbit', 5), 5);
    expect(delays[2]![2]).toBeNull();
    expect(delays[0]![0]).toBe(0);
    expect(delays[0]![4]).toBeLessThan(delays[4]![4]!);
  });
});

describe('picking a pattern', () => {
  test('covers every pattern across the range', () => {
    const picked = new Set(
      Array.from({ length: DOT_MATRIX_PATTERNS.length }, (_, step) =>
        randomDotMatrixPattern(() => (step + 0.5) / DOT_MATRIX_PATTERNS.length)
      )
    );
    expect(picked.size).toBe(DOT_MATRIX_PATTERNS.length);
  });

  test('stays in range at the edges', () => {
    expect(DOT_MATRIX_PATTERNS).toContain(randomDotMatrixPattern(() => 0));
    expect(DOT_MATRIX_PATTERNS).toContain(randomDotMatrixPattern(() => 0.9999));
  });
});
