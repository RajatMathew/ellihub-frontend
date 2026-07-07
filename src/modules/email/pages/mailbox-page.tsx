import { EmailListPane } from '@/modules/email/components/email-list-pane';
import { MailboxSidebar } from '@/modules/email/components/mailbox-sidebar';
import { EMAIL_MAILBOXES, type EmailMailboxKey } from '@/modules/email/constants/email-mailboxes';
import { Mail } from 'lucide-react';

interface MailboxPageProps {
  mailbox: EmailMailboxKey;
}

export function MailboxPage({ mailbox }: MailboxPageProps) {
  const mailboxConfig = EMAIL_MAILBOXES.find((item) => item.key === mailbox);
  const address = mailboxConfig?.address ?? 'email@ellicorp.com';

  return (
    <div className="flex h-[calc(100dvh-var(--header-height-mobile))] overflow-hidden bg-background lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <MailboxSidebar mailboxAddress={address} />
      <EmailListPane mailbox={mailbox} />

      <div className="flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden px-6 pt-48 pb-10">
        <div className="flex max-w-md flex-col items-center text-center">
          <Mail className="mb-8 size-8 text-muted-foreground" strokeWidth={1.8} />
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">{address}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Coming soon. This mailbox will open here once the Outlook connection is wired up.
          </p>
        </div>
      </div>
    </div>
  );
}
