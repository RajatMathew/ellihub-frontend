import { useMemo, useState } from 'react';

import { EmailComposeDialog } from '@/modules/email/components/email-compose-dialog';
import { EmailListPane } from '@/modules/email/components/email-list-pane';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { MailboxSidebar } from '@/modules/email/components/mailbox-sidebar';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import { EMAIL_MAILBOXES, type EmailMailboxKey } from '@/modules/email/constants/email-mailboxes';
import emailData from '@/modules/email/data/emails.json';

interface MailboxPageProps {
  mailbox: EmailMailboxKey;
}

const emails = emailData as EmailListItem[];
const isMailboxLoading = false;
const isMailboxError = false;

export function MailboxPage({ mailbox }: MailboxPageProps) {
  const [selectedFolder, setSelectedFolder] = useState<EmailFolderKey>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{
    mailbox: EmailMailboxKey;
    folder: EmailFolderKey;
    emailId: string;
  } | null>(null);
  const mailboxEmails = useMemo(
    () => emails.filter((email) => email.mailbox === mailbox),
    [mailbox]
  );
  const folderEmails = useMemo(
    () => mailboxEmails.filter((email) => email.folder === selectedFolder),
    [mailboxEmails, selectedFolder]
  );
  const folderCounts = useMemo(() => getFolderCounts(mailboxEmails), [mailboxEmails]);
  const defaultEmailId = folderEmails.find((email) => email.selected)?.id ?? folderEmails[0]?.id;
  const selectedEmailId =
    selectedTarget?.mailbox === mailbox && selectedTarget.folder === selectedFolder
      ? selectedTarget.emailId
      : defaultEmailId;
  const mailboxConfig = EMAIL_MAILBOXES.find((item) => item.key === mailbox);
  const address = mailboxConfig?.address ?? 'email@ellicorp.com';
  const selectedEmail = folderEmails.find((email) => email.id === selectedEmailId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-var(--header-height-mobile))] overflow-hidden bg-background lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <MailboxSidebar
        mailboxAddress={address}
        selectedFolder={selectedFolder}
        folderCounts={folderCounts}
        onSelectFolder={setSelectedFolder}
        onCompose={() => setComposeOpen(true)}
      />
      <EmailListPane
        mailbox={mailbox}
        folder={selectedFolder}
        selectedEmailId={selectedEmailId}
        onSelectEmail={(emailId) =>
          setSelectedTarget({ mailbox, folder: selectedFolder, emailId })
        }
      />
      <EmailReadingPane
        email={selectedEmail}
        mailboxAddress={address}
        isLoading={isMailboxLoading}
        isError={isMailboxError}
      />
      <EmailComposeDialog
        open={composeOpen}
        mailboxAddress={address}
        onOpenChange={setComposeOpen}
      />
    </div>
  );
}

function getFolderCounts(mailboxEmails: EmailListItem[]) {
  return mailboxEmails.reduce<Partial<Record<EmailFolderKey, number>>>((counts, email) => {
    const folder = email.folder as EmailFolderKey;
    counts[folder] = (counts[folder] ?? 0) + 1;
    return counts;
  }, {});
}
