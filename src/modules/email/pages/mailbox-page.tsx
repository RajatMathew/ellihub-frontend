import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import { emailApi, type EmailDraftResult } from '@/modules/email/api';
import { EmailAccountNicknameDialog } from '@/modules/email/components/email-account-nickname-dialog';
import type { EmailAgentLayout } from '@/modules/email/components/email-agent-panel';
import type { EditableComposeDraft } from '@/modules/email/components/email-compose-dialog';
import { EmailListPane } from '@/modules/email/components/email-list-pane';
import {
  EmailMailToolbar,
  type EmailListFilter,
} from '@/modules/email/components/email-mail-toolbar';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import { EmailReconnectRequiredState } from '@/modules/email/components/email-reconnect-required-state';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  EmailWorkspaceHeader,
  type EmailWorkspaceView,
} from '@/modules/email/components/email-workspace-header';
import { EmailWorkspacePlaceholder } from '@/modules/email/components/email-workspace-placeholder';
import { EMAIL_FOLDERS, type EmailFolderKey } from '@/modules/email/constants/email-folders';
import {
  emailKeys,
  useArchiveEmailMessageMutation,
  useBoundedEmailSyncIndicator,
  useCancelEmailMeetingMutation,
  useCreateEmailFolderMutation,
  useCreateEmailTagMutation,
  useDeleteEmailDraftMutation,
  useDeleteEmailMessageMutation,
  useDisconnectEmailAccountMutation,
  useEmailAccountsQuery,
  useEmailConversationQuery,
  useEmailFoldersQuery,
  useEmailMessageQuery,
  useEmailMessagesQuery,
  useEmailTagsQuery,
  useMoveEmailMessageMutation,
  useOpenEmailDraftMutation,
  usePermanentlyDeleteEmailMessageMutation,
  useRefreshEmailMessagesMutation,
  useReplyConnectedEmailMutation,
  useRespondToEmailMeetingMutation,
  useSaveEmailDraftMutation,
  useSendEmailDraftMutation,
  useStartEmailAuthMutation,
  useUnarchiveEmailMessageMutation,
  useUpdateEmailAccountNicknameMutation,
  useUpdateEmailMeetingMutation,
  useUpdateEmailMessageStatusMutation,
  useUpdateEmailMessageTagsMutation,
} from '@/modules/email/hooks';
import { parseEmailAddresses } from '@/modules/email/lib/email-addresses';
import { plainTextToEmailHtml } from '@/modules/email/lib/email-body-format';
import { isEmailReconnectRequiredError } from '@/modules/email/lib/email-errors';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { useQueryClient } from '@tanstack/react-query';
import { PanelLeftOpen } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

interface MailboxPageProps {
  accountSlug?: string;
}

const CONNECTED_EMAIL_PAGE_SIZE = 100;
const EMAIL_SEARCH_DEBOUNCE_MS = 150;
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

const EmailAgentPanel = lazy(() =>
  import('@/modules/email/components/email-agent-panel').then((module) => ({
    default: module.EmailAgentPanel,
  }))
);
const EmailComposeDialog = lazy(() =>
  import('@/modules/email/components/email-compose-dialog').then((module) => ({
    default: module.EmailComposeDialog,
  }))
);

