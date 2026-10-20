import { type ReactNode } from 'react';

import { DotMatrixLoader } from '@/app/components/dot-matrix-loader';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { Check, CircleAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import type { AgentCardStatus } from './agent-card-status';
import { DURATION, EASE_OUT, enterTransition, exitTransition } from './agent-motion';
import { batchProgress, batchTitle, summarizeBatch } from './agent-proposal-batch';

export type ProposalBatchItem = {
  toolCallId: string;
  action: { action: string; summary: string; messageIds: string[] };
  status: AgentCardStatus;
  /** The tool input has streamed in far enough to show. */
  ready: boolean;
};

/**
 * Several mail changes from one turn, as one short checklist (elli-ui#650):
 * a line per change, an × to drop any one, and Approve all / Reject all.
 */
export function AgentProposalBatchCard({
  items,
  countdown,
  onApproveAll,
  onRejectAll,
  onRejectOne,
}: {
  items: ProposalBatchItem[];
  /** Shown in place of the buttons while an "Approve all" can still be undone. */
  countdown: ReactNode;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onRejectOne: (toolCallId: string) => void;
}) {
  const summary = summarizeBatch(
    items.map((item) => ({ status: item.status, messageIds: item.action.messageIds }))
  );
  const busy = summary.working > 0 || !!countdown;
  const canDecide = summary.pending > 0 && !busy && items.every((item) => item.ready);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enterTransition}
      aria-label={`Elliot proposes ${batchTitle(summary)}`}
      className="relative rounded-lg border border-border bg-card p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{batchTitle(summary)}</p>
        {summary.settled ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.short, ease: EASE_OUT }}
            className="text-xs tabular-nums text-muted-foreground"
          >
            {batchProgress(summary)}
          </motion.p>
        ) : null}
      </div>

      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.toolCallId} className="flex items-start gap-2 text-sm">
            <RowMark status={item.status} />
            <span
              className={cn(
                'min-w-0 flex-1 leading-5 transition-colors duration-200 ease-out',
                item.status === 'rejected' && 'text-muted-foreground line-through',
                !item.ready && 'text-muted-foreground'
              )}
            >
              {item.ready ? item.action.summary : 'Preparing…'}
            </span>
            {item.status === 'pending' && item.ready && !busy ? (
              <button
                type="button"
                aria-label={`Drop: ${item.action.summary}`}
                onClick={() => onRejectOne(item.toolCallId)}
                className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-sm text-muted-foreground transition-[color,background-color,scale] duration-150 ease-out hover:bg-accent motion-safe:active:scale-90 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {/* The decide row and the undo countdown trade places with a quick
          cross-fade rather than a cut. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {countdown ? (
          <motion.div key="countdown" className="mt-3" {...swap}>
            {countdown}
          </motion.div>
        ) : canDecide ? (
          <motion.div key="decide" className="mt-3 flex gap-2" {...swap}>
            <Button
              type="button"
              variant="primary"
              className="rounded-full px-4"
              onClick={onApproveAll}
            >
              <Check className="size-3.5" aria-hidden />
              {summary.pending === summary.total ? 'Approve all' : `Approve ${summary.pending}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={onRejectAll}
            >
              Reject all
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

const swap = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: enterTransition },
  exit: { opacity: 0, transition: exitTransition },
};

/**
 * A dot while waiting, then what happened — nothing louder than that. Each
 * change of state swaps the mark in place with a small settle.
 */
function RowMark({ status }: { status: AgentCardStatus }) {
  return (
    <span className="relative grid h-5 w-3.5 shrink-0 place-items-center" aria-label={status}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6, transition: exitTransition }}
          transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.6 }}
          className="grid place-items-center"
        >
          <RowMarkIcon status={status} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function RowMarkIcon({ status }: { status: AgentCardStatus }) {
  return (
    <>
      {status === 'working' ? (
        <DotMatrixLoader size={12} />
      ) : status === 'approved' ? (
        <Check className="size-3.5 text-success-accent" strokeWidth={2.5} aria-hidden />
      ) : status === 'rejected' ? (
        <X className="size-3.5 text-muted-foreground" aria-hidden />
      ) : status === 'failed' ? (
        <CircleAlert className="size-3.5 text-destructive" aria-hidden />
      ) : (
        <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden />
      )}
    </>
  );
}
