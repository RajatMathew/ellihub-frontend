import { useState } from 'react';

import { StatusMark, type StatusMarkStatus } from '@/app/components/status-mark';
import { cn } from '@/app/lib/utils';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import type { AgentActivityStep } from './agent-activity';
import { KIND_ICONS } from './agent-activity-icons';
import {
  DURATION,
  EASE_OUT,
  enterTransition,
  presenceFor,
  reveal,
  staggerDelay,
} from './agent-motion';
import { AgentShimmerText } from './agent-working-indicator';

/** How many rows a step lists before folding the rest into "+N more". */
const VISIBLE_ITEMS = 4;

/** One lookup on the rail: its kind, what it is doing, and what it found. */
export function StepRow({ step }: { step: AgentActivityStep }) {
  const Icon = KIND_ICONS[step.kind];
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-0 grid size-6 place-items-center rounded-full border bg-background transition-colors duration-300 ease-out',
          step.status === 'error'
            ? 'border-destructive/40 text-destructive'
            : step.status === 'running'
              ? 'border-foreground/20 text-foreground'
              : 'border-border text-muted-foreground'
        )}
      >
        <Icon className="size-3" />
      </span>
      <div className="flex min-h-6 min-w-0 items-center gap-2 text-xs">
        <StatusMark status={STEP_STATUS[step.status]} size={14} className="text-muted-foreground" />
        <StepTitle step={step} />
        {step.query ? (
          <span className="min-w-0 truncate text-muted-foreground">“{step.query}”</span>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {step.items.length > 0 ? (
          <motion.div
            key="items"
            className="overflow-hidden"
            {...presenceFor(reveal, reduceMotion)}
          >
            <StepItems items={step.items} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * The sweeping label while the step runs; once it is done the plain title
 * fades up in its place rather than the colour snapping.
 */
function StepTitle({ step }: { step: AgentActivityStep }) {
  if (step.status === 'running') {
    return <AgentShimmerText className="truncate font-medium">{step.title}</AgentShimmerText>;
  }
  return (
    <motion.span
      initial={{ opacity: 0.55 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.short, ease: EASE_OUT }}
      className={cn(
        'truncate font-medium',
        step.status === 'error' ? 'text-destructive' : 'text-foreground'
      )}
    >
      {step.title}
    </motion.span>
  );
}

/** The step's status on the shared glyph, which spells failure `failed`. */
const STEP_STATUS: Record<AgentActivityStep['status'], StatusMarkStatus> = {
  running: 'running',
  done: 'done',
  error: 'failed',
};

function StepItems({ items }: { items: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, VISIBLE_ITEMS);
  const hidden = items.length - shown.length;
  return (
    <ul className="mt-1.5 space-y-1 rounded-lg border border-border bg-card px-3 py-2">
      {shown.map((item, index) => (
        <motion.li
          // Rows are a fixed list once the lookup has answered.
          key={index}
          initial={{ opacity: 0, y: 2, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            ...enterTransition,
            // Rows revealed by "+N more" cascade from their own start, not
            // from wherever the first four left off.
            delay: staggerDelay(index >= VISIBLE_ITEMS ? index - VISIBLE_ITEMS : index),
          }}
          className="flex min-w-0 items-center gap-2 text-xs text-foreground"
        >
          <span
            aria-hidden="true"
            className="size-1 shrink-0 rounded-full bg-muted-foreground/50"
          />
          <span className="truncate">{item}</span>
        </motion.li>
      ))}
      {hidden > 0 ? (
        <li>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="ml-3 rounded-full px-1.5 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            +{hidden} more
          </button>
        </li>
      ) : null}
    </ul>
  );
}
