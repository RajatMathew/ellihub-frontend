import { cn } from '@/app/lib/utils';

/**
 * The completion circle's ring, drawn as the TaskCard design draws it
 * (elli-ui#1479): a 15px circle on an 18-unit grid, stroked 1.5 with a short
 * dash — dotted while the task is open, solid on hover, and filled once done.
 *
 * An SVG stroke rather than `border-dashed`, because CSS picks its own dash
 * count; only a dasharray draws the design's fine, even dots.
 *
 * Driven entirely by the checkbox it sits beside: it follows `peer` for hover
 * and focus, and the card passes `done` for the filled state.
 */
export function TaskCompletionRing({ done, className }: { done: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className={cn(
        'pointer-events-none absolute inset-0 m-auto size-[15px]',
        // `peer` matches siblings only, so the hover is read here, on the svg
        // beside the checkbox, and handed down to the circle.
        !done &&
          'peer-hover:[&_circle]:stroke-task-ink-faint peer-hover:[&_circle]:[stroke-dasharray:100_0]',
        className
      )}
    >
      <circle
        cx={9}
        cy={9}
        r={7.5}
        strokeWidth={1.5}
        className={cn(
          'transition-[stroke,stroke-dasharray] duration-150',
          done
            ? 'fill-success stroke-success [stroke-dasharray:100_0]'
            : 'fill-none stroke-task-ring [stroke-dasharray:2.6_2.4]'
        )}
      />
    </svg>
  );
}
