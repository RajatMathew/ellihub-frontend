/**
 * The geometry behind `StatusMark` (`@/app/components/status-mark`), kept pure
 * so it can be tested without a renderer.
 */

export type StatusMarkStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

/** Share of each idle dash period that is drawn; the rest is gap. */
export const IDLE_DASH = 0.3;

const SPOKEN: Record<StatusMarkStatus, string> = {
  pending: 'Pending',
  running: 'In progress',
  done: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Ring radius, circumference and idle dash period inside the 24-unit viewBox. */
export function ringGeometry(strokeWidth: number, dashes: number) {
  const radius = 10 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  return { radius, circumference, period: circumference / Math.max(1, dashes) };
}

/**
 * The ring's `stroke-dasharray` as `mode` blends the idle dashes (0) into one
 * solid arc (1) covering `arc` of the circle.
 */
export function ringDashArray(mode: number, arc: number, circumference: number, period: number) {
  const dash = IDLE_DASH * period + (arc * circumference - IDLE_DASH * period) * mode;
  const gap =
    (1 - IDLE_DASH) * period + ((1 - arc) * circumference - (1 - IDLE_DASH) * period) * mode;
  return `${Math.max(0, dash)} ${Math.max(0, gap)}`;
}

/** What a screen reader hears: the status, and the percentage when it is known. */
export function statusMarkSpoken(status: StatusMarkStatus, progress?: number) {
  const known = status === 'running' && typeof progress === 'number' && Number.isFinite(progress);
  return SPOKEN[status] + (known ? `, ${Math.round(clamp01(progress) * 100)}%` : '');
}
