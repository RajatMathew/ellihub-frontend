import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';
import { Send, Trash2 } from 'lucide-react';

/**
 * Send + Discard. Shared so the modal footer and the inline composer's header
 * enable and label the two buttons from the same rules.
 */
export function EmailComposeActions({
  compose,
  spread = false,
}: {
  compose: EmailComposeController;
  /** Pushes Discard to the far end — the modal footer wants it there. */
  spread?: boolean;
}) {
  const { canSend, isBusy, isPreparingAttachments, isSubmitting, isSending, isDiscarding } =
    compose;

  return (
    <>
      <Button
        type="submit"
        size="sm"
        disabled={!canSend || isBusy || isPreparingAttachments}
        aria-busy={isSubmitting || isSending}
      >
        <Send aria-hidden="true" className="size-3.5" />
        {isSubmitting || isSending ? 'Sending' : 'Send'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground',
          spread && 'ml-auto'
        )}
        disabled={isBusy || isPreparingAttachments}
        onClick={() => void compose.discard()}
      >
        <Trash2 aria-hidden="true" className="size-3.5" />
        {isDiscarding ? 'Discarding' : 'Discard'}
      </Button>
    </>
  );
}

/**
 * The autosave read-out. `role="status"` while it is informational and
 * `role="alert"` once a save fails, so a screen reader hears the failure.
 */
export function EmailComposeStatus({ compose }: { compose: EmailComposeController }) {
  // A draft that could not be loaded is the same kind of failure as a save that
  // did not land: it is announced, and Retry is the way out of it.
  const hasError = compose.saveStatus === 'error' || compose.hasDraftHydrationError;

  return (
    <div className="flex min-w-0 shrink items-center gap-2">
      <p
        className={cn('truncate text-xs', hasError ? 'text-destructive' : 'text-muted-foreground')}
        role={hasError ? 'alert' : 'status'}
      >
        {compose.statusText}
      </p>
      {hasError && (
        <button
          type="button"
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          onClick={compose.retrySave}
        >
          Retry
        </button>
      )}
    </div>
  );
}
