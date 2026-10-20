/**
 * The shake a field gives when what was typed into it is refused.
 *
 * Four legs out and back — right, left, a smaller right, home — each on its
 * own ease-out curve, so the field settles rather than bounces: 6px out, a 4px
 * overshoot, 80ms / 80ms / 60ms / 60ms (transitions.dev's "error state shake";
 * its keyframe stops, 28.57% / 57.14% / 78.57%, are what these legs give).
 * The colour of the error is the theme's, not this file's: pair the shake with
 * `aria-invalid` on the field, which inputs already paint in `destructive`.
 *
 * Played through the Web Animations API rather than a CSS class. A class has
 * to leave the element and come back to replay, and React re-renders a field's
 * classes at the moment an error lands (a save finishing, the field enabling),
 * which would cut the shake short.
 */

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DISTANCE_PX = 6;
const OVERSHOOT_PX = 4;

/** Each leg's duration and where it ends up. */
const LEGS = [
  { ms: 80, x: DISTANCE_PX },
  { ms: 80, x: -DISTANCE_PX },
  { ms: 60, x: OVERSHOOT_PX },
  { ms: 60, x: 0 },
] as const;

export const ERROR_SHAKE_DURATION_MS = LEGS.reduce((total, leg) => total + leg.ms, 0);

/** The legs as keyframes, each offset at its cumulative share of the whole. */
export const ERROR_SHAKE_KEYFRAMES: Keyframe[] = (() => {
  const keyframes: Keyframe[] = [{ offset: 0, transform: 'translateX(0)', easing: EASE_OUT }];
  let elapsed = 0;

  for (const [index, leg] of LEGS.entries()) {
    elapsed += leg.ms;
    const isLast = index === LEGS.length - 1;
    keyframes.push({
      offset: elapsed / ERROR_SHAKE_DURATION_MS,
      transform: `translateX(${leg.x}px)`,
      ...(isLast ? {} : { easing: EASE_OUT }),
    });
  }

  return keyframes;
})();

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Shakes the element once. Calling it again while it shakes starts over.
 * Does nothing for someone who has asked for less motion — the field's error
 * colour still says what happened.
 */
export function shakeElement(element: Element | null | undefined): void {
  if (!element || typeof element.animate !== 'function' || prefersReducedMotion()) return;

  element.animate(ERROR_SHAKE_KEYFRAMES, {
    duration: ERROR_SHAKE_DURATION_MS,
    // Per-keyframe easing does the shaping; the whole runs linearly across them.
    easing: 'linear',
  });
}
