import { useCallback, useEffect, useMemo, useState } from 'react';

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
import {
  EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
  EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
} from '@/modules/email/constants/email-account-storage';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import { EMAIL_MAILBOXES, type EmailMailboxKey } from '@/modules/email/constants/email-mailboxes';
import emailData from '@/modules/email/data/emails.json';
import {
  useArchiveEmailMessageMutation,
  useCreateEmailFolderMutation,
  useCreateEmailTagMutation,
  useDeleteEmailMessageMutation,
  useEmailAccountsQuery,
  useEmailConversationQuery,
  useEmailFoldersQuery,
  useEmailMessagesQuery,
  useEmailTagsQuery,
  useMoveEmailMessageMutation,
  useSendConnectedEmailMutation,
  useStartEmailAuthMutation,
  useUnarchiveEmailMessageMutation,
  useUpdateEmailMessageTagsMutation,
} from '@/modules/email/hooks';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { PanelLeftOpen } from 'lucide-react';

interface MailboxPageProps {
  mailbox?: EmailMailboxKey;
  accountSlug?: string;
}

const emails = emailData as EmailListItem[];
const DEFAULT_AGENT_LAYOUT: EmailAgentLayout = {
  open: false,
  width: 392,
  pushesContent: false,
  hidesEmailList: false,
};

