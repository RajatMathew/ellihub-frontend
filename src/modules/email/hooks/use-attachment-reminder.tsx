import { useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { attachmentReminder } from '@/modules/email/lib/email-attachment-reminder';

/**
 * Asks before sending a message that promises a file and carries none — "You
 * wrote 'find attached the' … but there are no files attached" — the way Zoho
 * Mail does. Shared by the new-message and reply composers, so both ask the
 * same question in the same words.
 *
 * `guard` runs `send` straight away when there is nothing to ask; otherwise it
 * holds it until the reader chooses "Send anyway". Cancel leaves the draft as
 * it was, to attach the file.
 */
export function useAttachmentReminder(): {
  guard: (input: { bodyHtml: string; attachmentCount: number }, send: () => void) => void;
  isOpen: boolean;
  dialog: ReactNode;
} {
  const [held, setHeld] = useState<{ phrase: string; send: () => void } | null>(null);

  const guard = (input: { bodyHtml: string; attachmentCount: number }, send: () => void) => {
    const phrase = attachmentReminder(input);
    if (phrase) setHeld({ phrase, send });
    else send();
  };

  const dialog = (
    <ConfirmDialog
      open={held !== null}
      onOpenChange={(open) => {
        if (!open) setHeld(null);
      }}
      title="Did you mean to attach files?"
      description={
        <>
          You wrote <strong className="font-semibold text-foreground">{held?.phrase}</strong> in
          your message, but there are no files attached. Send anyway?
        </>
      }
      confirmLabel="Send anyway"
      onConfirm={() => {
        const send = held?.send;
        setHeld(null);
        send?.();
      }}
    />
  );

  return { guard, isOpen: held !== null, dialog };
}
