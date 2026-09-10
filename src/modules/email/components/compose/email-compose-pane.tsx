import { useEffect, useId, useRef } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  EmailComposeActions,
  EmailComposeStatus,
} from '@/modules/email/components/compose/email-compose-actions';
import { EmailComposeFields } from '@/modules/email/components/compose/email-compose-fields';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';
import { X } from 'lucide-react';

interface EmailComposePaneProps {
  compose: EmailComposeController;
  mailboxAddress: string;
  accountId?: string;
}

/**
 * The compose popover (elli-ui#807): a floating card anchored to the bottom
 * right of the workspace, so the message behind it stays readable and the list
 * stays usable. This is a shell only — it renders the same `EmailComposeFields`
 * against the same `useEmailCompose` controller as the modal.
 *
 * It is deliberately NOT a dialog: no `aria-modal`, no focus trap, nothing
 * inert behind it. It is a labelled region that takes focus on open and hands
 * it back on close, and Escape closes it the way the header's X does.
 */
export function EmailComposePane({ compose, mailboxAddress, accountId }: EmailComposePaneProps) {
  const headingId = useId();
  const paneRef = useRef<HTMLElement>(null);
  const focusFieldId = compose.form.to.trim() ? compose.fieldIds.body : compose.fieldIds.to;

  // The composer replaced the reading pane, so focus has to follow it there —
  // a pane has no focus trap to do that for us. An empty To takes focus first,
  // matching where the user would start typing; a reopened draft goes to the body.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const field = paneRef.current?.ownerDocument.getElementById(focusFieldId);
      field?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusFieldId]);

  return (
    // The wrapper only positions; it lets clicks through so the reading pane and
    // the message list behind stay live while a draft is open.
    <div className="pointer-events-none absolute inset-0 z-30 flex p-2">
      <section
        ref={paneRef}
        aria-labelledby={headingId}
        className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg"
        onKeyDown={(event) => {
          // Escape closes the composer, saving the draft on the way out. Nested
          // popovers (address suggestions) stop the event before it gets here.
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          void compose.requestClose();
        }}
      >
        <form className="flex min-h-0 flex-1 flex-col" {...compose.formProps}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <EmailComposeActions compose={compose} />
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <EmailComposeStatus compose={compose} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close compose"
                title="Close compose"
                disabled={compose.isBusy}
                onClick={() => void compose.requestClose()}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border px-5 py-2.5">
            <h2 id={headingId} className="text-sm font-medium text-foreground">
              {compose.title}
            </h2>
            <p className="min-w-0 truncate text-xs text-muted-foreground">From {mailboxAddress}</p>
          </div>

          <EmailComposeFields compose={compose} accountId={accountId} />
        </form>
      </section>
    </div>
  );
}
