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
import {
  useEmailAccountsQuery,
  useEmailConversationQuery,
  useEmailFoldersQuery,
  useEmailMessagesQuery,
  useSendConnectedEmailMutation,
  useStartEmailAuthMutation,
} from '@/modules/email/hooks';
import { PanelLeftOpen } from 'lucide-react';

interface MailboxPageProps {
  mailbox: EmailMailboxKey;
}

const emails = emailData as EmailListItem[];
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
  const accountsQuery = useEmailAccountsQuery();
  const connectedAccount = accountsQuery.data?.[0] ?? null;
  const isConnected = Boolean(connectedAccount);
  const foldersQuery = useEmailFoldersQuery(connectedAccount?.id);
  const messagesQuery = useEmailMessagesQuery(connectedAccount?.id, selectedFolder);
  const startAuthMutation = useStartEmailAuthMutation();
  const sendMutation = useSendConnectedEmailMutation();
  const connectedEmails = useMemo<EmailListItem[]>(
    () =>
      (messagesQuery.data ?? []).map<EmailListItem>((email) => ({
        ...email,
        mailbox,
        folder: selectedFolder,
      })),
    [mailbox, messagesQuery.data, selectedFolder]
  );
  const mailboxEmails = useMemo(
    () => (isConnected ? connectedEmails : emails.filter((email) => email.mailbox === mailbox)),
    [connectedEmails, isConnected, mailbox]
  );
  const folderEmails = useMemo(
    () =>
      isConnected
        ? mailboxEmails
        : mailboxEmails.filter((email) => email.folder === selectedFolder),
    [isConnected, mailboxEmails, selectedFolder]
  );
  const folderCounts = useMemo(
    () =>
      isConnected
        ? getConnectedFolderCounts(foldersQuery.data ?? [])
        : getFolderCounts(mailboxEmails),
    [foldersQuery.data, isConnected, mailboxEmails]
  );
  const defaultEmailId = folderEmails.find((email) => email.selected)?.id ?? folderEmails[0]?.id;
  const selectedEmailId =
    selectedTarget?.mailbox === mailbox && selectedTarget.folder === selectedFolder
      ? selectedTarget.emailId
      : defaultEmailId;
  const mailboxConfig = EMAIL_MAILBOXES.find((item) => item.key === mailbox);
  const address =
    connectedAccount?.mailboxAddress ?? mailboxConfig?.address ?? 'email@ellicorp.com';
  const selectedEmail = folderEmails.find((email) => email.id === selectedEmailId) ?? null;
  const conversationQuery = useEmailConversationQuery(
    connectedAccount?.id,
    isConnected ? selectedEmail?.threadId : null
  );
  const visibleEmail =
    isConnected && selectedEmail && conversationQuery.data?.length
      ? { ...selectedEmail, threadMessages: conversationQuery.data }
      : selectedEmail;
  const isMailboxLoading = isConnected ? messagesQuery.isLoading : false;
  const isMailboxError = isConnected ? messagesQuery.isError : false;
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
          isAddingAccount={startAuthMutation.isPending}
          onSelectFolder={setSelectedFolder}
          onCompose={() => setComposeOpen(true)}
          onAddAccount={(provider) => startAuthMutation.mutate(provider)}
          onCollapsedChange={setMailboxSidebarCollapsed}
        />
        {showEmailList ? (
          <EmailListPane
            mailbox={mailbox}
            folder={selectedFolder}
            emails={isConnected ? folderEmails : undefined}
            isLoading={isMailboxLoading}
            isError={isMailboxError}
            selectedEmailId={selectedEmailId}
            onSelectEmail={(emailId) =>
              setSelectedTarget({ mailbox, folder: selectedFolder, emailId })
            }
            onRetry={() => messagesQuery.refetch()}
          />
        ) : null}
        <EmailReadingPane
          email={visibleEmail}
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
        email={visibleEmail}
        mailboxAddress={address}
        onLayoutChange={handleAgentLayoutChange}
        onRequestMailboxCollapse={() => setMailboxSidebarCollapsed(true)}
      />
      <EmailComposeDialog
        open={composeOpen}
        mailboxAddress={address}
        isSending={sendMutation.isPending}
        onOpenChange={setComposeOpen}
        onSend={async (payload) => {
          if (!connectedAccount) return;
          await sendMutation.mutateAsync({
            accountId: connectedAccount.id,
            subject: payload.subject,
            body: payload.body,
            bodyType: 'html',
            to: parseEmailAddresses(payload.to),
            cc: parseEmailAddresses(payload.cc),
            bcc: parseEmailAddresses(payload.bcc),
          });
        }}
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

function getConnectedFolderCounts(
  folders: Array<{ key: string | null; totalCount: number }>
): Partial<Record<EmailFolderKey, number>> {
  return folders.reduce<Partial<Record<EmailFolderKey, number>>>((counts, folder) => {
    const key = folder.key?.toLowerCase() as EmailFolderKey | undefined;
    if (!key) return counts;
    counts[key] = folder.totalCount;
    return counts;
  }, {});
}

function parseEmailAddresses(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((address) => ({ address }));
}
