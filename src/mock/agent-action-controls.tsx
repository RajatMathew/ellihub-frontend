import { type ReactNode } from 'react';

import { DotMatrixLoader } from '@/app/components/dot-matrix-loader';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { Check, CircleAlert, RotateCcw, Send, Trash2, X } from 'lucide-react';

/** Aura's pill pair: a ringed approve and a quiet reject. */
export function AgentActionButtons({
  approveLabel,
  processing,
  processingApproved,
  disabled,
  destructive,
  onApprove,
}: {
  approveLabel: string;
  processing: boolean;
  processingApproved?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onApprove: (approved: boolean) => Promise<void>;
}) {
  const ApproveIcon = destructive ? Trash2 : Send;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={destructive ? 'destructive' : 'primary'}
        className={cn(
          'rounded-full px-4 ring-2 ring-offset-2 ring-offset-card',
          destructive ? 'ring-destructive' : 'ring-primary',
          (disabled || processing) && 'ring-0'
        )}
        disabled={processing || disabled}
        onClick={() => void onApprove(true)}
      >
        {processing && processingApproved === true ? (
          <DotMatrixLoader size={14} />
        ) : (
          <ApproveIcon className="size-3.5" aria-hidden />
        )}
        {processing && processingApproved === true ? 'Working…' : approveLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full px-4"
        disabled={processing}
        onClick={() => void onApprove(false)}
      >
        {processing && processingApproved === false ? 'Working…' : 'Reject'}
      </Button>
    </div>
  );
}

/** The line a decided card ends on: what happened, in plain words. */
export function AgentActionResult({
  approved,
  undone = false,
  children,
}: {
  approved: boolean;
  /** Done, then taken back from its toast. */
  undone?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'mt-3 flex items-center gap-2 text-xs font-medium',
        approved ? 'text-success-accent' : 'text-muted-foreground'
      )}
    >
      {undone ? (
        <RotateCcw className="size-3.5" aria-hidden />
      ) : approved ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <X className="size-3.5" aria-hidden />
      )}
      {children}
    </p>
  );
}

/** Why Approve is disabled, or what went wrong. */
export function AgentActionNote({
  tone,
  children,
}: {
  tone: 'warning' | 'error';
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'mt-3 flex items-start gap-2 rounded-md p-2 text-xs',
        tone === 'error'
          ? 'bg-destructive-soft text-destructive-soft-foreground'
          : 'text-warning-accent'
      )}
    >
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
