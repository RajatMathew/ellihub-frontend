import { EMAIL_MAILBOXES, type EmailMailboxKey } from '@/modules/email/constants/email-mailboxes';
import { Mail } from 'lucide-react';

interface EmailComingSoonPageProps {
  mailbox: EmailMailboxKey;
}

export function EmailComingSoonPage({ mailbox }: EmailComingSoonPageProps) {
  const mailboxConfig = EMAIL_MAILBOXES.find((item) => item.key === mailbox);
  const address = mailboxConfig?.address ?? 'email@ellicorp.com';

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height-mobile))] items-center justify-center bg-background px-6 py-16 lg:min-h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <div className="flex max-w-md flex-col items-center text-center">
        <Mail className="mb-8 size-8 text-muted-foreground" strokeWidth={1.8} />
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">{address}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Coming soon. This mailbox will open here once the Outlook connection is wired up.
        </p>
      </div>
    </div>
  );
}

