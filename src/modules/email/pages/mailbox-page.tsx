import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import type { EmailAgentLayout } from '@/mock/email-agent-panel';
import { emailApi, type EmailDraftResult } from '@/modules/email/api';
import { EmailCalendarView } from '@/modules/email/components/calendar/email-calendar-view';
import { EmailAccountNicknameDialog } from '@/modules/email/components/email-account-nickname-dialog';
import {
  EmailBulkProgressPanel,
  type EmailBulkOperationState,
} from '@/modules/email/components/email-bulk-progress-panel';
import type { EditableComposeDraft } from '@/modules/email/components/email-compose-dialog';
import { EmailListPane } from '@/modules/email/components/email-list-pane';
import {
  EmailMailToolbar,
  type EmailListFilter,
  type EmailStatusFilter,
} from '@/modules/email/components/email-mail-toolbar';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import { EmailReconnectRequiredState } from '@/modules/email/components/email-reconnect-required-state';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  EmailWorkspaceHeader,
  type EmailWorkspaceView,
} from '@/modules/email/components/email-workspace-header';
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
  useEmailReferenceProjectsQuery,
  useEmailTagsQuery,
  useForwardConnectedEmailMutation,
  useMoveEmailMessageMutation,
  useOpenEmailDraftMutation,
  usePermanentlyDeleteEmailMessageMutation,
  useRefreshEmailMessagesMutation,
  useReplyConnectedEmailMutation,
  useRespondToEmailMeetingMutation,
  useSaveEmailDraftMutation,
  useSendEmailDraftMutation,
  useStartEmailAuthMutation,
  useToggleEmailFlagMutation,
  useUnarchiveEmailMessageMutation,
  useUpdateEmailAccountNicknameMutation,
  useUpdateEmailMeetingMutation,
  useUpdateEmailMessageStatusMutation,
  useUpdateEmailMessageTagsMutation,
} from '@/modules/email/hooks';
import { parseEmailAddresses } from '@/modules/email/lib/email-addresses';
import { plainTextToEmailHtml } from '@/modules/email/lib/email-body-format';
import { isEmailReconnectRequiredError } from '@/modules/email/lib/email-errors';
import { groupEmailsByMonth } from '@/modules/email/lib/email-month-groups';
import { buildMailPath, getEmailConversationId } from '@/modules/email/lib/email-paths';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { TasksWorkspaceView } from '@/modules/tasks/components/tasks-workspace-view';
import { useQueryClient } from '@tanstack/react-query';
import { PanelLeftOpen } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

interface MailboxPageProps {
  accountSlug?: string;
  /** Folder segment from the URL: a well-known key or a folder cache id. */
  folder?: string;
  /** Conversation id segment from the URL (`…/:folder/id/:conversationId`). */
  conversationId?: string;
}

const CONNECTED_EMAIL_PAGE_SIZE = 50;
const PROJECT_EMAIL_PAGE_SIZE = 100;
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
  import('@/mock/email-agent-panel').then((module) => ({
    default: module.EmailAgentPanel,
  }))
);
const EmailComposeDialog = lazy(() =>
  import('@/modules/email/components/email-compose-dialog').then((module) => ({
    default: module.EmailComposeDialog,
  }))
);