export function MailboxPage({ accountSlug }: MailboxPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [messageSearch, setMessageSearch] = useState('');
  const debouncedMessageSearch = useDebouncedValue(messageSearch.trim(), EMAIL_SEARCH_DEBOUNCE_MS);
  const attemptedInitialSyncs = useRef(new Set<string>());
  const agentTriggerRef = useRef<HTMLButtonElement>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeLoaded, setComposeLoaded] = useState(false);
  const [composeDraft, setComposeDraft] = useState<EditableComposeDraft | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentLayout, setAgentLayout] = useState<EmailAgentLayout>(DEFAULT_AGENT_LAYOUT);
  const [emailListVisible, setEmailListVisible] = useState(true);
  const [mailFilter, setMailFilter] = useState<EmailListFilter>('all');
  const [mobilePane, setMobilePane] = useState<'list' | 'reading'>('list');
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [reconnectRequiredAccountId, setReconnectRequiredAccountId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<{
    viewKey: string;
    folder: string;
    emailId: string;
  } | null>(null);
  const accountsQuery = useEmailAccountsQuery();
  const workspaceView = getWorkspaceView(searchParams.get('view'));
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
  const needsCalendarReauthorization =
    connectedAccount?.provider === 'outlook' &&
    connectedAccount.calendarAccess === 'reauthorizationRequired';
  const canLoadConnectedMailbox =
    Boolean(connectedAccount) &&
    workspaceView === 'mail' &&
    !hasPersistedReconnectState &&
    !needsCalendarReauthorization &&
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
  const updateAccountNicknameMutation = useUpdateEmailAccountNicknameMutation();
  const refreshMessagesMutation = useRefreshEmailMessagesMutation();
  const disconnectAccountMutation = useDisconnectEmailAccountMutation();
  const openDraftMutation = useOpenEmailDraftMutation();
  const saveDraftMutation = useSaveEmailDraftMutation();
  const sendDraftMutation = useSendEmailDraftMutation();
  const deleteDraftMutation = useDeleteEmailDraftMutation();
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
  const respondToMeetingMutation = useRespondToEmailMeetingMutation();
  const updateMeetingMutation = useUpdateEmailMeetingMutation();
  const cancelMeetingMutation = useCancelEmailMeetingMutation();
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
        const key =
          selectedFolderQuery.key === 'drafts'
            ? email.id
            : (email.conversationKey ?? email.threadId ?? email.id);
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
  }, [connectedAccount?.id, loadedEmailPages, selectedFolder, selectedFolderQuery.key]);
  const emailsForActiveSearch = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    const isWaitingForServerSearch =
      query !== debouncedMessageSearch.toLowerCase() || messagesQuery.isPlaceholderData;
    if (!query || !isWaitingForServerSearch) return connectedEmails;
    return connectedEmails.filter((email) => matchesEmailSearch(email, query));
  }, [connectedEmails, debouncedMessageSearch, messageSearch, messagesQuery.isPlaceholderData]);
  const folderEmails = useMemo(() => {
    if (mailFilter === 'unread') return emailsForActiveSearch.filter((email) => email.unread);
    if (mailFilter === 'attachments') {
      return emailsForActiveSearch.filter(
        (email) => Boolean(email.attachmentCount) || Boolean(email.attachments?.length)
      );
    }
    return emailsForActiveSearch;
  }, [emailsForActiveSearch, mailFilter]);
  const defaultEmailId = folderEmails.find((email) => email.selected)?.id ?? folderEmails[0]?.id;
  const viewKey = `account:${connectedAccount?.id ?? accountSlug ?? 'unknown'}`;
  const selectedEmailId =
    selectedTarget?.viewKey === viewKey && selectedTarget.folder === selectedFolder
      ? selectedTarget.emailId
      : defaultEmailId;
  const address = connectedAccount?.mailboxAddress ?? connectedAccount?.email ?? 'email';
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
      respondToMeetingMutation.error,
      updateMeetingMutation.error,
      cancelMeetingMutation.error,
    ].some(isEmailReconnectRequiredError) ||
    (refreshMessagesMutation.variables?.accountId === connectedAccount?.id &&
      isEmailReconnectRequiredError(refreshMessagesMutation.error));
  const isReconnectRequired = Boolean(
    connectedAccount &&
    (hasPersistedReconnectState ||
      needsCalendarReauthorization ||
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
  const isReadingLoading = isMailboxLoading && !selectedEmail;
  const isReadingError = isMailboxError && !selectedEmail;
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
      conversationKey: selectedEmail.conversationKey ?? selectedEmail.threadId ?? undefined,
      threadId: selectedEmail.threadId ?? undefined,
      unread: false,
    });
  }, [connectedAccount, selectedEmail, selectedFolder, updateMessageStatusMutation]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSelectedFolder('inbox');
      setSelectedTarget(null);
      setMessageSearch('');
      setMailFilter('all');
      setMobilePane('list');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [connectedAccount?.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSelectedTarget(null);
      setMobilePane('list');
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

  const handleAgentLayoutChange = useCallback((layout: EmailAgentLayout) => {
    setAgentLayout(layout);
    if (layout.hidesEmailList) {
      setEmailListVisible(false);
      return;
    }
    setEmailListVisible(true);
  }, []);

  const openNewCompose = useCallback(() => {
    setComposeDraft(null);
    setComposeLoaded(true);
    setComposeOpen(true);
  }, []);

  const setWorkspaceView = useCallback(
    (view: EmailWorkspaceView) => {
      const next = new URLSearchParams(searchParams);
      if (view === 'mail') next.delete('view');
      else next.set('view', view);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const selectEmail = useCallback(
    (emailId: string) => {
      setSelectedTarget({ viewKey, folder: selectedFolder, emailId });
      setMobilePane('reading');
    },
    [selectedFolder, viewKey]
  );

  useEffect(() => {
    if (!isConnected || workspaceView !== 'mail') return;

    const handleComposeShortcut = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'n' ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest('[role="dialog"], [role="menu"]')) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      openNewCompose();
    };

    window.addEventListener('keydown', handleComposeShortcut, { capture: true });
    return () => window.removeEventListener('keydown', handleComposeShortcut, { capture: true });
  }, [isConnected, openNewCompose, workspaceView]);

  const prefetchEmail = useCallback(
    (email: EmailListItem) => {
      if (!connectedAccount) return;

      if (email.threadId) {
        void queryClient.prefetchQuery({
          queryKey: emailKeys.conversation(connectedAccount.id, email.threadId),
          queryFn: () => emailApi.listConversation(connectedAccount.id, email.threadId!),
          staleTime: 60 * 1000,
        });
        return;
      }

      const messageId = email.latestMessageId ?? email.id;
      void queryClient.prefetchQuery({
        queryKey: emailKeys.message(connectedAccount.id, messageId),
        queryFn: () => emailApi.getMessage(connectedAccount.id, messageId),
        staleTime: 60 * 1000,
      });
    },
    [connectedAccount, queryClient]
  );

  const selectedEmailIndex = folderEmails.findIndex((email) => email.id === selectedEmailId);
  const previousEmail = selectedEmailIndex > 0 ? folderEmails[selectedEmailIndex - 1] : null;
  const nextEmail =
    selectedEmailIndex >= 0 && selectedEmailIndex < folderEmails.length - 1
      ? folderEmails[selectedEmailIndex + 1]
      : null;

  useEffect(() => {
    if (previousEmail) prefetchEmail(previousEmail);
    if (nextEmail) prefetchEmail(nextEmail);
  }, [nextEmail, prefetchEmail, previousEmail]);

  useEffect(() => {
    if (workspaceView !== 'mail') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        target?.closest('[role="dialog"], [role="menu"]')
      ) {
        return;
      }

      if (event.key === 'ArrowUp' && previousEmail) {
        event.preventDefault();
        selectEmail(previousEmail.id);
      }
      if (event.key === 'ArrowDown' && nextEmail) {
        event.preventDefault();
        selectEmail(nextEmail.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextEmail, previousEmail, selectEmail, workspaceView]);

  const handleDisconnectAccount = useCallback(() => {
    if (!connectedAccount) return;

    const remainingAccounts =
      accountsQuery.data?.filter((account) => account.id !== connectedAccount.id) ?? [];
    const nextAccount = remainingAccounts[0] ?? null;
    const nextPath = nextAccount
      ? `/app/email/accounts/${getEmailAccountSlug(nextAccount)}`
      : '/app/email';

    disconnectAccountMutation.mutate(
      { accountId: connectedAccount.id },
      {
        onSuccess: () => {
          setDisconnectConfirmOpen(false);
          setSelectedTarget(null);
          setSelectedFolder('inbox');
          navigate(nextPath, { replace: true });
        },
      }
    );
  }, [accountsQuery.data, connectedAccount, disconnectAccountMutation, navigate]);

  const closeNicknameDialog = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('setupNickname');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openNicknameDialog = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set('setupNickname', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const nicknameSetupRequired = Boolean(connectedAccount?.needsNickname);

  const nicknameDialog = connectedAccount ? (
    <EmailAccountNicknameDialog
      open={nicknameSetupRequired || searchParams.get('setupNickname') === '1'}
      required={nicknameSetupRequired}
      connectedAddress={connectedAccount.mailboxAddress ?? connectedAccount.email}
      defaultNickname={connectedAccount.nickname}
      isSaving={updateAccountNicknameMutation.isPending}
      onOpenChange={(open) => {
        if (!open && !nicknameSetupRequired) closeNicknameDialog();
      }}
      onSave={(nickname) =>
        updateAccountNicknameMutation.mutate(
          { accountId: connectedAccount.id, nickname },
          { onSuccess: closeNicknameDialog }
        )
      }
    />
  ) : null;
  const disconnectDialog = connectedAccount ? (
    <ConfirmDialog
      open={disconnectConfirmOpen}
      onOpenChange={(open) => {
        if (!disconnectAccountMutation.isPending) setDisconnectConfirmOpen(open);
      }}
      title="Disconnect this email account?"
      description={`${address} will be removed from Elli. Your provider mailbox and messages will not be deleted.`}
      confirmLabel={disconnectAccountMutation.isPending ? 'Disconnecting…' : 'Disconnect account'}
      variant="destructive"
      isPending={disconnectAccountMutation.isPending}
      keepOpenOnConfirm
      onConfirm={handleDisconnectAccount}
    />
  ) : null;

  if (!accountsQuery.isLoading && !accountsQuery.isError && !connectedAccount) {
    return <Navigate to="/app/email/add-account" replace />;
  }

  if (isReconnectRequired && connectedAccount) {
    return (
      <>
        <div className="flex h-[calc(100dvh-var(--header-height-mobile))] min-w-0 flex-col overflow-hidden bg-background lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
          <EmailWorkspaceHeader
            mailboxAddress={address}
            activeView={workspaceView}
            isDisconnectingAccount={disconnectAccountMutation.isPending}
            onViewChange={setWorkspaceView}
            onEditNickname={openNicknameDialog}
            onDisconnectAccount={() => setDisconnectConfirmOpen(true)}
          />
          {workspaceView === 'mail' ? (
            <EmailReconnectRequiredState
              provider={connectedAccount.provider}
              email={connectedAccount.mailboxAddress ?? connectedAccount.email}
              reason={
                needsCalendarReauthorization && !hasPersistedReconnectState
                  ? 'calendarPermission'
                  : 'authorization'
              }
              isReconnecting={startAuthMutation.isPending}
              onReconnect={() =>
                startAuthMutation.mutate({
                  provider: connectedAccount.provider,
                  loginHint: connectedAccount.mailboxAddress ?? connectedAccount.email,
                })
              }
            />
          ) : (
            <EmailWorkspacePlaceholder view={workspaceView} />
          )}
        </div>
        {nicknameDialog}
        {disconnectDialog}
      </>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-var(--header-height-mobile))] min-w-0 flex-col overflow-hidden bg-background lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <EmailWorkspaceHeader
        mailboxAddress={address}
        activeView={workspaceView}
        isDisconnectingAccount={disconnectAccountMutation.isPending}
        onViewChange={setWorkspaceView}
        onEditNickname={connectedAccount ? openNicknameDialog : undefined}
        onDisconnectAccount={connectedAccount ? () => setDisconnectConfirmOpen(true) : undefined}
      />

      {workspaceView === 'mail' ? (
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            agentLayout.pushesContent &&
              'motion-safe:transition-[padding-right] motion-safe:duration-150 motion-safe:ease-out',
            'motion-reduce:transition-none'
          )}
          style={{ paddingRight: agentLayout.pushesContent ? agentLayout.width : 0 }}
        >
          <EmailMailToolbar
            selectedFolder={selectedFolder}
            folders={foldersQuery.data}
            filter={mailFilter}
            search={messageSearch}
            isRefreshing={showEmailSyncIndicator}
            isCreatingFolder={createFolderMutation.isPending}
            onSelectFolder={(folder) => {
              setSelectedFolder(folder);
              setSelectedTarget(null);
              setMailFilter('all');
              setMobilePane('list');
            }}
            onFilterChange={setMailFilter}
            onSearchChange={setMessageSearch}
            onRefresh={() => {
              if (connectedAccount) {
                refreshMessagesMutation.mutate({ accountId: connectedAccount.id });
              }
            }}
            onCompose={openNewCompose}
            onCreateFolder={
              connectedAccount
                ? (name) =>
                    createFolderMutation.mutate(
                      { accountId: connectedAccount.id, name },
                      { onSuccess: (folder) => setSelectedFolder(folder.id) }
                    )
                : undefined
            }
          />

          <div className="flex min-h-0 flex-1 gap-3 bg-muted/30 p-3 lg:gap-4 lg:p-4">
            {showEmailList && (
              <div
                className={cn(
                  'h-full min-h-0 w-full shrink-0 lg:block lg:w-auto',
                  mobilePane === 'reading' && 'hidden'
                )}
              >
                <EmailListPane
                  mailbox={connectedAccount?.id ?? 'connected'}
                  folder={selectedFolder}
                  folderLabel={selectedFolderLabel}
                  emails={folderEmails}
                  isLoading={isMailboxLoading}
                  isError={isMailboxError}
                  selectedEmailId={selectedEmailId}
                  onSelectEmail={(emailId) => {
                    if (connectedAccount && selectedFolderKey === 'drafts') {
                      openDraftMutation.mutate(
                        { accountId: connectedAccount.id, messageId: emailId },
                        {
                          onSuccess: (result) => {
                            if (!result.message) return;
                            setComposeDraft(toEditableComposeDraft(result));
                            setComposeLoaded(true);
                            setComposeOpen(true);
                          },
                        }
                      );
                      return;
                    }
                    selectEmail(emailId);
                  }}
                  onRetry={() => {
                    if (connectedAccount) {
                      refreshMessagesMutation.mutate({ accountId: connectedAccount.id });
                    }
                  }}
                  totalCount={isConnected ? providerTotalCount : undefined}
                  hasNextPage={isConnected && Boolean(messagesQuery.hasNextPage)}
                  isLoadingMore={messagesQuery.isFetchingNextPage}
                  loadMoreError={messagesQuery.isFetchNextPageError}
                  onLoadMore={messagesQuery.fetchNextPage}
                  groupByMonth={
                    isConnected && (selectedFolderKey === 'inbox' || selectedFolderKey === 'sent')
                  }
                  search={messageSearch}
                  onSearchChange={setMessageSearch}
                  onPrefetchEmail={prefetchEmail}
                  onArchiveEmail={
                    connectedAccount && !isArchiveFolder
                      ? (email) =>
                          archiveMessageMutation.mutate({
                            accountId: connectedAccount.id,
                            messageId: email.latestMessageId ?? email.id,
                            targetFolderId: archiveFolderId,
                          })
                      : undefined
                  }
                  onDeleteEmail={
                    connectedAccount && !isDeletedFolder
                      ? (email) =>
                          deleteMessageMutation.mutate({
                            accountId: connectedAccount.id,
                            messageId: email.latestMessageId ?? email.id,
                            targetFolderId: deletedFolderId,
                          })
                      : undefined
                  }
                />
              </div>
            )}

            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-background',
                mobilePane === 'list' ? 'hidden lg:flex' : 'flex'
              )}
            >
              <EmailReadingPane
                email={visibleEmail}
                accountId={connectedAccount?.id}
                mailboxAddress={address}
                inlineImageBaseUrl={connectedAccount?.inlineImageBaseUrl}
                isLoading={isReadingLoading}
                isError={isReadingError}
                onPrevious={previousEmail ? () => selectEmail(previousEmail.id) : undefined}
                onNext={nextEmail ? () => selectEmail(nextEmail.id) : undefined}
                onBack={() => setMobilePane('list')}
                onOpenAgent={() => setAgentOpen(true)}
                agentTriggerRef={agentTriggerRef}
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
                          conversationKey:
                            selectedEmail?.conversationKey ?? selectedEmail?.threadId ?? undefined,
                          threadId: selectedEmail?.threadId ?? undefined,
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
                          body: plainTextToEmailHtml(body),
                          bodyType: 'html',
                          subject: selectedEmail?.subject,
                        })
                    : undefined
                }
                isRespondingToMeeting={respondToMeetingMutation.isPending}
                isUpdatingMeeting={updateMeetingMutation.isPending}
                isCancellingMeeting={cancelMeetingMutation.isPending}
                onRespondToMeeting={
                  connectedAccount
                    ? (messageId, response) =>
                        respondToMeetingMutation.mutateAsync({
                          accountId: connectedAccount.id,
                          messageId,
                          response,
                          sendResponse: true,
                        })
                    : undefined
                }
                onUpdateMeeting={
                  connectedAccount
                    ? (messageId, input) =>
                        updateMeetingMutation.mutateAsync({
                          accountId: connectedAccount.id,
                          messageId,
                          ...input,
                        })
                    : undefined
                }
                onCancelMeeting={
                  connectedAccount
                    ? (messageId, comment) =>
                        cancelMeetingMutation.mutateAsync({
                          accountId: connectedAccount.id,
                          messageId,
                          comment,
                        })
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      ) : (
        <EmailWorkspacePlaceholder view={workspaceView} />
      )}

      {workspaceView === 'mail' && !showEmailList && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-1/2 z-20 h-12 w-8 -translate-y-1/2 rounded-l-none border-l-0 bg-background/95 shadow-sm backdrop-blur-xs"
          style={{ left: 0 }}
          aria-label="Show inbox list"
          title="Show inbox list"
          onClick={() => setEmailListVisible(true)}
        >
          <PanelLeftOpen aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </Button>
      )}
      {workspaceView === 'mail' && agentOpen && (
        <Suspense fallback={null}>
          <EmailAgentPanel
            open={agentOpen}
            email={visibleEmail}
            mailboxAddress={address}
            onOpenChange={(open) => {
              setAgentOpen(open);
              if (!open) {
                handleAgentLayoutChange(DEFAULT_AGENT_LAYOUT);
                window.requestAnimationFrame(() => agentTriggerRef.current?.focus());
              }
            }}
            onLayoutChange={handleAgentLayoutChange}
            onRequestMailboxCollapse={() => setEmailListVisible(false)}
          />
        </Suspense>
      )}
      {composeLoaded && (
        <Suspense fallback={null}>
          <EmailComposeDialog
            open={composeOpen}
            mailboxAddress={address}
            initialDraft={composeDraft}
            isSending={sendDraftMutation.isPending}
            onOpenChange={(nextOpen) => {
              setComposeOpen(nextOpen);
              if (!nextOpen) {
                setComposeDraft(null);
                if (selectedFolderKey === 'drafts') {
                  void messagesQuery.refetch();
                  void foldersQuery.refetch();
                }
              }
            }}
            onSaveDraft={
              connectedAccount
                ? async (payload, draft) => {
                    const result = await saveDraftMutation.mutateAsync({
                      accountId: connectedAccount.id,
                      draftId: draft?.draftId,
                      messageId: draft?.messageId,
                      subject: payload.subject,
                      body: plainTextToEmailHtml(payload.body),
                      bodyType: 'html',
                      to: parseEmailAddresses(payload.to),
                      cc: parseEmailAddresses(payload.cc),
                      bcc: parseEmailAddresses(payload.bcc),
                      attachments: payload.attachments,
                      removedAttachmentIds: payload.removedAttachmentIds,
                    });
                    return {
                      draftId: result.draftId,
                      messageId: result.messageId,
                      attachments: result.message?.attachments,
                    };
                  }
                : undefined
            }
            onSendDraft={
              connectedAccount
                ? (draft) =>
                    sendDraftMutation.mutateAsync({
                      accountId: connectedAccount.id,
                      draftId: draft.draftId,
                      messageId: draft.messageId,
                    })
                : undefined
            }
            onDiscardDraft={
              connectedAccount
                ? (draft, options) =>
                    deleteDraftMutation.mutateAsync({
                      accountId: connectedAccount.id,
                      draftId: draft.draftId,
                      messageId: draft.messageId,
                      silent: options?.silent,
                    })
                : undefined
            }
          />
        </Suspense>
      )}
      {nicknameDialog}
      {disconnectDialog}
    </div>
  );
}