export function MailboxPage({ mailbox, accountSlug }: MailboxPageProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [agentLayout, setAgentLayout] = useState<EmailAgentLayout>(DEFAULT_AGENT_LAYOUT);
  const [emailListVisible, setEmailListVisible] = useState(true);
  const [mailboxSidebarCollapsed, setMailboxSidebarCollapsed] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{
    viewKey: string;
    folder: string;
    emailId: string;
  } | null>(null);
  const accountsQuery = useEmailAccountsQuery();
  const isConnectedRoute = Boolean(accountSlug);
  const connectedAccount = accountSlug
    ? (accountsQuery.data?.find(
        (account) => getEmailAccountSlug(account) === accountSlug || account.id === accountSlug
      ) ?? null)
    : null;
  const isConnected = Boolean(connectedAccount);
  const foldersQuery = useEmailFoldersQuery(connectedAccount?.id);
  const tagsQuery = useEmailTagsQuery(connectedAccount?.id);
  const selectedConnectedFolder = isConnected
    ? (foldersQuery.data?.find((folder) => folder.id === selectedFolder) ??
      foldersQuery.data?.find((folder) => folder.key === selectedFolder) ??
      null)
    : null;
  const messagesQuery = useEmailMessagesQuery(
    connectedAccount?.id,
    selectedConnectedFolder
      ? { id: selectedConnectedFolder.id }
      : { key: selectedFolder as EmailFolderKey }
  );
  const startAuthMutation = useStartEmailAuthMutation();
  const sendMutation = useSendConnectedEmailMutation();
  const createFolderMutation = useCreateEmailFolderMutation();
  const createTagMutation = useCreateEmailTagMutation();
  const moveMessageMutation = useMoveEmailMessageMutation();
  const archiveMessageMutation = useArchiveEmailMessageMutation();
  const unarchiveMessageMutation = useUnarchiveEmailMessageMutation();
  const deleteMessageMutation = useDeleteEmailMessageMutation();
  const updateTagsMutation = useUpdateEmailMessageTagsMutation();
  const connectedEmails = useMemo<EmailListItem[]>(
    () =>
      (messagesQuery.data ?? []).map<EmailListItem>((email) => ({
        ...email,
        mailbox: connectedAccount?.id ?? 'connected',
        folder: email.folderId ?? selectedFolder,
      })),
    [connectedAccount?.id, messagesQuery.data, selectedFolder]
  );
  const mailboxEmails = useMemo(
    () =>
      isConnected
        ? connectedEmails
        : emails.filter((email) => mailbox && email.mailbox === mailbox),
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
  const viewKey = connectedAccount
    ? `account:${connectedAccount.id}`
    : `mailbox:${mailbox ?? 'unknown'}`;
  const selectedEmailId =
    selectedTarget?.viewKey === viewKey && selectedTarget.folder === selectedFolder
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
  const selectedFolderLabel =
    selectedConnectedFolder?.name ??
    foldersQuery.data?.find((folder) => folder.key === selectedFolder)?.name;
  const isArchiveFolder = selectedConnectedFolder?.key === 'archive';
  const inboxFolderId = foldersQuery.data?.find((folder) => folder.key === 'inbox')?.id ?? null;
  const archiveFolderId = foldersQuery.data?.find((folder) => folder.key === 'archive')?.id ?? null;
  const deletedFolderId = foldersQuery.data?.find((folder) => folder.key === 'deleted')?.id ?? null;
  const isMailboxLoading = isConnectedRoute
    ? accountsQuery.isLoading || messagesQuery.isLoading
    : false;
  const isMailboxError = isConnectedRoute ? accountsQuery.isError || messagesQuery.isError : false;
  const showEmailList = emailListVisible || !agentLayout.hidesEmailList;

  useEffect(() => {
    if (accountSlug) {
      window.localStorage.setItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY, accountSlug);
    }
  }, [accountSlug]);

  useEffect(() => {
    if (!accountsQuery.data) return;

    const accounts = accountsQuery.data.map((account) => ({
      id: account.id,
      slug: getEmailAccountSlug(account),
      email: account.email,
      mailboxAddress: account.mailboxAddress,
      displayName: account.displayName,
      provider: account.provider,
    }));

    window.localStorage.setItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accountsQuery.data]);

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
          folders={isConnected ? foldersQuery.data : undefined}
          collapsed={mailboxSidebarCollapsed}
          isAddingAccount={startAuthMutation.isPending}
          isCreatingFolder={createFolderMutation.isPending}
          onSelectFolder={setSelectedFolder}
          onCompose={() => setComposeOpen(true)}
          onCreateFolder={
            connectedAccount
              ? (name) =>
                  createFolderMutation.mutate(
                    { accountId: connectedAccount.id, name },
                    {
                      onSuccess: (folder) => setSelectedFolder(folder.id),
                    }
                  )
              : undefined
          }
          onAddAccount={(provider) => startAuthMutation.mutate(provider)}
          onCollapsedChange={setMailboxSidebarCollapsed}
        />
        {showEmailList ? (
          <EmailListPane
            mailbox={mailbox ?? connectedAccount?.id ?? 'connected'}
            folder={selectedFolder}
            folderLabel={selectedFolderLabel}
            emails={isConnected ? folderEmails : undefined}
            isLoading={isMailboxLoading}
            isError={isMailboxError}
            selectedEmailId={selectedEmailId}
            onSelectEmail={(emailId) =>
              setSelectedTarget({ viewKey, folder: selectedFolder, emailId })
            }
            onRetry={() => messagesQuery.refetch()}
          />
        ) : null}
        <EmailReadingPane
          email={visibleEmail}
          mailboxAddress={address}
          isLoading={isMailboxLoading}
          isError={isMailboxError}
          folders={isConnected ? foldersQuery.data : undefined}
          tags={isConnected ? tagsQuery.data : undefined}
          isUpdatingTags={updateTagsMutation.isPending}
          isCreatingTag={createTagMutation.isPending}
          archiveActionLabel={isArchiveFolder ? 'Unarchive' : 'Archive'}
          onMoveToFolder={
            connectedAccount
              ? (messageId, folderId) => {
                  setSelectedFolder(folderId);
                  setSelectedTarget({ viewKey, folder: folderId, emailId: messageId });
                  moveMessageMutation.mutate({
                    accountId: connectedAccount.id,
                    messageId,
                    folderId,
                  });
                }
              : undefined
          }
          onToggleTag={
            connectedAccount
              ? (messageId, tag, enabled) =>
                  updateTagsMutation.mutate({
                    accountId: connectedAccount.id,
                    messageId,
                    add: enabled ? [tag.providerId] : [],
                    remove: enabled ? [] : [tag.providerId],
                  })
              : undefined
          }
          onCreateTag={
            connectedAccount
              ? (name) => createTagMutation.mutate({ accountId: connectedAccount.id, name })
              : undefined
          }
          onArchive={
            connectedAccount
              ? (messageId) => {
                  setSelectedTarget(null);
                  if (isArchiveFolder) {
                    unarchiveMessageMutation.mutate({
                      accountId: connectedAccount.id,
                      messageId,
                      targetFolderId: inboxFolderId,
                    });
                    return;
                  }

                  archiveMessageMutation.mutate({
                    accountId: connectedAccount.id,
                    messageId,
                    targetFolderId: archiveFolderId,
                  });
                }
              : undefined
          }
          onDelete={
            connectedAccount
              ? (messageId) => {
                  setSelectedTarget(null);
                  deleteMessageMutation.mutate({
                    accountId: connectedAccount.id,
                    messageId,
                    targetFolderId: deletedFolderId,
                  });
                }
              : undefined
          }
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
  return mailboxEmails.reduce<Partial<Record<string, number>>>((counts, email) => {
    const folder = email.folder;
    counts[folder] = (counts[folder] ?? 0) + 1;
    return counts;
  }, {});
}

function getConnectedFolderCounts(
  folders: Array<{ key: string | null; totalCount: number }>
): Partial<Record<string, number>> {
  return folders.reduce<Partial<Record<string, number>>>((counts, folder) => {
    const key = folder.key?.toLowerCase();
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