export function MailboxPage({ accountSlug, folder, conversationId }: MailboxPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // Folder and open conversation live in the URL (Outlook-style deep links).
  const selectedFolder = folder || 'inbox';
  const routeConversationId = conversationId ?? null;
  const [messageSearch, setMessageSearch] = useState('');
  const debouncedMessageSearch = useDebouncedValue(messageSearch.trim(), EMAIL_SEARCH_DEBOUNCE_MS);
  const attemptedInitialSyncs = useRef(new Set<string>());
  const agentTriggerRef = useRef<HTMLButtonElement>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeLoaded, setComposeLoaded] = useState(false);
  const [composeDraft, setComposeDraft] = useState<EditableComposeDraft | null>(null);
  const [composeRecipient, setComposeRecipient] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [archiveConfirmation, setArchiveConfirmation] = useState<{ messageId: string } | null>(
    null
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ messageId: string } | null>(null);
  const [agentLayout, setAgentLayout] = useState<EmailAgentLayout>(DEFAULT_AGENT_LAYOUT);
  const [emailListVisible, setEmailListVisible] = useState(true);
  const [mailFilter, setMailFilter] = useState<EmailListFilter>('all');
  const [mailStatusFilter, setMailStatusFilter] = useState<EmailStatusFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCategoryTagId, setSelectedCategoryTagId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'list' | 'reading'>('list');
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [reconnectRequiredAccountId, setReconnectRequiredAccountId] = useState<string | null>(null);
  const [checkedMessageIds, setCheckedMessageIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ count: number } | null>(null);
  const [emptyFolderConfirm, setEmptyFolderConfirm] = useState<{ folderId: string } | null>(null);
  const [bulkOperation, setBulkOperation] = useState<EmailBulkOperationState | null>(null);
  const accountsQuery = useEmailAccountsQuery();
  const workspaceView = getWorkspaceView(searchParams.get('view'));
  const isConnectedRoute = Boolean(accountSlug);
  const connectedAccount = accountSlug
    ? (accountsQuery.data?.find(
        (account) => getEmailAccountSlug(account) === accountSlug || account.id === accountSlug
      ) ?? null)
    : null;
  const isConnected = Boolean(connectedAccount);
  const isSharedMailbox = Boolean(connectedAccount?.sharedMailboxKey);
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
  const referenceProjectsQuery = useEmailReferenceProjectsQuery(
    connectedAccount?.id,
    canLoadConnectedMailbox
  );
  const activeProjectId = useMemo(() => {
    if (!selectedProjectId || !referenceProjectsQuery.isSuccess) return selectedProjectId;
    return referenceProjectsQuery.data.some((project) => project.entityId === selectedProjectId)
      ? selectedProjectId
      : null;
  }, [referenceProjectsQuery.data, referenceProjectsQuery.isSuccess, selectedProjectId]);
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
      size: activeProjectId ? PROJECT_EMAIL_PAGE_SIZE : CONNECTED_EMAIL_PAGE_SIZE,
      search: debouncedMessageSearch || undefined,
      projectId: activeProjectId ?? undefined,
      classification: mailFilter === 'other' ? 'other' : undefined,
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
  const forwardMutation = useForwardConnectedEmailMutation();
  const createFolderMutation = useCreateEmailFolderMutation();
  const createTagMutation = useCreateEmailTagMutation();
  const moveMessageMutation = useMoveEmailMessageMutation();
  const archiveMessageMutation = useArchiveEmailMessageMutation();
  const unarchiveMessageMutation = useUnarchiveEmailMessageMutation();
  const deleteMessageMutation = useDeleteEmailMessageMutation();
  const permanentlyDeleteMessageMutation = usePermanentlyDeleteEmailMessageMutation();
  const updateMessageStatusMutation = useUpdateEmailMessageStatusMutation();
  const toggleFlagMutation = useToggleEmailFlagMutation();
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
  const availableOtherCategoryTags = useMemo(() => {
    if (mailFilter !== 'other') return [];
    const tagKeywords = new Set(
      emailsForActiveSearch.flatMap((email) =>
        (email.keywords ?? []).map((keyword) => keyword.toLowerCase())
      )
    );
    return (tagsQuery.data ?? []).filter(
      (tag) =>
        tagKeywords.has(tag.id.toLowerCase()) ||
        tagKeywords.has(tag.providerId.toLowerCase()) ||
        tagKeywords.has(tag.name.toLowerCase())
    );
  }, [emailsForActiveSearch, mailFilter, tagsQuery.data]);
  const folderEmails = useMemo(() => {
    // Step 1 — narrow by the "Show messages" filter.
    let list = emailsForActiveSearch;
    if (mailFilter === 'unread') {
      list = list.filter((email) => email.unread);
    } else if (mailFilter === 'flagged') {
      list = list.filter((email) => email.flagged);
    } else if (mailFilter === 'attachments') {
      list = list.filter(
        (email) => Boolean(email.attachmentCount) || Boolean(email.attachments?.length)
      );
    } else if (mailFilter === 'other' && selectedCategoryTagId) {
      const selectedTag = availableOtherCategoryTags.find(
        (tag) => tag.id === selectedCategoryTagId
      );
      if (selectedTag) {
        const tagKeys = new Set([
          selectedTag.id.toLowerCase(),
          selectedTag.providerId.toLowerCase(),
          selectedTag.name.toLowerCase(),
        ]);
        list = list.filter((email) =>
          (email.keywords ?? []).some((keyword) => tagKeys.has(keyword.toLowerCase()))
        );
      }
    }

    // Step 2 — narrow by thread status. Unclassified threads default to "open"
    // (matches the pill on the row card), so the "open" filter includes them.
    if (mailStatusFilter !== 'all') {
      list = list.filter((email) => {
        const status = email.classification?.status ?? 'open';
        // 'open' covers every open variant (plain, our court, their court).
        return mailStatusFilter === 'open' ? status !== 'closed' : status === 'closed';
      });
    }

    return list;
  }, [
    availableOtherCategoryTags,
    emailsForActiveSearch,
    mailFilter,
    mailStatusFilter,
    selectedCategoryTagId,
  ]);
  // The list pane renders emails grouped by month (Today/This week/…), which can
  // reorder them relative to the raw query order — server search results arrive in
  // relevance order. Prev/next navigation must walk the list in the order the user
  // actually sees, so flatten the same grouping the list pane renders.
  const orderedEmails = useMemo(
    () => groupEmailsByMonth(folderEmails).flatMap((group) => group.emails),
    [folderEmails]
  );
  const defaultEmail = folderEmails.find((email) => email.selected) ?? orderedEmails[0] ?? null;
  // The URL id is a conversation id, so a deep link matches its list row directly.
  const routeSelectedEmail = routeConversationId
    ? (folderEmails.find((email) => getEmailConversationId(email) === routeConversationId) ?? null)
    : null;
  // Deep link to a mail that isn't in the loaded list (older page, other folder,
  // cold cache): resolve it via the message endpoint, which accepts cache ids,
  // provider message ids and conversation ids alike.
  const deepLinkLookupEnabled =
    canLoadConnectedMailbox && Boolean(routeConversationId) && !routeSelectedEmail;
  const deepLinkQuery = useEmailMessageQuery(
    connectedAccount?.id,
    routeConversationId,
    deepLinkLookupEnabled
  );
  const deepLinkEmail = useMemo<EmailListItem | null>(() => {
    if (!routeConversationId || !deepLinkQuery.data) return null;
    return { ...deepLinkQuery.data, latestMessageId: deepLinkQuery.data.id };
  }, [deepLinkQuery.data, routeConversationId]);
  const address = connectedAccount?.mailboxAddress ?? connectedAccount?.email ?? 'email';
  const selectedEmail = routeConversationId ? (routeSelectedEmail ?? deepLinkEmail) : defaultEmail;
  const selectedEmailId = selectedEmail?.id;
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
  // The folder path segment can be an opaque folder id — hand the breadcrumb
  // bar its display name (well-known keys resolve to labels the same way).
  useBreadcrumbLabel(
    accountSlug ? `/app/email/accounts/${accountSlug}/${selectedFolder}` : undefined,
    selectedFolderLabel
  );
  const isArchiveFolder = selectedConnectedFolder?.key === 'archive';
  const isDeletedFolder = selectedFolderKey === 'deleted';
  const inboxFolderId = foldersQuery.data?.find((folder) => folder.key === 'inbox')?.id ?? null;
  const archiveFolderId = foldersQuery.data?.find((folder) => folder.key === 'archive')?.id ?? null;
  const deletedFolderId = foldersQuery.data?.find((folder) => folder.key === 'deleted')?.id ?? null;
  const navigateToFolder = useCallback(
    (nextFolder: string, options?: { replace?: boolean }) => {
      if (!accountSlug) return;
      navigate(buildMailPath(accountSlug, nextFolder), options);
    },
    [accountSlug, navigate]
  );
  // Drops the `/id/…` segment so the folder shows its default (first) mail again.
  const clearRouteSelection = useCallback(() => {
    if (routeConversationId) navigateToFolder(selectedFolder, { replace: true });
  }, [navigateToFolder, routeConversationId, selectedFolder]);

  const requestArchive = useCallback((messageId: string) => {
    setArchiveConfirmation({ messageId });
  }, []);
  const confirmArchive = useCallback(() => {
    if (!connectedAccount || !archiveConfirmation) return;
    if (
      selectedEmail &&
      (selectedEmail.id === archiveConfirmation.messageId ||
        selectedEmail.latestMessageId === archiveConfirmation.messageId)
    ) {
      clearRouteSelection();
    }
    archiveMessageMutation.mutate({
      accountId: connectedAccount.id,
      messageId: archiveConfirmation.messageId,
      targetFolderId: archiveFolderId,
    });
    setArchiveConfirmation(null);
  }, [
    archiveConfirmation,
    archiveFolderId,
    archiveMessageMutation,
    connectedAccount,
    clearRouteSelection,
    selectedEmail,
  ]);
  const requestDelete = useCallback((messageId: string) => {
    setDeleteConfirmation({ messageId });
  }, []);
  const confirmDelete = useCallback(() => {
    if (!connectedAccount || !deleteConfirmation) return;
    if (
      selectedEmail &&
      (selectedEmail.id === deleteConfirmation.messageId ||
        selectedEmail.latestMessageId === deleteConfirmation.messageId)
    ) {
      clearRouteSelection();
    }
    deleteMessageMutation.mutate(
      {
        accountId: connectedAccount.id,
        messageId: deleteConfirmation.messageId,
        targetFolderId: deletedFolderId,
      },
      { onSettled: () => setDeleteConfirmation(null) }
    );
  }, [
    connectedAccount,
    deleteConfirmation,
    deleteMessageMutation,
    deletedFolderId,
    clearRouteSelection,
    selectedEmail,
  ]);

  // Anchor for Outlook-style Shift range selection: the last row whose
  // checkbox was ticked without Shift held.
  const checkedAnchorIdRef = useRef<string | null>(null);
  const toggleChecked = useCallback(
    (email: EmailListItem, next: boolean, options?: { range?: boolean }) => {
      const anchorId = checkedAnchorIdRef.current;
      setCheckedMessageIds((current) => {
        const nextSet = new Set(current);
        if (options?.range && anchorId) {
          const visibleIds = orderedEmails.map((item) => item.id);
          const anchorIndex = visibleIds.indexOf(anchorId);
          const targetIndex = visibleIds.indexOf(email.id);
          if (anchorIndex !== -1 && targetIndex !== -1) {
            const [start, end] = [
              Math.min(anchorIndex, targetIndex),
              Math.max(anchorIndex, targetIndex),
            ];
            for (const id of visibleIds.slice(start, end + 1)) {
              if (next) nextSet.add(id);
              else nextSet.delete(id);
            }
            return nextSet;
          }
        }
        if (next) nextSet.add(email.id);
        else nextSet.delete(email.id);
        return nextSet;
      });
      // A Shift-click extends from the existing anchor; a plain click moves it.
      if (!options?.range) checkedAnchorIdRef.current = email.id;
    },
    [orderedEmails]
  );
  const clearChecked = useCallback(() => setCheckedMessageIds(() => new Set()), []);
  const isBulkOperationRunning = Boolean(bulkOperation?.isRunning);

  const runBulkPerId = useCallback(
    async (
      kind: EmailBulkOperationState['kind'],
      ids: string[],
      perId: (messageId: string) => Promise<unknown>
    ) => {
      if (ids.length === 0) return;
      setBulkOperation({ kind, total: ids.length, done: 0, failed: 0, isRunning: true });
      // Small concurrency keeps things quick without hammering the provider.
      const CONCURRENCY = 4;
      for (let index = 0; index < ids.length; index += CONCURRENCY) {
        const batch = ids.slice(index, index + CONCURRENCY);
        const results = await Promise.allSettled(batch.map((id) => perId(id)));
        setBulkOperation((current) => {
          if (!current) return current;
          const doneAdd = results.filter((result) => result.status === 'fulfilled').length;
          const failedAdd = results.length - doneAdd;
          return {
            ...current,
            done: current.done + doneAdd,
            failed: current.failed + failedAdd,
          };
        });
      }
      setBulkOperation((current) => (current ? { ...current, isRunning: false } : current));
    },
    []
  );
  const invalidateAfterBulk = useCallback(
    (accountId: string) => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(accountId) });
      void queryClient.invalidateQueries({ queryKey: emailKeys.folders(accountId) });
      void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
    },
    [queryClient]
  );
  const runBulkArchive = useCallback(() => {
    if (!connectedAccount || checkedMessageIds.size === 0) return;
    const accountId = connectedAccount.id;
    const ids = Array.from(checkedMessageIds);
    // Skip the per-item mutation toast: our progress panel handles feedback.
    void runBulkPerId('archive', ids, (messageId) =>
      emailApi.archiveMessage(accountId, messageId)
    ).then(() => {
      setCheckedMessageIds(() => new Set());
      if (
        selectedEmail &&
        (ids.includes(selectedEmail.id) ||
          (selectedEmail.latestMessageId && ids.includes(selectedEmail.latestMessageId)))
      ) {
        clearRouteSelection();
      }
      invalidateAfterBulk(accountId);
    });
  }, [
    checkedMessageIds,
    clearRouteSelection,
    connectedAccount,
    invalidateAfterBulk,
    runBulkPerId,
    selectedEmail,
  ]);
  const runBulkRestore = useCallback(() => {
    if (!connectedAccount || checkedMessageIds.size === 0 || !inboxFolderId) return;
    const accountId = connectedAccount.id;
    const ids = Array.from(checkedMessageIds);
    void runBulkPerId('archive', ids, (messageId) =>
      emailApi.moveMessage(accountId, messageId, inboxFolderId)
    ).then(() => {
      setCheckedMessageIds(() => new Set());
      if (
        selectedEmail &&
        (ids.includes(selectedEmail.id) ||
          (selectedEmail.latestMessageId && ids.includes(selectedEmail.latestMessageId)))
      ) {
        clearRouteSelection();
      }
      invalidateAfterBulk(accountId);
    });
  }, [
    checkedMessageIds,
    connectedAccount,
    inboxFolderId,
    invalidateAfterBulk,
    runBulkPerId,
    clearRouteSelection,
    selectedEmail,
  ]);
  const runBulkDelete = useCallback(() => {
    if (!connectedAccount || checkedMessageIds.size === 0) return;
    const accountId = connectedAccount.id;
    const ids = Array.from(checkedMessageIds);
    // Backend picks the right delete stage from the message's current folder:
    //   Inbox / other → Deleted Items
    //   Deleted Items → Recoverable Items (soft purge)
    // Matches Outlook's own semantics, so anything we do here reflects there.
    void runBulkPerId('delete', ids, (messageId) =>
      emailApi.deleteMessage(accountId, messageId)
    ).then(() => {
      setCheckedMessageIds(() => new Set());
      if (
        selectedEmail &&
        (ids.includes(selectedEmail.id) ||
          (selectedEmail.latestMessageId && ids.includes(selectedEmail.latestMessageId)))
      ) {
        clearRouteSelection();
      }
      invalidateAfterBulk(accountId);
    });
    setBulkDeleteConfirm(null);
  }, [
    checkedMessageIds,
    clearRouteSelection,
    connectedAccount,
    invalidateAfterBulk,
    runBulkPerId,
    selectedEmail,
  ]);
  const runEmptyFolder = useCallback(async () => {
    if (!connectedAccount || !emptyFolderConfirm) return;
    const folderId = emptyFolderConfirm.folderId;
    setEmptyFolderConfirm(null);
    const totalGuess = providerTotalCount ?? folderEmails.length ?? 0;
    setBulkOperation({
      kind: 'empty',
      total: Math.max(totalGuess, 1),
      done: 0,
      failed: 0,
      isRunning: true,
    });
    try {
      const result = await emailApi.emptyFolder(connectedAccount.id, folderId);
      setBulkOperation({
        kind: 'empty',
        total: result.deleted + result.failed || 1,
        done: result.deleted,
        failed: result.failed,
        isRunning: false,
      });
      setCheckedMessageIds(() => new Set());
      clearRouteSelection();
      void queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(connectedAccount.id) });
      void queryClient.invalidateQueries({ queryKey: emailKeys.folders(connectedAccount.id) });
      if (result.failed === 0) {
        toast.success(
          result.deleted === 0
            ? 'Folder was already empty.'
            : `Emptied folder (${result.deleted} message${result.deleted === 1 ? '' : 's'}).`
        );
      } else {
        toast.warning(
          `Emptied ${result.deleted}, ${result.failed} could not be deleted. Try again.`
        );
      }
    } catch (error) {
      setBulkOperation((current) => (current ? { ...current, isRunning: false } : current));
      toast.error('Could not empty the folder.');
    }
  }, [
    clearRouteSelection,
    connectedAccount,
    emptyFolderConfirm,
    folderEmails.length,
    providerTotalCount,
    queryClient,
  ]);

  useEffect(() => {
    // Reset selection whenever the folder / account / project context changes.
    setCheckedMessageIds(() => new Set());
  }, [connectedAccount?.id, selectedFolder, selectedProjectId, mailFilter]);

  const activeFreshness = messagesQuery.data?.pages[0]?.freshness ?? connectedAccount?.freshness;
  const hasCachedMessages = loadedEmailPages.some((page) => page.records.length > 0);
  const showEmailSyncIndicator = useBoundedEmailSyncIndicator(
    refreshMessagesMutation.isPending,
    `${connectedAccount?.id ?? 'no-account'}:${refreshMessagesMutation.submittedAt}`
  );
  const isMailboxLoading = isConnectedRoute
    ? accountsQuery.isLoading ||
      messagesQuery.isLoading ||
      (messagesQuery.isFetching && messagesQuery.isPlaceholderData)
    : false;
  const isMailboxError = isConnectedRoute
    ? accountsQuery.isError ||
      (messagesQuery.isError && !messagesQuery.data) ||
      (activeFreshness?.state === 'error' &&
        !hasCachedMessages &&
        !refreshMessagesMutation.isPending)
    : false;
  const isReadingLoading =
    (isMailboxLoading || (deepLinkLookupEnabled && deepLinkQuery.isPending)) && !selectedEmail;
  const isReadingError =
    (isMailboxError || (Boolean(routeConversationId) && deepLinkQuery.isError)) && !selectedEmail;
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
      setMessageSearch('');
      setMailFilter('all');
      setSelectedProjectId(null);
      setSelectedCategoryTagId(null);
      setMobilePane('list');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [connectedAccount?.id]);

  // A new search drops the deep-linked mail (folder and account changes reset
  // the URL through navigation already). The first run is skipped so a freshly
  // opened deep link isn't immediately discarded on mount.
  const clearRouteSelectionRef = useRef(clearRouteSelection);
  useEffect(() => {
    clearRouteSelectionRef.current = clearRouteSelection;
  });
  // Compare against the previous value instead of skipping the first run — the
  // ref survives StrictMode's double effect invocation, so a freshly opened
  // deep link is never discarded on mount.
  const previousSearchRef = useRef(debouncedMessageSearch);
  useEffect(() => {
    if (previousSearchRef.current === debouncedMessageSearch) return;
    previousSearchRef.current = debouncedMessageSearch;
    const timeout = window.setTimeout(() => {
      clearRouteSelectionRef.current();
      setMobilePane('list');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [debouncedMessageSearch]);

  // The mobile pane follows the URL: an id shows the reading pane, and losing
  // it (browser Back, selection cleared) returns to the list.
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setMobilePane(routeConversationId ? 'reading' : 'list'),
      0
    );
    return () => window.clearTimeout(timeout);
  }, [routeConversationId]);

  // Canonicalise deep links: a pasted message id becomes its conversation id,
  // and a mail that lives in another folder (moved/archived since the link was
  // shared) redirects to the folder it is actually in.
  useEffect(() => {
    if (!accountSlug || !routeConversationId || routeSelectedEmail) return;
    const resolved = deepLinkQuery.data;
    if (!resolved) return;
    const canonicalId = resolved.conversationKey ?? resolved.threadId ?? resolved.id;
    const folderMatches =
      resolved.folderId === selectedFolder ||
      resolved.folderId === selectedConnectedFolder?.id ||
      resolved.folder === selectedFolderKey;
    if (!folderMatches) {
      const targetFolder = isConnectedWellKnownFolderKey(resolved.folder)
        ? resolved.folder
        : (resolved.folderId ?? 'inbox');
      navigate(buildMailPath(accountSlug, targetFolder, canonicalId), { replace: true });
      return;
    }
    if (canonicalId !== routeConversationId) {
      navigate(buildMailPath(accountSlug, selectedFolder, canonicalId), { replace: true });
    }
  }, [
    accountSlug,
    deepLinkQuery.data,
    navigate,
    routeConversationId,
    routeSelectedEmail,
    selectedConnectedFolder?.id,
    selectedFolder,
    selectedFolderKey,
  ]);

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
    setComposeRecipient(null);
    setComposeLoaded(true);
    setComposeOpen(true);
  }, []);
  const openComposeTo = useCallback((address: string) => {
    setComposeDraft(null);
    setComposeRecipient(address);
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
    (emailId: string, options?: { replace?: boolean }) => {
      if (!accountSlug) return;
      const email = folderEmails.find((item) => item.id === emailId);
      const targetConversationId = email ? getEmailConversationId(email) : emailId;
      // Re-clicking the open conversation must not push duplicate history entries.
      if (targetConversationId !== routeConversationId) {
        navigate(buildMailPath(accountSlug, selectedFolder, targetConversationId), {
          replace: options?.replace,
        });
      }
      setMobilePane('reading');
    },
    [accountSlug, folderEmails, navigate, routeConversationId, selectedFolder]
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

  const selectedEmailIndex = orderedEmails.findIndex((email) => email.id === selectedEmailId);
  const previousEmail = selectedEmailIndex > 0 ? orderedEmails[selectedEmailIndex - 1] : null;
  const nextEmail =
    selectedEmailIndex >= 0 && selectedEmailIndex < orderedEmails.length - 1
      ? orderedEmails[selectedEmailIndex + 1]
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

      if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setAgentOpen((open) => !open);
        return;
      }

      if (event.key === 'ArrowUp' && previousEmail) {
        event.preventDefault();
        selectEmail(previousEmail.id, { replace: true });
      }
      if (event.key === 'ArrowDown' && nextEmail) {
        event.preventDefault();
        selectEmail(nextEmail.id, { replace: true });
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
      mode={isSharedMailbox ? 'displayName' : 'alias'}
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
  const archiveDialog = (
    <ConfirmDialog
      open={Boolean(archiveConfirmation)}
      onOpenChange={(open) => {
        if (!archiveMessageMutation.isPending && !open) setArchiveConfirmation(null);
      }}
      title="Archive this email?"
      description="This will move the email out of your inbox and into Archive."
      confirmLabel="Archive"
      variant="primary"
      isPending={archiveMessageMutation.isPending}
      autoFocusConfirm
      onConfirm={confirmArchive}
    />
  );
  const deleteDialog = (
    <ConfirmDialog
      open={Boolean(deleteConfirmation)}
      onOpenChange={(open) => {
        if (!deleteMessageMutation.isPending && !open) setDeleteConfirmation(null);
      }}
      title="Delete this email?"
      description={
        isDeletedFolder
          ? 'The email will move from Deleted Items to Recoverable Items in your mailbox — it stays recoverable for the retention window your admin sets (usually 30 days).'
          : 'The email will move to Deleted Items.'
      }
      confirmLabel={isDeletedFolder ? 'Delete' : 'Move to Deleted Items'}
      variant="destructive"
      isPending={deleteMessageMutation.isPending}
      autoFocusConfirm
      onConfirm={confirmDelete}
    />
  );
  const bulkDeleteDialog = (
    <ConfirmDialog
      open={Boolean(bulkDeleteConfirm)}
      onOpenChange={(open) => {
        if (!isBulkOperationRunning && !open) setBulkDeleteConfirm(null);
      }}
      title={
        bulkDeleteConfirm?.count === 1
          ? 'Delete 1 email?'
          : `Delete ${bulkDeleteConfirm?.count ?? 0} emails?`
      }
      description={
        selectedFolderKey === 'deleted'
          ? 'The selected emails will be moved to Recoverable Items in your mailbox. They stay recoverable there for the retention window your admin sets (usually 30 days).'
          : 'The selected emails will be moved to Deleted Items.'
      }
      confirmLabel={selectedFolderKey === 'deleted' ? 'Delete' : 'Move to Deleted Items'}
      variant="destructive"
      isPending={isBulkOperationRunning}
      onConfirm={runBulkDelete}
    />
  );
  const emptyFolderDialog = (
    <ConfirmDialog
      open={Boolean(emptyFolderConfirm)}
      onOpenChange={(open) => {
        if (!isBulkOperationRunning && !open) setEmptyFolderConfirm(null);
      }}
      title="Empty Deleted Items?"
      description="Every message in Deleted Items will be moved to Recoverable Items in your mailbox. Your Outlook / Microsoft admin retention policy decides how long they stay recoverable."
      confirmLabel="Empty folder"
      variant="destructive"
      isPending={isBulkOperationRunning}
      keepOpenOnConfirm
      onConfirm={() => void runEmptyFolder()}
    />
  );
  const bulkProgressPanel = (
    <EmailBulkProgressPanel operation={bulkOperation} onDismiss={() => setBulkOperation(null)} />
  );

  if (!accountsQuery.isLoading && !accountsQuery.isError && !connectedAccount) {
    return <Navigate to="/app/email/add-account" replace />;
  }

  if (isReconnectRequired && connectedAccount) {
    return (
      <>
        <div className="flex h-[calc(100dvh-var(--header-height-mobile))] min-w-0 flex-col overflow-hidden bg-muted lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
          <EmailWorkspaceHeader
            mailboxAddress={address}
            mailboxLabel={
              isSharedMailbox && connectedAccount.displayName
                ? connectedAccount.displayName
                : undefined
            }
            activeView={workspaceView}
            isDisconnectingAccount={disconnectAccountMutation.isPending}
            onViewChange={setWorkspaceView}
            onEditNickname={isSharedMailbox ? openNicknameDialog : undefined}
            onDisconnectAccount={isSharedMailbox ? undefined : () => setDisconnectConfirmOpen(true)}
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
              onReconnect={
                isSharedMailbox
                  ? undefined
                  : () =>
                      startAuthMutation.mutate({
                        provider: connectedAccount.provider,
                        loginHint: connectedAccount.mailboxAddress ?? connectedAccount.email,
                      })
              }
            />
          ) : workspaceView === 'calendar' ? (
            <EmailCalendarView
              accountId={connectedAccount?.id ?? null}
              provider={connectedAccount?.provider ?? null}
            />
          ) : (
            <TasksWorkspaceView inWorkspace />
          )}
        </div>
        {nicknameDialog}
        {disconnectDialog}
        {bulkProgressPanel}
      </>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-var(--header-height-mobile))] min-w-0 flex-col overflow-hidden bg-muted lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <EmailWorkspaceHeader
        mailboxAddress={address}
        mailboxLabel={
          isSharedMailbox && connectedAccount?.displayName
            ? connectedAccount.displayName
            : undefined
        }
        activeView={workspaceView}
        isDisconnectingAccount={disconnectAccountMutation.isPending}
        onViewChange={setWorkspaceView}
        onEditNickname={isSharedMailbox ? openNicknameDialog : undefined}
        onDisconnectAccount={
          connectedAccount && !isSharedMailbox ? () => setDisconnectConfirmOpen(true) : undefined
        }
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
            statusFilter={mailStatusFilter}
            search={messageSearch}
            projects={referenceProjectsQuery.data}
            categoryTags={availableOtherCategoryTags}
            selectedProjectId={activeProjectId}
            selectedCategoryTagId={selectedCategoryTagId}
            isRefreshing={showEmailSyncIndicator}
            isCreatingFolder={createFolderMutation.isPending}
            onSelectFolder={(nextFolder) => {
              navigateToFolder(nextFolder);
              setMailFilter('all');
              setMailStatusFilter('all');
              setSelectedCategoryTagId(null);
              setMobilePane('list');
            }}
            onFilterChange={(filter) => {
              setMailFilter(filter);
              if (filter !== 'other') setSelectedCategoryTagId(null);
            }}
            onStatusFilterChange={setMailStatusFilter}
            onProjectChange={(projectId) => {
              setSelectedProjectId(projectId);
              clearRouteSelection();
              setMailFilter('all');
              setSelectedCategoryTagId(null);
              setMobilePane('list');
            }}
            onCategoryTagChange={setSelectedCategoryTagId}
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
                      { onSuccess: (created) => navigateToFolder(created.id) }
                    )
                : undefined
            }
            onEmptyFolder={
              connectedAccount && isDeletedFolder && deletedFolderId && checkedMessageIds.size === 0
                ? () => setEmptyFolderConfirm({ folderId: deletedFolderId })
                : undefined
            }
            emptyFolderDisabled={isBulkOperationRunning || folderEmails.length === 0}
          />

          <div className="flex min-h-0 flex-1 gap-1.5 bg-muted p-1.5 lg:gap-1.5 lg:p-1.5">
            {showEmailList && (
              <div
                className={cn(
                  'h-full min-h-0 w-full shrink-0 lg:block lg:w-auto',
                  mobilePane === 'reading' && 'hidden'
                )}
              >
                <EmailListPane
                  accountId={connectedAccount?.id}
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
                      ? (email) => requestArchive(email.latestMessageId ?? email.id)
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
                  onToggleFlagEmail={
                    connectedAccount
                      ? (email) =>
                          toggleFlagMutation.mutate({
                            accountId: connectedAccount.id,
                            messageId: email.latestMessageId ?? email.id,
                            conversationKey: email.conversationKey ?? email.threadId ?? undefined,
                            flagged: !email.flagged,
                          })
                      : undefined
                  }
                  checkedIds={checkedMessageIds}
                  onToggleChecked={connectedAccount ? toggleChecked : undefined}
                  onToggleCheckedAll={
                    connectedAccount
                      ? () => {
                          const allChecked =
                            folderEmails.length > 0 &&
                            folderEmails.every((email) => checkedMessageIds.has(email.id));
                          setCheckedMessageIds(
                            () => new Set(allChecked ? [] : folderEmails.map((email) => email.id))
                          );
                        }
                      : undefined
                  }
                  onClearChecked={clearChecked}
                  onBulkArchive={
                    connectedAccount
                      ? isDeletedFolder
                        ? inboxFolderId
                          ? runBulkRestore
                          : undefined
                        : !isArchiveFolder
                          ? runBulkArchive
                          : undefined
                      : undefined
                  }
                  onBulkDelete={
                    connectedAccount
                      ? () => setBulkDeleteConfirm({ count: checkedMessageIds.size })
                      : undefined
                  }
                  isBulkMutating={isBulkOperationRunning}
                  bulkArchiveLabel={isDeletedFolder ? 'Restore' : 'Archive'}
                  bulkArchiveVariant={isDeletedFolder ? 'restore' : 'archive'}
                  bulkDeleteLabel="Delete"
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
                onPrevious={
                  previousEmail ? () => selectEmail(previousEmail.id, { replace: true }) : undefined
                }
                onNext={nextEmail ? () => selectEmail(nextEmail.id, { replace: true }) : undefined}
                onBack={() => {
                  clearRouteSelection();
                  setMobilePane('list');
                }}
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
                        if (accountSlug) {
                          navigate(
                            buildMailPath(
                              accountSlug,
                              folderId,
                              selectedEmail ? getEmailConversationId(selectedEmail) : undefined
                            )
                          );
                        }
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
                    ? (name, messageId) =>
                        createTagMutation.mutate({
                          accountId: connectedAccount.id,
                          name,
                          messageId,
                        })
                    : undefined
                }
                onArchive={
                  connectedAccount
                    ? (messageId) => {
                        if (isArchiveFolder) {
                          clearRouteSelection();
                          unarchiveMessageMutation.mutate({
                            accountId: connectedAccount.id,
                            messageId,
                            targetFolderId: inboxFolderId,
                          });
                          return;
                        }
                        requestArchive(messageId);
                      }
                    : undefined
                }
                onDelete={connectedAccount && !isDeletedFolder ? requestDelete : undefined}
                onPermanentDelete={
                  connectedAccount && isDeletedFolder
                    ? async (messageId) => {
                        await permanentlyDeleteMessageMutation.mutateAsync({
                          accountId: connectedAccount.id,
                          messageId,
                        });
                        clearRouteSelection();
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
                onComposeTo={openComposeTo}
                onSearchSender={setMessageSearch}
                onReply={
                  connectedAccount
                    ? (messageId, draft) =>
                        replyMutation.mutateAsync({
                          accountId: connectedAccount.id,
                          messageId,
                          body: plainTextToEmailHtml(draft.body),
                          bodyType: 'html',
                          subject: selectedEmail?.subject,
                          to: parseEmailAddresses(draft.to),
                          cc: parseEmailAddresses(draft.cc),
                          bcc: parseEmailAddresses(draft.bcc),
                        })
                    : undefined
                }
                onForward={
                  connectedAccount
                    ? (messageId, draft) =>
                        forwardMutation.mutateAsync({
                          accountId: connectedAccount.id,
                          messageId,
                          body: plainTextToEmailHtml(draft.body),
                          bodyType: 'html',
                          subject: selectedEmail?.subject,
                          to: parseEmailAddresses(draft.to),
                          cc: parseEmailAddresses(draft.cc),
                          bcc: parseEmailAddresses(draft.bcc),
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
      ) : workspaceView === 'calendar' ? (
        <EmailCalendarView
          accountId={connectedAccount?.id ?? null}
          provider={connectedAccount?.provider ?? null}
        />
      ) : (
        <TasksWorkspaceView inWorkspace />
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
            accountId={connectedAccount?.id}
            threadKey={
              visibleEmail?.threadId ?? visibleEmail?.conversationKey ?? visibleEmail?.id ?? null
            }
            contextEmails={emailsForActiveSearch}
            folders={foldersQuery.data}
            tags={tagsQuery.data}
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
            accountId={connectedAccount?.id}
            initialDraft={composeDraft}
            initialRecipient={composeRecipient ?? undefined}
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
      {archiveDialog}
      {deleteDialog}
      {bulkDeleteDialog}
      {emptyFolderDialog}
      {bulkProgressPanel}
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
