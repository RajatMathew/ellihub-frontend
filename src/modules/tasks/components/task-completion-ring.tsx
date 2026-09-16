import { cn } from '@/app/lib/utils';

/**
 * The dashed ring around an open task's completion circle.
 *
 * Drawn as an SVG stroke rather than `border-dashed` because CSS decides the
 * dash count for you — at this size it packs a dozen-odd short dashes around
 * the circle, and the design wants seven, spaced apart, so the ring reads as
 * airy rather than stitched. A dasharray is the only way to say "seven".
 *
 * Sized and stroked to sit exactly where the checkbox's 2px border would be, so
 * the circle's footprint does not change; the checkbox underneath keeps its
 * border transparent while this is showing and draws its own solid ring once
 * the task is done.
 */

const SIZE = 24;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const DASHES = 7;
const PERIOD = (2 * Math.PI * RADIUS) / DASHES;
/** Just over half of each period is ink, so a gap reads as a gap. */
const DASH = PERIOD * 0.55;

export function TaskCompletionRing({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${DASH} ${PERIOD - DASH}`}
        // Start the first dash centred on twelve o'clock rather than beginning
        // there, so the ring is symmetrical about its vertical axis.
        strokeDashoffset={DASH / 2}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
    </svg>
  );
}
