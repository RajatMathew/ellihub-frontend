import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
/* eslint-disable react-refresh/only-export-components --
   the card only ever renders inside a sonner toast; exporting it separately
   would be ceremony for a single call site. */
import { X } from 'lucide-react';
import { toast } from 'sonner';

type NewMailToastInput = {
  accountId: string;
  senderName: string | null;
  senderEmail: string | null;
  subject: string | null;
  preview: string | null;
  conversationId: string;
  count: number;
  onOpen: () => void;
};

function NewMailToastCard({
  input,
  toastId,
}: {
  input: NewMailToastInput;
  toastId: string | number;
}) {
  const senderLabel = input.senderName || input.senderEmail || 'New mail';
  return (
    <div className="editorial group relative w-80 cursor-pointer rounded-lg border border-border bg-popover p-3 shadow-md">
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left focus-visible:outline-hidden"
        onClick={() => {
          toast.dismiss(toastId);
          input.onOpen();
        }}
      >
        <SenderAvatar
          name={senderLabel}
          email={input.senderEmail ?? undefined}
          accountId={input.accountId}
          className="mt-0.5 size-9"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 truncate font-sans text-xs font-semibold text-foreground">
              {senderLabel}
            </span>
            {input.count > 1 && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                +{input.count - 1} more
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate font-serif text-sm text-foreground">
            {input.subject || '(No subject)'}
          </span>
          {input.preview && (
            <span className="mt-0.5 block truncate font-sans text-xs text-muted-foreground">
              {input.preview}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 hidden size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
        onClick={(event) => {
          event.stopPropagation();
          toast.dismiss(toastId);
        }}
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

/** Small editorial "new mail" notification, top-right, deduped per conversation. */
export function showNewMailToast(input: NewMailToastInput) {
  toast.custom((toastId) => <NewMailToastCard input={input} toastId={toastId} />, {
    id: `new-mail-${input.accountId}-${input.conversationId}`,
    duration: 6000,
    unstyled: true,
  });
}
