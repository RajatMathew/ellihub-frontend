export interface SwipePoint {
  x: number;
  y: number;
}

export type SwipeDirection = 'left' | 'right';

// A flick, not a scroll: far enough to be deliberate, quick enough that it
// reads as a gesture rather than a slow drag.
export const SWIPE_MIN_DISTANCE_PX = 60;
export const SWIPE_MAX_DURATION_MS = 600;
// How much more horizontal than vertical movement a drag needs before it
// counts as "sideways" at all, on top of the distance/time gates above.
const SWIPE_DIRECTION_RATIO = 1.5;
// Below this, a straight-down scroll still measures a few horizontal pixels
// of finger wobble; treating that as "sideways" would fire on every scroll.
const HORIZONTAL_DRAG_MIN_PX = 10;

/**
 * Whether an in-progress touch drag has gone sideways enough that the pane
 * should take over from the browser's vertical scroll.
 *
 * Checked on every touchmove rather than only at the end, because scrolling
 * has to be suppressed with `preventDefault` *during* the gesture — deciding
 * only on touchend is too late, the page has already scrolled.
 */
export function isHorizontalDrag(start: SwipePoint, current: SwipePoint): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return (
    Math.abs(dx) > HORIZONTAL_DRAG_MIN_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_DIRECTION_RATIO
  );
}

/**
 * Whether a finished gesture is a deliberate horizontal swipe, and which way.
 * `null` covers everything that is not one: too short, too slow, or too
 * diagonal — a page-down scroll or a tap must never read as "next email".
 */
export function resolveSwipeDirection(
  start: SwipePoint,
  end: SwipePoint,
  elapsedMs: number
): SwipeDirection | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);

  if (absDx < SWIPE_MIN_DISTANCE_PX) return null;
  if (elapsedMs > SWIPE_MAX_DURATION_MS) return null;
  if (absDx < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return null;

  return dx < 0 ? 'left' : 'right';
}
