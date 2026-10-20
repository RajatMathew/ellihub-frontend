import { type ReactNode, type Ref } from 'react';

import { DotMatrixLoader } from '@/app/components/dot-matrix-loader';
import { cn } from '@/app/lib/utils';
import { AnimatePresence, motion } from 'motion/react';

import { DURATION, EASE_OUT, enterTransition, exitTransition } from './agent-motion';

/**
 * A line of text with a highlight sweeping across it — Elliot's "still going"
 * signal. Static for anyone who has asked for less motion.
 */
export function AgentShimmerText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-linear-to-r from-muted-foreground via-foreground to-muted-foreground bg-size-[200%_100%] bg-clip-text text-transparent',
        'animate-agent-shimmer motion-reduce:animate-none',
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * The app's loader (elli-ui#817) at the size of a line of small text, in the
 * muted text colour unless told otherwise.
 */
export function AgentSpinner({ size = 14, className }: { size?: number; className?: string }) {
  return <DotMatrixLoader size={size} className={cn('text-muted-foreground', className)} />;
}

/**
 * The label beside a spinner, cross-fading when it changes — "Thinking" to
 * "Searching RFQs" without a jump. The outgoing label is popped out of flow so
 * the new one starts at once instead of waiting for it to leave.
 */
export function AgentWorkingLabel({ label }: { label: string }) {
  return (
    <span className="relative inline-flex min-w-0 items-center gap-2 text-xs font-medium">
      <AgentSpinner />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -4, filter: 'blur(2px)', transition: exitTransition }}
          transition={{ duration: DURATION.short, ease: EASE_OUT }}
          className="truncate"
        >
          <AgentShimmerText>{label}</AgentShimmerText>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Shown under the user's message before Elliot has said or looked up anything.
 * Render it inside an `AnimatePresence mode="popLayout"`: when the first words
 * or the first lookup arrive it fades out of flow while they fade in, so the
 * handoff reads as one motion rather than a swap.
 */
export function AgentWorkingIndicator({
  label = 'Thinking',
  header,
  ref,
}: {
  label?: string;
  /**
   * Drawn above the label, inside the same motion — Elliot's name before the
   * first words (elli-ui#1408). It crossfades into the reply's own header in
   * the same spot, so the handoff stays one motion.
   */
  header?: ReactNode;
  /** popLayout measures the indicator through this as it leaves. */
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2, filter: 'blur(2px)', transition: exitTransition }}
      transition={{ ...enterTransition, delay: 0.08 }}
      className={header ? 'flex flex-col items-start' : 'flex items-center px-1 py-1'}
      role="status"
      aria-live="polite"
    >
      {header}
      {header ? (
        <div className="px-1 py-1">
          <AgentWorkingLabel label={label} />
        </div>
      ) : (
        <AgentWorkingLabel label={label} />
      )}
    </motion.div>
  );
}
