import { afterEach, describe, expect, test } from 'bun:test';

import {
  animateQuote,
  QUOTE_CLOSE_DURATION_MS,
  QUOTE_OPEN_DURATION_MS,
} from '../src/modules/email/lib/email-quote-animation';

interface Call {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  animation: { cancel: () => void; onfinish: (() => void) | null; cancelled: boolean };
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

/** A quote whose `animate` records its calls instead of running them. */
function makeQuote(height = 120) {
  const quoted = document.createElement('div');
  quoted.hidden = true;
  Object.defineProperty(quoted, 'offsetHeight', {
    get: () => (quoted.hidden ? 0 : height),
  });
  const calls: Call[] = [];
  quoted.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = {
      cancelled: false,
      finished: Promise.resolve(),
      onfinish: null as (() => void) | null,
      cancel() {
        this.cancelled = true;
      },
    };
    calls.push({ keyframes, options, animation });
    return animation;
  }) as unknown as HTMLElement['animate'];
  return { quoted, calls };
}

function setReducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('reduce'),
  })) as unknown as typeof window.matchMedia;
}

describe('animateQuote', () => {
  test('opens with an elastic height and a jelly wobble, over 600ms', () => {
    setReducedMotion(false);
    const { quoted, calls } = makeQuote(120);

    animateQuote(quoted, true);

    expect(quoted.hidden).toBe(false);
    expect(calls).toHaveLength(2);
    const [height, jelly] = calls;
    expect(height.options.duration).toBe(QUOTE_OPEN_DURATION_MS);
    expect(height.keyframes.map((frame) => frame.height)).toEqual(['0px', '120px']);
    expect(jelly.options.duration).toBe(QUOTE_OPEN_DURATION_MS);
    expect(jelly.keyframes.some((frame) => String(frame.transform).includes('1.02'))).toBe(true);
  });

  test('keeps the quote on screen until the close animation finishes', () => {
    setReducedMotion(false);
    const { quoted, calls } = makeQuote(120);
    quoted.hidden = false;

    animateQuote(quoted, false);

    expect(quoted.hidden).toBe(false);
    const [close] = calls;
    expect(close.options.duration).toBe(QUOTE_CLOSE_DURATION_MS);
    expect(close.keyframes.map((frame) => frame.height)).toEqual(['120px', '0px']);

    close.animation.onfinish?.();
    expect(quoted.hidden).toBe(true);
  });

  test('reopening mid-close cancels the close so it never hides the quote', () => {
    setReducedMotion(false);
    const { quoted, calls } = makeQuote(120);
    quoted.hidden = false;

    animateQuote(quoted, false);
    const close = calls[0].animation;
    animateQuote(quoted, true);

    expect(close.cancelled).toBe(true);
    expect(quoted.hidden).toBe(false);
  });

  test('snaps without animating when the viewer prefers reduced motion', () => {
    setReducedMotion(true);
    const { quoted, calls } = makeQuote();

    animateQuote(quoted, true);
    expect(quoted.hidden).toBe(false);
    animateQuote(quoted, false);
    expect(quoted.hidden).toBe(true);
    expect(calls).toHaveLength(0);
  });
});
