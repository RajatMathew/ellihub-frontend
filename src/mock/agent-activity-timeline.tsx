import { useState } from 'react';

import { cn } from '@/app/lib/utils';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { summarizeActivity, type AgentActivityStep } from './agent-activity';
import { KIND_ICONS } from './agent-activity-icons';
import { StepRow } from './agent-activity-step';
import {
  DURATION,
  enterTransition,
  exitTransition,
  fold,
  presenceFor,
  reveal,
  staggerDelay,
} from './agent-motion';
import { AgentWorkingLabel } from './agent-working-indicator';

/**
 * What Elliot looked up on its way to an answer (elli-ui#695).
 *
 * While the turn is live, every step shows on a dashed rail as it happens —
 * a spinner and a sweeping label while it runs, then what it found. Once the
 * turn is over the rail folds into one line ("3 steps · 12 results") that opens
 * it again, so a finished conversation reads as answers, not as process.
 *
 * The fold glides (elli-ui#649, #1482): the rail stays mounted and collapses
 * while the pill grows in above it, both on the same curve, so the reply below
 * slides up rather than the rail vanishing in a frame. A run that starts while
 * the reader watches grows in the same way. A conversation reopened from
 * history renders folded, with no motion.
 */
export function AgentActivityTimeline({
  steps,
  live,
  working,
}: {
  steps: AgentActivityStep[];
  /** The turn is still streaming. */
  live: boolean;
  /** Live with nothing else on screen yet — show a "Working" tail. */
  working: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Only a turn the reader watched run moves on its own; one reopened from
  // history mounts already folded.
  const [watchedLive] = useState(live);
  const reduceMotion = useReducedMotion() ?? false;
  if (steps.length === 0) return null;
  const pill = presenceFor(fold, reduceMotion);
  // The live rail grows in and folds away slowly; the reader opening it by
  // hand gets the quicker reveal.
  const rail = presenceFor(live ? fold : reveal, reduceMotion);

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {live ? null : (
          // The padding gives the focus ring room inside the clip.
          <motion.div key="pill" className="-m-0.5 overflow-hidden p-0.5" {...pill}>
            <SummaryPill
              steps={steps}
              open={open}
              animateIn={watchedLive && !reduceMotion}
              onToggle={() => setOpen((value) => !value)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={watchedLive}>
        {live || open ? (
          <motion.div key="rail" className="overflow-hidden" {...rail}>
            {/* Padding, not a gap, so it folds away with the rail. */}
            <div className={cn(!live && 'pt-2')}>
              <StepRail steps={steps} working={live && working && !steps.some(isRunning)} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const isRunning = (step: AgentActivityStep) => step.status === 'running';

function SummaryPill({
  steps,
  open,
  animateIn,
  onToggle,
}: {
  steps: AgentActivityStep[];
  open: boolean;
  /** Its icons cascade in as a live rail folds into it. */
  animateIn: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="group inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 text-xs text-muted-foreground transition-[color,border-color,scale] duration-150 ease-out hover:border-foreground/20 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-97"
    >
      <StackedKinds steps={steps} animateIn={animateIn} />
      <span>{summarizeActivity(steps)}</span>
      <ChevronDown
        className={cn(
          'size-3 transition-transform duration-200 ease-out motion-reduce:transition-none',
          open && 'rotate-180'
        )}
        aria-hidden="true"
      />
    </button>
  );
}

/** Up to three distinct kinds of lookup, overlapped like avatars. */
function StackedKinds({ steps, animateIn }: { steps: AgentActivityStep[]; animateIn: boolean }) {
  const kinds = [...new Set(steps.map((step) => step.kind))].slice(0, 3);
  return (
    <span className="flex -space-x-1.5" aria-hidden="true">
      {kinds.map((kind, index) => {
        const Icon = KIND_ICONS[kind];
        return (
          <motion.span
            key={kind}
            initial={animateIn ? { opacity: 0, x: -4 } : false}
            animate={{ opacity: 1, x: 0 }}
            // After the pill has started to fade in (agent-motion.ts `fold`).
            transition={{ ...enterTransition, delay: DURATION.fold / 3 + staggerDelay(index) }}
            className="grid size-5 place-items-center rounded-full border border-border bg-background text-muted-foreground"
          >
            <Icon className="size-2.5" />
          </motion.span>
        );
      })}
    </span>
  );
}

/** Rows grow in from nothing and fold away, so the rail never jumps. */
const railRow = {
  initial: { opacity: 0, height: 0, y: 4 },
  animate: { opacity: 1, height: 'auto', y: 0, transition: enterTransition },
  exit: { opacity: 0, height: 0, transition: { ...exitTransition, duration: DURATION.short } },
};

function StepRail({ steps, working }: { steps: AgentActivityStep[]; working: boolean }) {
  const row = presenceFor(railRow, useReducedMotion() ?? false);
  return (
    // Spacing is padding on each row, not a gap, so a row growing from zero
    // height does not drop a gap's worth of space in on its first frame.
    <ol className="relative flex flex-col py-1" aria-label="What Elliot looked up">
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-3 top-3 border-l border-dashed border-border"
      />
      <AnimatePresence initial={false}>
        {steps.map((step, index) => (
          <motion.li
            key={step.id}
            {...row}
            className={cn('relative overflow-hidden', index > 0 && 'pt-3')}
          >
            <div className="relative pl-9">
              <StepRow step={step} />
            </div>
          </motion.li>
        ))}
        {working ? (
          <motion.li
            key="working"
            {...row}
            className={cn('relative overflow-hidden', steps.length > 0 && 'pt-3')}
          >
            <div className="relative flex min-h-6 items-center pl-9">
              <span className="absolute left-0 top-0 grid size-6 place-items-center rounded-full border border-border bg-background">
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none" />
              </span>
              <AgentWorkingLabel label="Working" />
            </div>
          </motion.li>
        ) : null}
      </AnimatePresence>
    </ol>
  );
}
