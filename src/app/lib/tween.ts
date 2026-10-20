/**
 * A tiny requestAnimationFrame tweener — the slice of `motion`'s MotionValue that
 * an SVG glyph needs, so a component can animate attributes without pulling the
 * library in. `StatusMark` is the user.
 */

export type Ease = (t: number) => number;

export interface TweenOptions {
  /** Seconds. */
  duration: number;
  ease: Ease;
  /** Loop forever from `from` to `to`. */
  repeat?: boolean;
}

export const linear: Ease = (t) => t;

/** A CSS `cubic-bezier(x1, y1, x2, y2)` timing function. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= err / slope;
    }
    // Newton stalled on a flat stretch of the curve — bisect instead.
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sampleX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** (1 + W)e^-W ≈ 0.001: the spring has settled to 0.1% by the end of its duration. */
const W = 9.23;
const SPRING_END = 1 - (1 + W) * Math.exp(-W);

/**
 * A critically damped spring — `motion`'s `{ type: 'spring', bounce: 0 }` —
 * normalised to land exactly on 1. Unlike motion's it starts from rest when
 * interrupted rather than carrying the old velocity over.
 */
export const criticalSpring: Ease = (t) => (1 - (1 + W * t) * Math.exp(-W * t)) / SPRING_END;

/** A number that animates towards a target and tells its listeners each frame. */
export class AnimValue {
  private value: number;
  private frame = 0;
  private listeners = new Set<(v: number) => void>();

  constructor(initial: number) {
    this.value = initial;
  }

  get() {
    return this.value;
  }

  /** Returns the unsubscribe. */
  onChange(fn: (v: number) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  /** Sets the value at once, cancelling any tween in flight. */
  jump(v: number) {
    this.stop();
    this.write(v);
  }

  /**
   * Tweens to `to`, superseding any tween in flight. Resolves when it lands;
   * never resolves if it is stopped or superseded first.
   */
  animate(to: number, { duration, ease, repeat }: TweenOptions, from = this.value) {
    this.stop();
    return new Promise<void>((resolve) => {
      const ms = duration * 1000;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = ms <= 0 ? 1 : repeat ? (elapsed % ms) / ms : Math.min(1, elapsed / ms);
        this.write(from + (to - from) * ease(t));
        if (!repeat && t >= 1) {
          this.frame = 0;
          resolve();
          return;
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  private write(v: number) {
    this.value = v;
    this.listeners.forEach((fn) => fn(v));
  }
}
