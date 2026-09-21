import { cn } from '@/app/lib/utils';
import { motion, useReducedMotion } from 'motion/react';

/**
 * A checkbox whose tick springs in, after React Bits' Spring Check.
 *
 * Built here rather than installed: the published component pulls in
 * `@hugeicons/core-free-icons` for one 24×24 tick path, which is a dependency
 * for a single `d` attribute. `motion` it does share — the repo already has it
 * — so the spring is the real thing rather than a cubic-bezier impression of
 * one, and the numbers below are its published defaults.
 *
 * The strike-through belongs to the label, not to this, so the caller draws it;
 * the lag that makes the rule chase the tick is `SPRING_CHECK_STRIKE_LAG_MS`.
 */

/** The published `bounce` default — enough overshoot to read as a snap. */
const BOUNCE = 0.2;
const VISUAL_DURATION = 0.2;
/** How far behind the tick the caller's strike-through should start. */
export const SPRING_CHECK_STRIKE_LAG_MS = 120;

const TICK_PATH = 'M5 13.5L9.5 18L19 6.5';

export function SpringCheck({
  checked,
  disabled = false,
  label,
  onChange,
  className,
}: {
  checked: boolean;
  disabled?: boolean;
  /** Accessible name — the row's own text, since the box carries no label. */
  label: string;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // `visualDuration` + `bounce` is motion's perceptual spring: the duration is
  // what the eye reads rather than the time to settle, so the overshoot does
  // not make it feel slower than the number says.
  const spring = reduceMotion
    ? { duration: 0 }
    : ({ type: 'spring', visualDuration: VISUAL_DURATION, bounce: BOUNCE } as const);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        // The row behind this opens the task; ticking is not opening.
        event.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-[5px] border',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-default disabled:opacity-50',
        checked
          ? 'border-success bg-success'
          : 'border-mail-line bg-mail-card hover:border-mail-mid',
        'motion-safe:transition-colors motion-safe:duration-150',
        className
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3"
        initial={false}
        // The box itself swells a touch as the tick lands, which is what sells
        // the spring — a tick drawn into a static box reads as a state change,
        // not as a thing being ticked.
        animate={{ scale: checked ? 1 : 0.6 }}
        transition={spring}
      >
        <motion.path
          d={TICK_PATH}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success-foreground"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={spring}
        />
      </motion.svg>
    </button>
  );
}
