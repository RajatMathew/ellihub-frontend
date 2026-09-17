import { useEffect, useId, useRef } from 'react';

import { Button } from '@/app/components/ui/button';
import { EmailComposeStatus } from '@/modules/email/components/compose/email-compose-actions';
import { EmailComposeFields } from '@/modules/email/components/compose/email-compose-fields';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';
import { Minimize2, X } from 'lucide-react';

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
  // Read inside the open effect, never as a dependency: a draft opened from the
  // cache fills its recipients when hydration lands, and keying focus off the
  // form would move the caret out of whatever the user was already typing
  // (elli-ui#925).
  const focusTargetRef = useRef(compose.fieldIds.to);
  useEffect(() => {
    focusTargetRef.current =
      compose.isEditingDraft || compose.form.to.trim()
        ? compose.fieldIds.body
        : compose.fieldIds.to;
  });

  // The composer replaced the reading pane, so focus has to follow it there —
  // a pane has no focus trap to do that for us. An empty To takes focus first,
  // matching where the user would start typing; a reopened draft goes to the body.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const field = paneRef.current?.ownerDocument.getElementById(focusTargetRef.current);
      field?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
    // One shot per open: `openToken` changes only when the composer is opened.
  }, [compose.openToken]);

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
          {/*
            Title on the left, the two chrome controls on the right, and nothing
            else. Send used to sit up here beside Discard, which put the button
            you want and the button you fear a few pixels apart and left the
            title fighting them for the row. Sending is now the one emphatic
            thing in the footer, and closing is a ✕ at the far corner
            (elli-ui#921).
          */}
          <div className="flex min-w-0 shrink-0 items-center gap-3 border-b border-mail-pane-line px-4 py-3">
            <h2 id={headingId} className="text-[15px] font-semibold text-mail-ink">
              {compose.title}
            </h2>
            <p className="hidden min-w-0 truncate text-xs text-mail-muted lg:block">
              From {mailboxAddress}
            </p>
            <div className="ms-auto flex shrink-0 items-center gap-1.5">
              <EmailComposeStatus compose={compose} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={compose.isBusy}
                onClick={() => void compose.requestClose()}
              >
                <Minimize2 aria-hidden="true" className="size-3.5" />
                <span className="hidden sm:inline">Collapse</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Discard and close"
                title="Discard and close"
                disabled={compose.isBusy}
                onClick={() => void compose.discard()}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>

          <EmailComposeFields compose={compose} accountId={accountId} />
        </form>
      </section>
    </div>
  );
}
