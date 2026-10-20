import { useState, type ReactNode } from 'react';

import { DotMatrixLoader } from '@/app/components/dot-matrix-loader';
import { Button } from '@/app/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { cn } from '@/app/lib/utils';
import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  Maximize2,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';

import { AgentAnimatedHeight } from './agent-animated-height';
import type { AgentCardStatus } from './agent-card-status';
import { enterTransition } from './agent-motion';
import { AgentFieldsStreaming } from './agent-streaming-field';

const STATUS_WORD: Record<AgentCardStatus, string> = {
  pending: 'Pending',
  working: 'Working',
  approved: 'Approved',
  rejected: 'Rejected',
  revised: 'Changes requested',
  failed: 'Failed',
};

const STATUS_TONE: Record<AgentCardStatus, string> = {
  pending: 'text-warning-accent',
  working: 'text-warning-accent',
  approved: 'text-success-accent',
  rejected: 'text-destructive',
  revised: 'text-muted-foreground',
  failed: 'text-destructive',
};

function StatusIcon({ status }: { status: AgentCardStatus }) {
  if (status === 'working') return <DotMatrixLoader size={14} />;
  if (status === 'failed') return <CircleAlert className="size-3.5" aria-hidden />;
  return <CircleDashed className="size-3.5" aria-hidden />;
}

type ShellProps = {
  title: string;
  status: AgentCardStatus;
  /**
   * Names a decided card by what happened rather than by the approval, for an
   * action Elliot runs without asking: "Archived", then "Undone" once taken
   * back (elli-ui#651).
   */
  outcome?: { word: string; undone?: boolean };
  /** The card's fields. Rendered inline, or in the larger dialog while expanded. */
  children: ReactNode;
  actions?: ReactNode;
  /** The line shown under the fields once the card is decided. */
  result?: ReactNode;
  /** Elliot is still writing the fields: they reveal word by word (elli-ui#1482). */
  streaming?: boolean;
};

/**
 * The frame every Elliot proposal sits in: a status header, the editable body,
 * the approve/reject buttons, and — once decided — a chip that collapses the
 * whole card to one line and reopens it read-only.
 */
export function AgentActionShell(props: ShellProps) {
  // A change request settles into its chip like an approval or a rejection.
  const decided =
    props.status === 'approved' || props.status === 'rejected' || props.status === 'revised';
  // A card decided while the reader watched settles into its chip; one that
  // was already decided when it mounted (history) just shows the chip.
  const [mountedDecided] = useState(decided);

  // The height glides from the full card to the chip, so the reply under it
  // closes the gap instead of jumping up by a card's height (elli-ui#649).
  return (
    <AgentFieldsStreaming streaming={props.streaming ?? false}>
      <AgentAnimatedHeight trigger={decided}>
        {decided ? (
          <DecidedChip {...props} animateIn={!mountedDecided} />
        ) : (
          <ProposalCard {...props} />
        )}
      </AgentAnimatedHeight>
    </AgentFieldsStreaming>
  );
}

function DecidedChip({
  title,
  status,
  outcome,
  children,
  result,
  animateIn,
}: ShellProps & { animateIn: boolean }) {
  const [chipOpen, setChipOpen] = useState(false);
  const approved = status === 'approved';
  const undone = outcome?.undone === true;
  return (
    <motion.div
      initial={animateIn ? { opacity: 0, scale: 0.96, filter: 'blur(2px)' } : false}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={enterTransition}
      className="origin-top-left"
    >
      <Collapsible
        open={chipOpen}
        onOpenChange={setChipOpen}
        className="flex flex-col items-start gap-2"
      >
        <CollapsibleTrigger
          className={cn(
            'inline-flex max-w-full items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold text-foreground transition-[color,background-color,border-color,scale] duration-150 ease-out motion-safe:active:scale-97 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            undone
              ? 'border-border bg-muted'
              : approved
                ? 'border-success-alpha bg-success-soft'
                : status === 'revised'
                  ? 'border-border bg-muted/60'
                  : 'border-destructive-alpha bg-destructive-soft'
          )}
        >
          {undone ? (
            <RotateCcw className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : approved ? (
            <Check className="size-3.5 shrink-0 text-success-accent" aria-hidden />
          ) : status === 'revised' ? (
            <Pencil className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <X className="size-3.5 shrink-0 text-destructive" aria-hidden />
          )}
          <span className="truncate">{title} ·</span>
          <span className={undone ? 'text-muted-foreground' : STATUS_TONE[status]}>
            {outcome?.word ?? STATUS_WORD[status]}
          </span>
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none',
              chipOpen && 'rotate-180'
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="w-full">
          <div className="rounded-lg border border-border bg-card p-3">
            {children}
            {status === 'revised' ? (
              <p className="mt-3 text-xs text-muted-foreground">
                You asked for changes; Elliot's new version is below.
              </p>
            ) : (
              result
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

function ProposalCard({ title, status, children, actions, result }: ShellProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 bg-muted py-1.5 pl-3 pr-1.5">
        <StatusIcon status={status} />
        <p className="min-w-0 truncate text-sm font-semibold">{title} ·</p>
        <span className={cn('shrink-0 text-sm font-semibold', STATUS_TONE[status])}>
          {STATUS_WORD[status]}
        </span>
        {status === 'pending' ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="ml-auto size-7 bg-card"
            aria-label={`Open ${title} in a larger editor`}
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="size-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className="p-3">
        {expanded ? (
          <p className="text-xs text-muted-foreground">Editing in the larger view.</p>
        ) : (
          children
        )}
        {result}
        {actions}
      </div>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </div>
  );
}
