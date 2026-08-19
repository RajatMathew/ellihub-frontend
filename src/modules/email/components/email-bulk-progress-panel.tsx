import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';

export type EmailBulkOperationKind = 'archive' | 'delete' | 'empty';

export interface EmailBulkOperationState {
  kind: EmailBulkOperationKind;
  total: number;
  done: number;
  failed: number;
  isRunning: boolean;
}

interface EmailBulkProgressPanelProps {
  operation: EmailBulkOperationState | null;
  onDismiss: () => void;
}

const LABELS: Record<EmailBulkOperationKind, { active: string; done: string }> = {
  archive: { active: 'Archiving emails', done: 'Emails archived' },
  delete: { active: 'Deleting emails', done: 'Emails deleted' },
  empty: { active: 'Emptying folder', done: 'Folder emptied' },
};

export function EmailBulkProgressPanel({ operation, onDismiss }: EmailBulkProgressPanelProps) {
  const isRunning = operation?.isRunning ?? false;
  const total = operation?.total ?? 0;
  const done = operation?.done ?? 0;
  const failed = operation?.failed ?? 0;
  const settled = done + failed;
  const finished = !!operation && !isRunning && settled >= total;
  const progressValue = total > 0 ? Math.min(100, Math.round((settled / total) * 100)) : 0;

  useEffect(() => {
    if (!operation) return;
    if (finished && failed === 0) {
      const timer = window.setTimeout(onDismiss, 1_800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [operation, finished, failed, onDismiss]);

  if (!operation) return null;

  const copy = LABELS[operation.kind];
  const heading = finished
    ? failed > 0
      ? `${copy.done} with issues`
      : copy.done
    : `${copy.active}…`;

  return (
    <aside
      aria-live="polite"
      aria-label="Bulk email progress"
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-lg border border-border bg-background shadow-lg"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          {finished ? (
            failed > 0 ? (
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 text-destructive" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 text-success-accent" />
            )
          ) : (
            <LoaderCircle
              aria-hidden="true"
              className="mt-0.5 size-4 animate-spin text-muted-foreground"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{heading}</p>
            <p className="text-xs text-muted-foreground">
              {settled} of {total}
              {failed > 0 && ` · ${failed} failed`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          mode="icon"
          size="sm"
          className="size-8 shrink-0"
          aria-label="Dismiss progress"
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </header>
      <div className="px-4 py-3">
        <Progress value={progressValue} className="h-1.5" />
      </div>
    </aside>
  );
}
