import { afterEach, describe, expect, mock, test } from 'bun:test';

import {
  ERROR_SHAKE_DURATION_MS,
  ERROR_SHAKE_KEYFRAMES,
  shakeElement,
} from '../src/app/lib/error-shake';

/**
 * The shake a refused field gives (transitions.dev's "error state shake"):
 * 6px right, 6px left, a 4px overshoot, home — 80, 80, 60 and 60ms, each leg
 * eased out on its own curve.
 */

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const originalMatchMedia = window.matchMedia;

function prefersReducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: reduced && query.includes('reduce'),
    }) as MediaQueryList) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('the error shake', () => {
  test('runs 280ms, four legs out and home', () => {
    expect(ERROR_SHAKE_DURATION_MS).toBe(280);
    expect(ERROR_SHAKE_KEYFRAMES.map((frame) => frame.transform)).toEqual([
      'translateX(0)',
      'translateX(6px)',
      'translateX(-6px)',
      'translateX(4px)',
      'translateX(0px)',
    ]);
  });

  test('stops where the reference does: 28.57%, 57.14%, 78.57%', () => {
    const offsets = ERROR_SHAKE_KEYFRAMES.map((frame) => Number(frame.offset?.toFixed(4)));
    expect(offsets).toEqual([0, 0.2857, 0.5714, 0.7857, 1]);
  });

  test('eases every leg out on the same curve', () => {
    expect(ERROR_SHAKE_KEYFRAMES.slice(0, -1).every((frame) => frame.easing === EASE_OUT)).toBe(
      true
    );
  });

  test('plays on the element', () => {
    prefersReducedMotion(false);
    const animate = mock(() => ({}) as Animation);

    shakeElement({ animate } as unknown as Element);

    expect(animate).toHaveBeenCalledWith(ERROR_SHAKE_KEYFRAMES, {
      duration: 280,
      easing: 'linear',
    });
  });

  test('stays still for someone who has asked for less motion', () => {
    prefersReducedMotion(true);
    const animate = mock(() => ({}) as Animation);

    shakeElement({ animate } as unknown as Element);

    expect(animate).not.toHaveBeenCalled();
  });

  test('does nothing without an element to shake', () => {
    expect(() => shakeElement(null)).not.toThrow();
  });
});
