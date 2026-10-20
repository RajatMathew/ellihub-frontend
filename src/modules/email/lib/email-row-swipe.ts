export type RowSwipeSnap = 'open' | 'closed';

// A deliberate drag past the reveal, not a graze — half the actions' width
// commits the drawer open even without a fast flick.
const COMMIT_FRACTION = 0.5;
// A fast flick commits regardless of how far the finger travelled, the way a
// real swipe-to-reveal list behaves elsewhere (Mail, Gmail).
const FLICK_VELOCITY_PX_PER_S = 500;

/**
 * Where the drawer settles once a drag ends: from the row's current x
 * position and release velocity, never from where the drag started. That
 * makes the decision read the same whether the drawer was opening for the
 * first time or already open and being nudged further — there is only ever
 * one "how far open is this, and how fast is it moving" question to answer.
 */
export function resolveRowSwipeSnap(
  x: number,
  velocityX: number,
  revealWidth: number
): RowSwipeSnap {
  if (revealWidth <= 0) return 'closed';
  if (velocityX <= -FLICK_VELOCITY_PX_PER_S) return 'open';
  if (velocityX >= FLICK_VELOCITY_PX_PER_S) return 'closed';
  return -x >= revealWidth * COMMIT_FRACTION ? 'open' : 'closed';
}

/** The x the row's draggable content animates to for a given snap state. */
export function rowSwipeTargetX(snap: RowSwipeSnap, revealWidth: number): number {
  return snap === 'open' ? -revealWidth : 0;
}

/**
 * How long a window the release velocity is measured over, matching how
 * `motion` derives its own — a single pair of samples is dominated by whatever
 * the last frame happened to catch.
 */
const VELOCITY_WINDOW_MS = 100;

interface RowSwipeSample {
  readonly x: number;
  readonly t: number;
}

/** The horizontal samples of a pointer gesture in progress, oldest first. */
export type RowSwipeGesture = readonly RowSwipeSample[];

/** Start recording at a press. */
export function beginRowSwipeGesture(x: number, t: number): RowSwipeGesture {
  return [{ x, t }];
}

/**
 * Add where the pointer is now, dropping samples older than the velocity
 * window but always keeping one baseline to measure against. A move with no
 * press recorded is not part of a gesture this row started.
 */
export function trackRowSwipeGesture(
  gesture: RowSwipeGesture | null,
  x: number,
  t: number
): RowSwipeGesture | null {
  if (!gesture) return null;
  const samples = [...gesture, { x, t }];
  const cutoff = t - VELOCITY_WINDOW_MS;
  let first = 0;
  while (first + 1 < samples.length && samples[first + 1]!.t < cutoff) first += 1;
  return samples.slice(first);
}

/** Release velocity in px/s, leftward negative — what `resolveRowSwipeSnap` reads. */
export function rowSwipeVelocityX(gesture: RowSwipeGesture | null): number {
  if (!gesture || gesture.length < 2) return 0;
  const first = gesture[0]!;
  const last = gesture[gesture.length - 1]!;
  const elapsed = last.t - first.t;
  if (elapsed <= 0) return 0;
  return ((last.x - first.x) / elapsed) * 1000;
}
