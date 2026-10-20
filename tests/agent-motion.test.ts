import {
  DURATION,
  enterTransition,
  exitTransition,
  fold,
  heightTransitionDuration,
  presenceFor,
  staggerDelay,
} from '@/mock/agent-motion';
import { describe, expect, test } from 'bun:test';

describe('staggerDelay', () => {
  test('the first item never waits', () => {
    expect(staggerDelay(0)).toBe(0);
  });

  test('each later item waits one step more', () => {
    expect(staggerDelay(1)).toBeCloseTo(0.04);
    expect(staggerDelay(3)).toBeCloseTo(0.12);
  });

  test('a long list caps the wait so its tail does not lag', () => {
    expect(staggerDelay(50)).toBeCloseTo(staggerDelay(5));
    expect(staggerDelay(50, { step: 0.05, max: 2 })).toBeCloseTo(0.1);
  });

  test('a nonsense index lands at once rather than producing NaN', () => {
    expect(staggerDelay(-3)).toBe(0);
    expect(staggerDelay(Number.NaN)).toBe(0);
  });
});

describe('heightTransitionDuration', () => {
  test('snaps when the height has not really changed', () => {
    expect(heightTransitionDuration(120, 120)).toBeNull();
    expect(heightTransitionDuration(120, 121)).toBeNull();
  });

  test('snaps for someone who asked for less motion', () => {
    expect(heightTransitionDuration(400, 40, true)).toBeNull();
  });

  test('snaps when either height is unknown', () => {
    expect(heightTransitionDuration(Number.NaN, 40)).toBeNull();
    expect(heightTransitionDuration(40, Number.POSITIVE_INFINITY)).toBeNull();
  });

  test('a card folding to a chip takes longer than a row appearing, both under 300ms', () => {
    const row = heightTransitionDuration(0, 24);
    const card = heightTransitionDuration(360, 36);
    expect(row).not.toBeNull();
    expect(card).not.toBeNull();
    expect(card!).toBeGreaterThan(row!);
    expect(card!).toBeLessThanOrEqual(0.3);
    expect(row!).toBeGreaterThanOrEqual(0.18);
  });

  test('is symmetric — growing and shrinking by the same amount take as long', () => {
    expect(heightTransitionDuration(40, 240)).toBe(heightTransitionDuration(240, 40));
  });

  test('very tall content does not stretch the glide past its ceiling', () => {
    expect(heightTransitionDuration(0, 5000)).toBe(heightTransitionDuration(0, 400));
  });
});

describe('presenceFor', () => {
  const preset = {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto', transition: enterTransition },
    exit: { opacity: 0, height: 0, transition: exitTransition },
  };

  test('leaves the preset alone when motion is fine', () => {
    expect(presenceFor(preset, false)).toBe(preset);
  });

  test('reduced motion appears settled and leaves instantly', () => {
    const reduced = presenceFor(preset, true);
    expect(reduced.initial).toBe(false as unknown as typeof preset.initial);
    expect(reduced.exit).toEqual({ opacity: 0, height: 0, transition: { duration: 0 } });
    expect(reduced.animate).toBe(preset.animate);
  });

  test('does not mutate the shared preset', () => {
    presenceFor(preset, true);
    expect(preset.exit.transition).toBe(exitTransition);
    expect(preset.initial).toEqual({ opacity: 0, height: 0 });
  });
});

describe('motion vocabulary', () => {
  test('entering is never slower than 300ms and leaving is faster than entering', () => {
    expect(enterTransition.duration).toBeLessThanOrEqual(0.3);
    expect(exitTransition.duration).toBeLessThan(enterTransition.duration);
    expect(DURATION.micro).toBeLessThan(DURATION.short);
  });
});

describe('fold', () => {
  test('a live rail folding away is slower than a click-to-open reveal (elli-ui#1482)', () => {
    expect(fold.exit.transition.height.duration).toBeGreaterThan(DURATION.medium);
    expect(fold.animate.transition.height.duration).toBeGreaterThan(DURATION.medium);
    expect(fold.exit.transition.height.duration).toBeLessThanOrEqual(0.5);
  });

  test('the content fades out before the box finishes collapsing', () => {
    expect(fold.exit.transition.opacity.duration).toBeLessThan(
      fold.exit.transition.height.duration
    );
  });

  test('the content fades in only after the box has begun to open', () => {
    expect(fold.animate.transition.opacity.delay).toBeGreaterThan(0);
  });
});
