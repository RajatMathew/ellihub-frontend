import { describe, expect, test } from 'bun:test';

import {
  beginRowSwipeGesture,
  resolveRowSwipeSnap,
  rowSwipeTargetX,
  rowSwipeVelocityX,
  trackRowSwipeGesture,
} from '../src/modules/email/lib/email-row-swipe';

/**
 * elli-ui#1073: swipe an email row to reveal Archive/Delete, the way
 * reactbits.dev/c/micro/swipe-row (and Mail, and Gmail) do it. These are the
 * rules for where the drawer settles once a drag ends.
 */
describe('resolveRowSwipeSnap', () => {
  const REVEAL = 160;

  test('a drag past half the reveal commits the drawer open', () => {
    expect(resolveRowSwipeSnap(-90, 0, REVEAL)).toBe('open');
  });

  test('a drag under half the reveal springs back closed', () => {
    expect(resolveRowSwipeSnap(-40, 0, REVEAL)).toBe('closed');
  });

  test('exactly half commits open — the boundary is inclusive', () => {
    expect(resolveRowSwipeSnap(-80, 0, REVEAL)).toBe('open');
  });

  test('a fast leftward flick opens even a short drag', () => {
    expect(resolveRowSwipeSnap(-20, -800, REVEAL)).toBe('open');
  });

  test('a fast rightward flick closes even while mostly revealed', () => {
    expect(resolveRowSwipeSnap(-140, 800, REVEAL)).toBe('closed');
  });

  test('a slow drag ignores velocity and falls back to distance', () => {
    expect(resolveRowSwipeSnap(-100, 50, REVEAL)).toBe('open');
    expect(resolveRowSwipeSnap(-30, -50, REVEAL)).toBe('closed');
  });

  test('nothing to reveal is always closed', () => {
    expect(resolveRowSwipeSnap(-50, -1000, 0)).toBe('closed');
  });

  test('dragged the wrong way (positive x) never reads as open', () => {
    expect(resolveRowSwipeSnap(20, 0, REVEAL)).toBe('closed');
  });
});

describe('rowSwipeTargetX', () => {
  test('open targets the full reveal width, negative', () => {
    expect(rowSwipeTargetX('open', 160)).toBe(-160);
  });

  test('closed always targets zero', () => {
    expect(rowSwipeTargetX('closed', 160)).toBe(0);
  });
});

/**
 * elli-ui#1073: the release velocity the row measures itself.
 *
 * It cannot use the one `motion` reports, because `onDragEnd` is dispatched
 * from `frame.postRender` and so lands *after* the click it is meant to judge.
 * `pointerup` is native and runs first, so the decision is taken there from
 * these samples.
 */
describe('rowSwipeVelocityX', () => {
  test('a leftward flick reads as negative px/s', () => {
    let gesture = trackRowSwipeGesture(beginRowSwipeGesture(300, 1000), 260, 1040);
    gesture = trackRowSwipeGesture(gesture, 220, 1080);
    expect(rowSwipeVelocityX(gesture)).toBeCloseTo(-1000, 5);
  });

  test('a rightward flick reads as positive px/s', () => {
    const gesture = trackRowSwipeGesture(beginRowSwipeGesture(100, 0), 150, 50);
    expect(rowSwipeVelocityX(gesture)).toBeCloseTo(1000, 5);
  });

  test('a press that never moved has no velocity', () => {
    expect(rowSwipeVelocityX(beginRowSwipeGesture(100, 0))).toBe(0);
  });

  test('no gesture at all has no velocity', () => {
    expect(rowSwipeVelocityX(null)).toBe(0);
  });

  test('two samples at the same instant do not divide by zero', () => {
    const gesture = trackRowSwipeGesture(beginRowSwipeGesture(100, 500), 180, 500);
    expect(rowSwipeVelocityX(gesture)).toBe(0);
  });

  test('a finger that rested before lifting is not given the whole gesture as speed', () => {
    // The window is what makes this right: the flick happened 800ms ago and
    // the finger then sat still, so the release is slow.
    let gesture = trackRowSwipeGesture(beginRowSwipeGesture(300, 0), 200, 100);
    gesture = trackRowSwipeGesture(gesture, 200, 900);
    expect(rowSwipeVelocityX(gesture)).toBe(0);
  });
});

describe('trackRowSwipeGesture', () => {
  test('a move with no press recorded stays null', () => {
    expect(trackRowSwipeGesture(null, 50, 10)).toBeNull();
  });

  test('drops samples the window has passed, but never the last baseline', () => {
    let gesture = trackRowSwipeGesture(beginRowSwipeGesture(0, 0), 10, 50);
    gesture = trackRowSwipeGesture(gesture, 20, 120);
    // Nothing is dropped yet: the 0ms sample is older than the 100ms window,
    // but the one after it is inside, so it is still the baseline to measure
    // from. Trimming every stale sample would leave nothing to subtract.
    expect(gesture).toHaveLength(3);

    gesture = trackRowSwipeGesture(gesture, 30, 200);
    // Now the 0ms sample has a successor that is itself stale, so it goes.
    expect(gesture).toHaveLength(3);
    expect(gesture?.[0]?.t).toBe(50);
  });
});

/**
 * The release decision itself is `resolveRowSwipeSnap`, above — the row asks it
 * the same question at `pointerup` that it used to ask only at `onDragEnd`.
 * That is the whole point: a gesture that does not leave the drawer open is a
 * tap, whatever distance the finger covered, and the browser's own tap slop
 * decides whether such a gesture produces a click at all.
 */
describe('resolveRowSwipeSnap as the release rule', () => {
  const REVEAL = 160;

  test('a tap that never moved the drawer is a release to closed', () => {
    expect(resolveRowSwipeSnap(0, 0, REVEAL)).toBe('closed');
  });

  test('a vertical thumb roll leaves x untouched, so it is still closed', () => {
    // `drag="x"` cannot move the drawer vertically. This is the gesture that
    // made the mailbox unopenable when it was judged on 2D travel instead.
    expect(resolveRowSwipeSnap(0, 0, REVEAL)).toBe('closed');
  });

  test('a tap beside an open drawer resolves open, so the click is swallowed', () => {
    expect(resolveRowSwipeSnap(-REVEAL, 0, REVEAL)).toBe('open');
  });
});
