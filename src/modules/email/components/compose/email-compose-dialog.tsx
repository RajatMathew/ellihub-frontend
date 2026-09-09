import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  EmailComposeActions,
  EmailComposeStatus,
} from '@/modules/email/components/compose/email-compose-actions';
import { EmailComposeFields } from '@/modules/email/components/compose/email-compose-fields';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';

interface EmailComposeDialogProps {
  compose: EmailComposeController;
  mailboxAddress: string;
  accountId?: string;
}

/**
 * The modal compose surface. A shell only: every behaviour comes from the
 * `useEmailCompose` controller and every field from `EmailComposeFields`, which
 * is what keeps it identical to the inline composer in
 * `email-compose-pane.tsx`.
 */
export function EmailComposeDialog({
  compose,
  mailboxAddress,
  accountId,
}: EmailComposeDialogProps) {
  return (
    <Dialog
      open={compose.isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) void compose.requestClose();
      }}
    >
      <DialogContent className="max-h-[min(760px,calc(100dvh-3rem))] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b border-border px-5 py-4 pe-14">
          <DialogTitle className="text-base">{compose.title}</DialogTitle>
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs text-muted-foreground">From {mailboxAddress}</p>
            <EmailComposeStatus compose={compose} />
          </div>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" {...compose.formProps}>
          <EmailComposeFields compose={compose} accountId={accountId} />
          <DialogFooter className="border-t border-border px-5 py-3 pt-3">
            <div className="flex w-full flex-wrap items-center gap-2">
              <EmailComposeActions compose={compose} spread />
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
