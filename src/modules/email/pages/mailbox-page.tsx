import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import {
  EmailAgentPanel,
  type EmailAgentLayout,
} from '@/modules/email/components/email-agent-panel';
import { EmailComposeDialog } from '@/modules/email/components/email-compose-dialog';
import { EmailListPane } from '@/modules/email/components/email-list-pane';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { MailboxSidebar } from '@/modules/email/components/mailbox-sidebar';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import { EMAIL_MAILBOXES, type EmailMailboxKey } from '@/modules/email/constants/email-mailboxes';
import emailData from '@/modules/email/data/emails.json';
import { PanelLeftOpen } from 'lucide-react';

interface MailboxPageProps {
  mailbox: EmailMailboxKey;
}

const emails = emailData as EmailListItem[];
const isMailboxLoading = false;
const isMailboxError = false;
const DEFAULT_AGENT_LAYOUT: EmailAgentLayout = {
  open: true,
  width: 392,
  pushesContent: false,
  hidesEmailList: false,
};

export function MailboxPage({ mailbox }: MailboxPageProps) {
  const [selectedFolder, setSelectedFolder] = useState<EmailFolderKey>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [agentLayout, setAgentLayout] = useState<EmailAgentLayout>(DEFAULT_AGENT_LAYOUT);
  const [emailListVisible, setEmailListVisible] = useState(true);
  const [mailboxSidebarCollapsed, setMailboxSidebarCollapsed] = useState(false);
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
  const showEmailList = emailListVisible || !agentLayout.hidesEmailList;

  const handleAgentLayoutChange = useCallback((layout: EmailAgentLayout) => {
    setAgentLayout(layout);
    if (layout.hidesEmailList) {
      setEmailListVisible(false);
      setMailboxSidebarCollapsed(true);
      return;
    }
    setEmailListVisible(true);
  }, []);

  return (
    <div className="relative h-[calc(100dvh-var(--header-height-mobile))] overflow-hidden bg-background lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <div
        className={cn(
          'flex h-full min-w-0',
          agentLayout.pushesContent &&
            'motion-safe:transition-[padding-right] motion-safe:duration-150 motion-safe:ease-out',
          'motion-reduce:transition-none'
        )}
        style={{ paddingRight: agentLayout.pushesContent ? agentLayout.width : 0 }}
      >
        <MailboxSidebar
          mailboxAddress={address}
          selectedFolder={selectedFolder}
          folderCounts={folderCounts}
          collapsed={mailboxSidebarCollapsed}
          onSelectFolder={setSelectedFolder}
          onCompose={() => setComposeOpen(true)}
          onCollapsedChange={setMailboxSidebarCollapsed}
        />
        {showEmailList ? (
          <EmailListPane
            mailbox={mailbox}
            folder={selectedFolder}
            selectedEmailId={selectedEmailId}
            onSelectEmail={(emailId) =>
              setSelectedTarget({ mailbox, folder: selectedFolder, emailId })
            }
          />
        ) : null}
        <EmailReadingPane
          email={selectedEmail}
          mailboxAddress={address}
          isLoading={isMailboxLoading}
          isError={isMailboxError}
        />
      </div>
      {!showEmailList && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-1/2 z-20 h-12 w-8 -translate-y-1/2 rounded-l-none border-l-0 bg-background/95 shadow-sm backdrop-blur-xs"
          style={{ left: mailboxSidebarCollapsed ? 60 : 280 }}
          aria-label="Show inbox list"
          title="Show inbox list"
          onClick={() => setEmailListVisible(true)}
        >
          <PanelLeftOpen aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </Button>
      )}
      <EmailAgentPanel
        email={selectedEmail}
        mailboxAddress={address}
        onLayoutChange={handleAgentLayoutChange}
        onRequestMailboxCollapse={() => setMailboxSidebarCollapsed(true)}
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
