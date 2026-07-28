import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import {
  EmailAgentPanel,
  type EmailAgentLayout,
} from '@/modules/email/components/email-agent-panel';
import { EmailComposeDialog } from '@/modules/email/components/email-compose-dialog';
import { EmailListPane } from '@/modules/email/components/email-list-pane';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import { EmailReconnectRequiredState } from '@/modules/email/components/email-reconnect-required-state';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { MailboxSidebar } from '@/modules/email/components/mailbox-sidebar';
import {
  EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
  EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
} from '@/modules/email/constants/email-account-storage';
import { EMAIL_FOLDERS, type EmailFolderKey } from '@/modules/email/constants/email-folders';
import { EMAIL_MAILBOXES, type EmailMailboxKey } from '@/modules/email/constants/email-mailboxes';
import emailData from '@/modules/email/data/emails.json';
import {
  useArchiveEmailMessageMutation,
  useBoundedEmailSyncIndicator,
  useCreateEmailFolderMutation,
  useCreateEmailTagMutation,
  useDeleteEmailMessageMutation,
  useDisconnectEmailAccountMutation,
  useEmailAccountsQuery,
  useEmailConversationQuery,
  useEmailFoldersQuery,
  useEmailMessageQuery,
  useEmailMessagesQuery,
  useEmailTagsQuery,
  useMoveEmailMessageMutation,
  usePermanentlyDeleteEmailMessageMutation,
  useRefreshEmailMessagesMutation,
  useReplyConnectedEmailMutation,
  useSendConnectedEmailMutation,
  useStartEmailAuthMutation,
  useUnarchiveEmailMessageMutation,
  useUpdateEmailMessageStatusMutation,
  useUpdateEmailMessageTagsMutation,
} from '@/modules/email/hooks';
import { isEmailReconnectRequiredError } from '@/modules/email/lib/email-errors';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { PanelLeftOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MailboxPageProps {
  mailbox?: EmailMailboxKey;
  accountSlug?: string;
}

const emails = emailData as EmailListItem[];
const CONNECTED_EMAIL_PAGE_SIZE = 100;
const CONNECTED_WELL_KNOWN_FOLDER_KEYS = new Set<string>([
  'inbox',
  'drafts',
  'sent',
  'deleted',
  'junk',
  'archive',
]);
const DEFAULT_AGENT_LAYOUT: EmailAgentLayout = {
  open: false,
  width: 392,
  pushesContent: false,
  hidesEmailList: false,
};

export function MailboxPage({ mailbox, accountSlug }: MailboxPageProps) {
  const navigate = useNavigate();
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [messageSearch, setMessageSearch] = useState('');
  const debouncedMessageSearch = useDebouncedValue(messageSearch.trim(), 300);
  const attemptedInitialSyncs = useRef(new Set<string>());
  const [composeOpen, setComposeOpen] = useState(false);
  const [agentLayout, setAgentLayout] = useState<EmailAgentLayout>(DEFAULT_AGENT_LAYOUT);
  const [emailListVisible, setEmailListVisible] = useState(true);
  const [mailboxSidebarCollapsed, setMailboxSidebarCollapsed] = useState(false);
  const [reconnectRequiredAccountId, setReconnectRequiredAccountId] = useState<string | null>(null);
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
  const hasPersistedReconnectState =
    connectedAccount?.status.toUpperCase() === 'ERROR' ||
    connectedAccount?.freshness?.errorCode === 'EMAIL_RECONNECT_REQUIRED';
  const canLoadConnectedMailbox =
    Boolean(connectedAccount) &&
    !hasPersistedReconnectState &&
    reconnectRequiredAccountId !== connectedAccount?.id;
  const foldersQuery = useEmailFoldersQuery(connectedAccount?.id, canLoadConnectedMailbox);
  const tagsQuery = useEmailTagsQuery(connectedAccount?.id, canLoadConnectedMailbox);
  const selectedConnectedFolder = isConnected
    ? (foldersQuery.data?.find((folder) => folder.id === selectedFolder) ??
      foldersQuery.data?.find((folder) => folder.key === selectedFolder) ??
      null)
    : null;
  const selectedFolderQuery = isConnectedWellKnownFolderKey(selectedFolder)
    ? { key: selectedFolder }
    : { id: selectedConnectedFolder?.id ?? selectedFolder };
  const messagesQuery = useEmailMessagesQuery(
    connectedAccount?.id,
    selectedFolderQuery,
    {
      size: CONNECTED_EMAIL_PAGE_SIZE,
      search: debouncedMessageSearch || undefined,
    },
    canLoadConnectedMailbox
  );
  const startAuthMutation = useStartEmailAuthMutation();
  const refreshMessagesMutation = useRefreshEmailMessagesMutation();
  const disconnectAccountMutation = useDisconnectEmailAccountMutation();
  const sendMutation = useSendConnectedEmailMutation();
  const replyMutation = useReplyConnectedEmailMutation();
  const createFolderMutation = useCreateEmailFolderMutation();
  const createTagMutation = useCreateEmailTagMutation();
  const moveMessageMutation = useMoveEmailMessageMutation();
  const archiveMessageMutation = useArchiveEmailMessageMutation();
  const unarchiveMessageMutation = useUnarchiveEmailMessageMutation();
  const deleteMessageMutation = useDeleteEmailMessageMutation();
  const permanentlyDeleteMessageMutation = usePermanentlyDeleteEmailMessageMutation();
  const updateMessageStatusMutation = useUpdateEmailMessageStatusMutation();
  const updateTagsMutation = useUpdateEmailMessageTagsMutation();
  const loadedEmailPages = useMemo(
    () => messagesQuery.data?.pages ?? [],
    [messagesQuery.data?.pages]
  );
  const providerTotalCount = loadedEmailPages.find(
    (page) => page.totalCount !== null && page.totalCount !== undefined
  )?.totalCount;
  const connectedEmails = useMemo<EmailListItem[]>(() => {
    const conversations = new Map<string, EmailListItem>();
    for (const page of loadedEmailPages) {
      for (const email of page.records) {
        const key = email.conversationKey ?? email.threadId ?? email.id;
        if (conversations.has(key)) continue;
        conversations.set(key, {
          ...email,
          mailbox: connectedAccount?.id ?? 'connected',
          folder: email.folderId ?? selectedFolder,
          latestMessageId: email.id,
        });
      }
    }
    return Array.from(conversations.values());
  }, [connectedAccount?.id, loadedEmailPages, selectedFolder]);
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
    isConnected ? selectedEmail?.threadId : null,
    canLoadConnectedMailbox
  );
  const messageDetailQuery = useEmailMessageQuery(
    connectedAccount?.id,
    selectedEmail?.latestMessageId ?? selectedEmail?.id,
    canLoadConnectedMailbox && isConnected && !selectedEmail?.threadId
  );
  const hasReconnectRequiredResponse =
    [
      foldersQuery.error,
      tagsQuery.error,
      messagesQuery.error,
      conversationQuery.error,
      messageDetailQuery.error,
    ].some(isEmailReconnectRequiredError) ||
    (refreshMessagesMutation.variables?.accountId === connectedAccount?.id &&
      isEmailReconnectRequiredError(refreshMessagesMutation.error));
  const isReconnectRequired = Boolean(
    connectedAccount &&
    (hasPersistedReconnectState ||
      reconnectRequiredAccountId === connectedAccount.id ||
      hasReconnectRequiredResponse)
  );
  const visibleEmail =
    isConnected && selectedEmail && conversationQuery.data?.length
      ? { ...selectedEmail, threadMessages: conversationQuery.data }
      : isConnected && selectedEmail && messageDetailQuery.data
        ? { ...selectedEmail, ...messageDetailQuery.data }
        : selectedEmail;
  const selectedFolderKey = selectedConnectedFolder?.key ?? selectedFolder;
  const selectedFolderLabel =
    EMAIL_FOLDERS.find((folder) => folder.key === selectedFolderKey)?.label ??
    selectedConnectedFolder?.name ??
    foldersQuery.data?.find((folder) => folder.key === selectedFolder)?.name;
  const isArchiveFolder = selectedConnectedFolder?.key === 'archive';
  const isDeletedFolder = selectedFolderKey === 'deleted';
  const inboxFolderId = foldersQuery.data?.find((folder) => folder.key === 'inbox')?.id ?? null;
  const archiveFolderId = foldersQuery.data?.find((folder) => folder.key === 'archive')?.id ?? null;
  const deletedFolderId = foldersQuery.data?.find((folder) => folder.key === 'deleted')?.id ?? null;
  const activeFreshness = messagesQuery.data?.pages[0]?.freshness ?? connectedAccount?.freshness;
  const hasCachedMessages = loadedEmailPages.some((page) => page.records.length > 0);
  const showEmailSyncIndicator = useBoundedEmailSyncIndicator(
    refreshMessagesMutation.isPending,
    `${connectedAccount?.id ?? 'no-account'}:${refreshMessagesMutation.submittedAt}`
  );
  const isInitialSyncing =
    isConnected && showEmailSyncIndicator && !activeFreshness?.lastSyncedAt && !hasCachedMessages;
  const isMailboxLoading = isConnectedRoute
    ? accountsQuery.isLoading || messagesQuery.isLoading || isInitialSyncing
    : false;
  const isMailboxError = isConnectedRoute
    ? accountsQuery.isError ||
      (messagesQuery.isError && !messagesQuery.data) ||
      (activeFreshness?.state === 'error' &&
        !hasCachedMessages &&
        !refreshMessagesMutation.isPending)
    : false;
  const isReadingLoading =
    isMailboxLoading ||
    Boolean(
      isConnected &&
      selectedEmail &&
      !conversationQuery.data?.length &&
      !messageDetailQuery.data &&
      (conversationQuery.isLoading || messageDetailQuery.isLoading)
    );
  const isReadingError =
    isMailboxError ||
    Boolean(
      selectedEmail &&
      ((conversationQuery.isError && !conversationQuery.data) ||
        (messageDetailQuery.isError && !messageDetailQuery.data))
    );
  const showEmailList = emailListVisible || !agentLayout.hidesEmailList;
  const lastOpenedMessageKey = useRef<string | null>(null);

  useEffect(() => {
    if (!connectedAccount || !hasReconnectRequiredResponse) return;
    const timeout = window.setTimeout(() => {
      setReconnectRequiredAccountId(connectedAccount.id);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [connectedAccount, hasReconnectRequiredResponse]);

  useEffect(() => {
    if (!connectedAccount || !selectedEmail) return;

    const messageId = selectedEmail.latestMessageId ?? selectedEmail.id;
    const openedMessageKey = `${connectedAccount.id}:${selectedFolder}:${messageId}`;
    if (lastOpenedMessageKey.current === openedMessageKey) return;

    lastOpenedMessageKey.current = openedMessageKey;
    if (!selectedEmail.unread) return;

    updateMessageStatusMutation.mutate({
      accountId: connectedAccount.id,
      messageId,
      unread: false,
    });
  }, [connectedAccount, selectedEmail, selectedFolder, updateMessageStatusMutation]);

  useEffect(() => {
    if (accountSlug) {
      window.localStorage.setItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY, accountSlug);
    }
  }, [accountSlug]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSelectedFolder('inbox');
      setSelectedTarget(null);
      setMessageSearch('');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [connectedAccount?.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSelectedTarget(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [connectedAccount?.id, debouncedMessageSearch, selectedFolder]);

  useEffect(() => {
    const accountId = connectedAccount?.id;
    const freshness = messagesQuery.data?.pages[0]?.freshness ?? connectedAccount?.freshness;
    if (
      !accountId ||
      isReconnectRequired ||
      !messagesQuery.isSuccess ||
      !freshness ||
      freshness.state === 'fresh' ||
      freshness.syncing
    ) {
      return;
    }
    if (attemptedInitialSyncs.current.has(accountId) || refreshMessagesMutation.isPending) return;

    attemptedInitialSyncs.current.add(accountId);
    refreshMessagesMutation.mutate({ accountId });
  }, [
    connectedAccount?.freshness,
    connectedAccount?.id,
    isReconnectRequired,
    messagesQuery.data?.pages,
    messagesQuery.isSuccess,
    refreshMessagesMutation,
  ]);

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

  const handleDisconnectAccount = useCallback(() => {
    if (!connectedAccount) return;

    const remainingAccounts =
      accountsQuery.data?.filter((account) => account.id !== connectedAccount.id) ?? [];
    const nextAccount = remainingAccounts[0] ?? null;
    const nextPath = nextAccount
      ? `/app/email/accounts/${getEmailAccountSlug(nextAccount)}`
      : `/app/email/${EMAIL_MAILBOXES[0].key}`;

    if (typeof window !== 'undefined') {
      if (nextAccount) {
        window.localStorage.setItem(
          EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
          getEmailAccountSlug(nextAccount)
        );
      } else {
        window.localStorage.removeItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
      }
    }

    setSelectedTarget(null);
    setSelectedFolder('inbox');
    navigate(nextPath, { replace: true });
    disconnectAccountMutation.mutate({ accountId: connectedAccount.id });
  }, [accountsQuery.data, connectedAccount, disconnectAccountMutation, navigate]);

  if (isReconnectRequired && connectedAccount) {
    return (
      <div className="relative h-[calc(100dvh-var(--header-height-mobile))] overflow-hidden bg-background lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
        <div className="flex h-full min-w-0">
          <MailboxSidebar
            mailboxAddress={address}
            selectedFolder={selectedFolder}
            folderCounts={{}}
            collapsed={mailboxSidebarCollapsed}
            isAddingAccount={startAuthMutation.isPending}
            isDisconnectingAccount={disconnectAccountMutation.isPending}
            onSelectFolder={setSelectedFolder}
            onCompose={() => undefined}
            onDisconnectAccount={handleDisconnectAccount}
            onAddAccount={(provider) => startAuthMutation.mutate(provider)}
            onCollapsedChange={setMailboxSidebarCollapsed}
          />
          <EmailReconnectRequiredState
            provider={connectedAccount.provider}
            email={connectedAccount.mailboxAddress ?? connectedAccount.email}
            isReconnecting={startAuthMutation.isPending}
            onReconnect={() => startAuthMutation.mutate(connectedAccount.provider)}
          />
        </div>
      </div>
    );
  }

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
          isDisconnectingAccount={disconnectAccountMutation.isPending}
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
          onDisconnectAccount={connectedAccount ? handleDisconnectAccount : undefined}
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
            onRetry={() => {
              if (!connectedAccount) {
                messagesQuery.refetch();
                return;
              }

              refreshMessagesMutation.mutate({ accountId: connectedAccount.id });
            }}
            totalCount={isConnected ? providerTotalCount : undefined}
            hasNextPage={isConnected && Boolean(messagesQuery.hasNextPage)}
            isLoadingMore={messagesQuery.isFetchingNextPage}
            loadMoreError={messagesQuery.isFetchNextPageError}
            onLoadMore={messagesQuery.fetchNextPage}
            isRefreshing={
              refreshMessagesMutation.isPending ||
              (messagesQuery.isFetching && !messagesQuery.isFetchingNextPage)
            }
            groupByMonth={
              isConnected && (selectedFolderKey === 'inbox' || selectedFolderKey === 'sent')
            }
            search={messageSearch}
            onSearchChange={(value) => {
              setMessageSearch(value);
            }}
          />
        ) : null}
        <EmailReadingPane
          email={visibleEmail}
          accountId={connectedAccount?.id}
          mailboxAddress={address}
          isLoading={isReadingLoading}
          isError={isReadingError}
          onRetry={() => {
            if (connectedAccount) {
              refreshMessagesMutation.mutate({ accountId: connectedAccount.id });
            }
          }}
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
            connectedAccount && !isDeletedFolder
              ? (messageId) => {
                  deleteMessageMutation.mutate(
                    {
                      accountId: connectedAccount.id,
                      messageId,
                      targetFolderId: deletedFolderId,
                    },
                    { onSuccess: () => setSelectedTarget(null) }
                  );
                }
              : undefined
          }
          onPermanentDelete={
            connectedAccount && isDeletedFolder
              ? async (messageId) => {
                  await permanentlyDeleteMessageMutation.mutateAsync({
                    accountId: connectedAccount.id,
                    messageId,
                  });
                  setSelectedTarget(null);
                }
              : undefined
          }
          isPermanentlyDeleting={permanentlyDeleteMessageMutation.isPending}
          onMarkUnread={
            connectedAccount
              ? (messageId) =>
                  updateMessageStatusMutation.mutate({
                    accountId: connectedAccount.id,
                    messageId,
                    unread: true,
                  })
              : undefined
          }
          isUpdatingReadStatus={updateMessageStatusMutation.isPending}
          onReply={
            connectedAccount
              ? (messageId, body) =>
                  replyMutation.mutateAsync({
                    accountId: connectedAccount.id,
                    messageId,
                    body: textToHtml(body),
                    bodyType: 'html',
                    subject: selectedEmail?.subject,
                  })
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
            attachments: payload.attachments,
          });
          if (selectedFolder === 'sent') {
            await refreshMessagesMutation
              .mutateAsync({ accountId: connectedAccount.id })
              .catch(() => undefined);
          }
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
): Partial<Record<string, number | string>> {
  return folders.reduce<Partial<Record<string, number | string>>>((counts, folder) => {
    const key = folder.key?.toLowerCase();
    if (!key || folder.totalCount <= 0) return counts;
    counts[key] = folder.totalCount >= 100 ? '100+' : folder.totalCount;
    return counts;
  }, {});
}

function isConnectedWellKnownFolderKey(folder: string): folder is EmailFolderKey {
  return CONNECTED_WELL_KNOWN_FOLDER_KEYS.has(folder);
}

function parseEmailAddresses(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((address) => ({ address }));
}

function textToHtml(value: string) {
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, '<br />'))
    .map((paragraph) => `<p>${paragraph || '<br />'}</p>`)
    .join('');
}
