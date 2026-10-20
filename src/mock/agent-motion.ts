/**
 * Elliot's motion vocabulary (elli-ui#649) — one place for the curves and
 * timings the chat area uses, so a step settling, a card collapsing and a
 * reply fading in all move the same way.
 *
 * Enter decelerates, exit accelerates, and nothing interactive runs past
 * ~300ms. Every value here is consumed under `MotionConfig reducedMotion="user"`
 * or behind an explicit reduced-motion check.
 */

/** Strong ease-out: quick start, long soft landing. For things arriving. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Ease-in for things leaving — they get out of the way fast. */
export const EASE_IN = [0.4, 0, 1, 1] as const;
/** For something already on screen changing size or place. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  /** Icon swaps, label crossfades. */
  micro: 0.14,
  /** Small elements entering. */
  short: 0.2,
  /** Blocks and cards entering. */
  medium: 0.26,
  /**
   * A large block on screen folding away or growing in on its own — not in
   * answer to a click, so it can take long enough for the eye to follow.
   */
  fold: 0.46,
} as const;

export const enterTransition = { duration: DURATION.medium, ease: EASE_OUT } as const;
export const exitTransition = { duration: DURATION.micro, ease: EASE_IN } as const;

/** Opens downward from nothing, so whatever is below is pushed, not jumped. */
export const reveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: enterTransition },
  exit: { opacity: 0, height: 0, transition: { ...exitTransition, duration: DURATION.short } },
};

const foldHeight = { duration: DURATION.fold, ease: EASE_IN_OUT } as const;

/**
 * For a block that changes on its own while the reader watches — a live step
 * rail growing in, then folding into its summary (elli-ui#1482). The height
 * eases both ways, slower than `reveal`; the content fades out ahead of the
 * collapse and in behind the growth, so nothing is clipped mid-fade.
 */
export const fold = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: foldHeight,
      opacity: { duration: DURATION.medium, ease: EASE_OUT, delay: DURATION.fold / 3 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { height: foldHeight, opacity: { duration: DURATION.short, ease: EASE_IN } },
  },
};

/**
 * Delay for the `index`th item of a list that cascades in. Capped so a long
 * list never makes the reader wait for its tail — past `max` items, the rest
 * land together.
 */
export function staggerDelay(index: number, { step = 0.04, max = 5 } = {}): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(Math.floor(index), max) * step;
}

/** Below this many pixels a height change is not worth animating. */
const MIN_HEIGHT_DELTA = 2;

/**
 * How long a container should take to grow or shrink from `from` to `to`
 * pixels, or `null` when it should just snap (no real change, or the reader
 * asked for less motion). Larger moves get a little longer, so a card folding
 * to a chip and a row appearing feel equally quick.
 */
export function heightTransitionDuration(
  from: number,
  to: number,
  reduceMotion = false
): number | null {
  if (reduceMotion) return null;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  const delta = Math.abs(to - from);
  if (delta < MIN_HEIGHT_DELTA) return null;
  const seconds = 0.18 + (Math.min(delta, 400) / 400) * 0.1;
  return Math.round(seconds * 1000) / 1000;
}

type PresencePreset = {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
};

/**
 * A presence preset with the motion taken out, for someone who has asked for
 * less of it. `MotionConfig reducedMotion="user"` only drops transforms, so a
 * height or opacity reveal would still play; this makes the element simply
 * appear in its settled state and leave at once.
 */
export function presenceFor<T extends PresencePreset>(preset: T, reduceMotion: boolean): T {
  if (!reduceMotion) return preset;
  const exit =
    preset.exit && typeof preset.exit === 'object'
      ? { ...preset.exit, transition: { duration: 0 } }
      : preset.exit;
  return { ...preset, initial: false, exit } as T;
}
