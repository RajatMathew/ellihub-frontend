import { describe, expect, test } from 'bun:test';

import {
  isHorizontalDrag,
  resolveSwipeDirection,
} from '../src/modules/email/lib/email-swipe-navigation';

/**
 * elli-ui#1068: swipe between conversations on mobile, the way the Gmail app
 * does. The gesture shares a scroll container with vertical reading, so the
 * two checks here are what keeps it from misfiring on an ordinary scroll.
 */
describe('resolveSwipeDirection', () => {
  test('a clear left swipe reads as left', () => {
    expect(resolveSwipeDirection({ x: 300, y: 200 }, { x: 200, y: 205 }, 200)).toBe('left');
  });

  test('a clear right swipe reads as right', () => {
    expect(resolveSwipeDirection({ x: 100, y: 200 }, { x: 220, y: 195 }, 200)).toBe('right');
  });

  test('a vertical scroll is not a swipe', () => {
    expect(resolveSwipeDirection({ x: 200, y: 100 }, { x: 205, y: 400 }, 200)).toBeNull();
  });

  test('a diagonal drag that is more vertical than horizontal is not a swipe', () => {
    expect(resolveSwipeDirection({ x: 200, y: 100 }, { x: 260, y: 400 }, 200)).toBeNull();
  });

  test('a short drag under the distance floor is not a swipe', () => {
    expect(resolveSwipeDirection({ x: 200, y: 200 }, { x: 230, y: 200 }, 100)).toBeNull();
  });

  test('a tap is not a swipe', () => {
    expect(resolveSwipeDirection({ x: 200, y: 200 }, { x: 201, y: 199 }, 50)).toBeNull();
  });

  test('a slow drag past the duration cap is not a swipe, even if far enough', () => {
    expect(resolveSwipeDirection({ x: 300, y: 200 }, { x: 100, y: 200 }, 2000)).toBeNull();
  });
});

describe('isHorizontalDrag', () => {
  test('finger wobble on a straight scroll does not count as horizontal', () => {
    expect(isHorizontalDrag({ x: 200, y: 100 }, { x: 203, y: 160 })).toBe(false);
  });

  test('a real sideways drag counts as horizontal well before it becomes a swipe', () => {
    expect(isHorizontalDrag({ x: 200, y: 100 }, { x: 240, y: 105 })).toBe(true);
  });

  test('a diagonal drag that is mostly vertical is not horizontal', () => {
    expect(isHorizontalDrag({ x: 200, y: 100 }, { x: 230, y: 200 })).toBe(false);
  });
});