function toEditableComposeDraft(result: EmailDraftResult): EditableComposeDraft {
  const message = result.message!;
  return {
    draftId: result.draftId,
    messageId: result.messageId,
    to: formatEmailAddresses(message.to),
    cc: formatEmailAddresses(message.cc),
    bcc: formatEmailAddresses(message.bcc),
    subject: message.subject === '(No subject)' ? '' : message.subject,
    body: htmlToPlainText(message.body?.[0] ?? ''),
    attachments: message.attachments ?? [],
  };
}

function formatEmailAddresses(addresses?: Array<{ address: string; name?: string }>) {
  return (addresses ?? [])
    .map((recipient) =>
      recipient.name ? `${recipient.name} <${recipient.address}>` : recipient.address
    )
    .join(', ');
}

function htmlToPlainText(value: string) {
  if (!value) return '';
  const document = new DOMParser().parseFromString(value, 'text/html');
  document.querySelectorAll('br').forEach((lineBreak) => lineBreak.replaceWith('\n'));
  document.querySelectorAll('p,div,li').forEach((block) => block.append('\n'));
  return (document.body.textContent || '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

function isConnectedWellKnownFolderKey(folder: string): folder is EmailFolderKey {
  return CONNECTED_WELL_KNOWN_FOLDER_KEYS.has(folder);
}

function getWorkspaceView(value: string | null): EmailWorkspaceView {
  return value === 'tasks' || value === 'calendar' ? value : 'mail';
}

function matchesEmailSearch(email: EmailListItem, query: string) {
  return [
    email.senderName,
    email.senderEmail,
    email.subject,
    email.preview,
    email.category,
    ...(email.keywords ?? []),
  ].some((value) => value?.toLowerCase().includes(query));
}
