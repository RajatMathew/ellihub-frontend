import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { cn } from '@/app/lib/utils';
import type { EmailAgentLayout } from '@/mock/email-agent-panel';
import {
  emailApi,
  type ConnectedEmailListItem,
  type ConnectedEmailThreadMessage,
  type EmailDraftResult,
} from '@/modules/email/api';
import { EmailCalendarView } from '@/modules/email/components/calendar/email-calendar-view';
import { EmailAccountNicknameDialog } from '@/modules/email/components/email-account-nickname-dialog';
import {
  EmailBulkProgressPanel,
  type EmailBulkOperationState,
} from '@/modules/email/components/email-bulk-progress-panel';
import { EmailListPane } from '@/modules/email/components/email-list-pane';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import { EmailReconnectRequiredState } from '@/modules/email/components/email-reconnect-required-state';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  MailAccountBar,
  type EmailWorkspaceView,
} from '@/modules/email/components/mail-account-bar';
import { MailListChrome } from '@/modules/email/components/mail-list-chrome';
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
import {
  useEmailCompose,
  type EditableComposeDraft,
} from '@/modules/email/hooks/use-email-compose';
import { useEmailRealtime } from '@/modules/email/hooks/use-email-realtime';
import { useMailboxUrlState } from '@/modules/email/hooks/use-mailbox-url-state';
import { parseEmailAddresses } from '@/modules/email/lib/email-addresses';
import {
  buildInstantDraftSnapshot,
  toComposeDraftFields,
} from '@/modules/email/lib/email-draft-compose';
import { isEmailReconnectRequiredError } from '@/modules/email/lib/email-errors';
import { listRowIsWholeThread } from '@/modules/email/lib/email-list-body';
import { groupEmailsByMonth } from '@/modules/email/lib/email-month-groups';
import { buildMailPath, getEmailConversationId } from '@/modules/email/lib/email-paths';
import { richTextToEmailHtml } from '@/modules/email/lib/email-rich-text';
import { resolveMailShortcut } from '@/modules/email/lib/email-shortcut-keys';
import { isThreadBodyPending } from '@/modules/email/lib/email-thread-body-pending';
import { MAILBOX_FILTER_RESET } from '@/modules/email/lib/mailbox-url-state';
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
const EmailComposePane = lazy(() =>
  import('@/modules/email/components/compose/email-compose-pane').then((module) => ({
    default: module.EmailComposePane,
  }))
);

export function MailboxPage({ accountSlug, folder, conversationId }: MailboxPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // Folder and open conversation live in the path (Outlook-style deep links);
  // the workspace view and everything that narrows the folder live in the query
  // string. `useMailboxUrlState` is the only place that mapping is written.
  const {
    state: mailboxUrlState,
    searchDraft: messageSearch,
    setState: setMailboxUrlState,
    setSearchDraft: setMessageSearch,
    resetFilters: resetMailboxFilters,
    buildSearchString: buildMailboxSearch,
  } = useMailboxUrlState();
  const selectedFolder = folder || 'inbox';
  const routeConversationId = conversationId ?? null;
  // The URL only takes the search term once typing settles, which makes it the
  // debounced value the mail query (and its cache key) is built from.
  const debouncedMessageSearch = mailboxUrlState.search;
  const attemptedInitialSyncs = useRef(new Set<string>());
  const agentTriggerRef = useRef<HTMLButtonElement>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [archiveConfirmation, setArchiveConfirmation] = useState<{ messageId: string } | null>(
    null
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ messageId: string } | null>(null);
  const [agentLayout, setAgentLayout] = useState<EmailAgentLayout>(DEFAULT_AGENT_LAYOUT);
  const [emailListVisible, setEmailListVisible] = useState(true);
  const {
    filter: mailFilter,
    statusFilter: mailStatusFilter,
    projectId: selectedProjectId,
    categoryTagId: selectedCategoryTagId,
    view: workspaceView,
  } = mailboxUrlState;
  const [mobilePane, setMobilePane] = useState<'list' | 'reading'>('list');
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [reconnectRequiredAccountId, setReconnectRequiredAccountId] = useState<string | null>(null);
  const [checkedMessageIds, setCheckedMessageIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ count: number } | null>(null);
  const [emptyFolderConfirm, setEmptyFolderConfirm] = useState<{ folderId: string } | null>(null);
  const [bulkOperation, setBulkOperation] = useState<EmailBulkOperationState | null>(null);
  const accountsQuery = useEmailAccountsQuery();
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
      // Answered server-side across the whole folder (elli-ui#859).
      unread: mailFilter === 'unread' ? true : undefined,
      flagged: mailFilter === 'flagged' ? true : undefined,
      hasAttachments: mailFilter === 'attachments' ? true : undefined,
    },
    canLoadConnectedMailbox
  );
  const startAuthMutation = useStartEmailAuthMutation();
  const updateAccountNicknameMutation = useUpdateEmailAccountNicknameMutation();
  const refreshMessagesMutation = useRefreshEmailMessagesMutation();
  const disconnectAccountMutation = useDisconnectEmailAccountMutation();
  const openDraftMutation = useOpenEmailDraftMutation();
  /** Filled in below with the real handler; see `onRetryDraftHydration`. */
  const hydrateDraftRef = useRef<(messageId: string) => void>(() => {});
  const saveDraftMutation = useSaveEmailDraftMutation();
  const sendDraftMutation = useSendEmailDraftMutation();
  const deleteDraftMutation = useDeleteEmailDraftMutation();
  const replyMutation = useReplyConnectedEmailMutation();
  const forwardMutation = useForwardConnectedEmailMutation();
  // Live push: refetch this account's mail when the backend reports new sync.
  // The open mailbox is passed through so realtime events can be scoped to
  // accounts this session actually owns (elli-ui#918).
  useEmailRealtime(connectedAccount?.id);
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
  // The "Other" filter narrows by Elli's own tags. Provider categories are
  // read-only and not Elli's vocabulary, so they do not appear here.
  const availableOtherCategoryTags = useMemo(() => {
    if (mailFilter !== 'other') return [];
    const applied = new Set(
      emailsForActiveSearch.flatMap((email) => (email.tags ?? []).map((tag) => tag.toLowerCase()))
    );
    return (tagsQuery.data ?? []).filter(
      (tag) => tag.source === 'custom' && applied.has(tag.name.toLowerCase())
    );
  }, [emailsForActiveSearch, mailFilter, tagsQuery.data]);
  const folderEmails = useMemo(() => {
    // unread/flagged/attachments are answered server-side (elli-ui#859);
    // only "other" category tag still needs a client-side pass here.
    let list = emailsForActiveSearch;
    if (mailFilter === 'other' && selectedCategoryTagId) {
      const selectedTag = availableOtherCategoryTags.find(
        (tag) => tag.id === selectedCategoryTagId
      );
      if (selectedTag) {
        const tagName = selectedTag.name.toLowerCase();
        list = list.filter((email) =>
          (email.tags ?? []).some((tag) => tag.toLowerCase() === tagName)
        );
      }
    }

    // Step 2 — narrow by thread status. Unclassified threads default to "open"
    // (matches the pill on the row card), so the "open" filter includes them.
    if (mailStatusFilter !== 'all') {
      list = list.filter((email) => {
        const status = email.classification?.status ?? 'open';
        if (mailStatusFilter === 'open') return status !== 'closed'; // every open variant
        if (mailStatusFilter === 'closed') return status === 'closed';
        return status === mailStatusFilter; // open_our_court / open_their_court, exact match
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
  // Opening a folder with no conversation id in the URL should land on the
  // list, not silently auto-open whatever happens to sort first — only an
  // explicit selection (route deep link, or a row the caller marked
  // `selected`) should populate the reading pane.
  const defaultEmail = folderEmails.find((email) => email.selected) ?? null;
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
  const rowIsWholeThread = listRowIsWholeThread(selectedEmail);
  const conversationQuery = useEmailConversationQuery(
    connectedAccount?.id,
    isConnected ? selectedEmail?.threadId : null,
    canLoadConnectedMailbox && !rowIsWholeThread,
    isConnected ? selectedEmail?.conversationKey : null
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
  // Mailbox nickname/address for the account-segment crumb.
  useBreadcrumbLabel(
    accountSlug ? `/app/email/accounts/${accountSlug}` : undefined,
    isSharedMailbox && connectedAccount?.displayName ? connectedAccount.displayName : address
  );
  // The folder path segment can be an opaque folder id — hand the breadcrumb
  // bar its display name (well-known keys resolve to labels the same way).
  // Outside the mail view the URL keeps the same folder segment, so the
  // crumb instead names the active workspace view.
  const workspaceViewLabel =
    workspaceView === 'calendar' ? 'Calendar' : workspaceView === 'tasks' ? 'Tasks' : undefined;
  useBreadcrumbLabel(
    accountSlug ? `/app/email/accounts/${accountSlug}/${selectedFolder}` : undefined,
    workspaceViewLabel ?? selectedFolderLabel
  );
  const isArchiveFolder = selectedConnectedFolder?.key === 'archive';
  const isDeletedFolder = selectedFolderKey === 'deleted';
  const inboxFolderId = foldersQuery.data?.find((folder) => folder.key === 'inbox')?.id ?? null;
  const archiveFolderId = foldersQuery.data?.find((folder) => folder.key === 'archive')?.id ?? null;
  const deletedFolderId = foldersQuery.data?.find((folder) => folder.key === 'deleted')?.id ?? null;
  // Compose lives on the page rather than inside its shell so the page can ask
  // it to close — and save what was typed — before navigating somewhere else.
  const compose = useEmailCompose({
    // Retrying a failed draft load needs the composer, and the composer needs
    // this option — so the handler is reached through a ref it fills in below.
    onRetryDraftHydration: (messageId) => hydrateDraftRef.current(messageId),
    isSending: sendDraftMutation.isPending,
    onSaveDraft: connectedAccount
      ? async (payload, draft, saveOptions) => {
          const result = await saveDraftMutation.mutateAsync({
            accountId: connectedAccount.id,
            signal: saveOptions?.signal,
            onUploadProgress: saveOptions?.onProgress
              ? (event) => saveOptions.onProgress?.(event.loaded, event.total)
              : undefined,
            draftId: draft?.draftId,
            messageId: draft?.messageId,
            subject: payload.subject,
            body: richTextToEmailHtml(payload.body),
            bodyType: 'html',
            to: parseEmailAddresses(payload.to),
            cc: parseEmailAddresses(payload.cc),
            bcc: parseEmailAddresses(payload.bcc),
            attachments: payload.attachments,
            removedAttachmentIds: payload.removedAttachmentIds,
            attachOnly: saveOptions?.attachOnly,
          });
          return {
            draftId: result.draftId,
            messageId: result.messageId,
            attachments: result.message?.attachments,
          };
        }
      : undefined,
    onSendDraft: connectedAccount
      ? (draft) =>
          sendDraftMutation.mutateAsync({
            accountId: connectedAccount.id,
            draftId: draft.draftId,
            messageId: draft.messageId,
          })
      : undefined,
    onDiscardDraft: connectedAccount
      ? (draft, options) =>
          deleteDraftMutation.mutateAsync({
            accountId: connectedAccount.id,
            draftId: draft.draftId,
            messageId: draft.messageId,
            silent: options?.silent,
          })
      : undefined,
    onClosed: () => {
      // Nothing was open behind the composer, so on a narrow screen closing it
      // returns to the list rather than to an empty reading pane.
      if (!routeConversationId) setMobilePane('list');
      if (selectedFolderKey === 'drafts') {
        void messagesQuery.refetch();
        void foldersQuery.refetch();
      }
    },
    // The composer no longer sits on top of the mailbox, so say out loud where
    // an interrupted message went instead of letting it vanish behind the list.
    onDraftSaved: () => toast.success('Draft saved.'),
  });
  const composeOpen = compose.isOpen;
  const navigateToFolder = useCallback(
    (nextFolder: string, options?: { replace?: boolean; resetFilters?: boolean }) => {
      if (!accountSlug) return;
      // Carry the query string across the path change, or deliberately reset it:
      // a different folder starts unfiltered, the same folder keeps its view.
      const search = buildMailboxSearch(options?.resetFilters ? MAILBOX_FILTER_RESET : undefined);
      navigate(buildMailPath(accountSlug, nextFolder, null, search), {
        replace: options?.replace,
      });
    },
    [accountSlug, buildMailboxSearch, navigate]
  );
  // Drops the `/id/…` segment so the folder shows its default (first) mail again.
  const clearRouteSelection = useCallback(() => {
    if (routeConversationId) navigateToFolder(selectedFolder, { replace: true });
  }, [navigateToFolder, routeConversationId, selectedFolder]);
  // A project change re-filters the list, which drops the open conversation with
  // it. Both are one navigation so the new filter is not computed from the URL
  // the other one is about to replace.
  const changeProjectFilter = useCallback(
    (projectId: string | null) => {
      if (accountSlug && routeConversationId) {
        navigate(
          buildMailPath(accountSlug, selectedFolder, null, buildMailboxSearch({ projectId })),
          { replace: true }
        );
      } else {
        setMailboxUrlState({ projectId });
      }
      setMobilePane('list');
    },
    [
      accountSlug,
      buildMailboxSearch,
      navigate,
      routeConversationId,
      selectedFolder,
      setMailboxUrlState,
    ]
  );

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
  // Clicking a row shows the reading pane immediately, but the bodies arrive
  // with the conversation. Until they do, all the pane has is the list row's
  // plain-text preview — see EmailReadingPane's `isBodyLoading` (elli-ui#942).
  const isThreadBodyLoading = isThreadBodyPending({
    hasSelection: Boolean(selectedEmail),
    hasConversation: Boolean(conversationQuery.data?.length),
    hasMessageDetail: Boolean(messageDetailQuery.data),
    isConversationPending: conversationQuery.isPending,
    isMessageDetailPending: messageDetailQuery.isPending,
  });
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

  // Switching mailbox starts from an unfiltered inbox. Compared against the
  // previous account rather than run on every change of it, so the first time
  // an account resolves it cannot wipe the filters a deep link arrived with.
  // Read through a ref so the effect keys on the account alone — a re-run while
  // the reset is queued would cancel it through the cleanup.
  const resetMailboxFiltersRef = useRef(resetMailboxFilters);
  useEffect(() => {
    resetMailboxFiltersRef.current = resetMailboxFilters;
  });
  const previousAccountIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const accountId = connectedAccount?.id;
    const previousAccountId = previousAccountIdRef.current;
    previousAccountIdRef.current = accountId;
    if (!previousAccountId || previousAccountId === accountId) return;
    const timeout = window.setTimeout(() => {
      resetMailboxFiltersRef.current();
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
      navigate(buildMailPath(accountSlug, targetFolder, canonicalId, buildMailboxSearch()), {
        replace: true,
      });
      return;
    }
    if (canonicalId !== routeConversationId) {
      navigate(buildMailPath(accountSlug, selectedFolder, canonicalId, buildMailboxSearch()), {
        replace: true,
      });
    }
  }, [
    accountSlug,
    buildMailboxSearch,
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

  const {
    openNew: openComposeSurface,
    openPendingDraft: openComposePendingDraft,
    isDraftOpenFor: isComposeDraftOpenFor,
    hydrateDraft: hydrateComposeDraft,
    failDraftHydration: failComposeDraftHydration,
  } = compose;
  // The composer takes over the reading pane, so on a narrow screen the page has
  // to switch to that pane or compose would open off-screen behind the list.
  const openComposeTo = useCallback(
    (recipient?: string) => {
      openComposeSurface(recipient);
      setMobilePane('reading');
    },
    [openComposeSurface]
  );
  // Zero-arg on purpose: it is wired straight to a button's onClick, which would
  // otherwise hand the click event over as the recipient.
  const openNewCompose = useCallback(() => openComposeTo(), [openComposeTo]);
  /**
   * `GET /drafts/:id` always goes out to the provider, so waiting for it left
   * the click looking dead (elli-ui#925). The composer opens now, from whatever
   * the query cache already holds for that message — the hydrated copy a hover
   * prefetch warmed, the conversation it belongs to, or at minimum the list
   * row's subject — and the response is merged in when it lands.
   */
  const hydrateDraftFromServer = useCallback(
    (messageId: string) => {
      if (!connectedAccount) return;
      openDraftMutation.mutate(
        { accountId: connectedAccount.id, messageId },
        {
          onSuccess: (result) => {
            if (!result.message) {
              // The provider answered without the draft. `failDraftHydration`
              // keeps the composer read-only rather than letting a save invent
              // a second draft; the toast says why.
              toast.error('This draft could not be loaded.');
              failComposeDraftHydration(messageId);
              return;
            }
            hydrateComposeDraft(messageId, toEditableComposeDraft(result, result.message));
          },
          // The mutation's own `onError` raises the toast.
          onError: () => failComposeDraftHydration(messageId),
        }
      );
    },
    [connectedAccount, failComposeDraftHydration, hydrateComposeDraft, openDraftMutation]
  );
  useEffect(() => {
    hydrateDraftRef.current = hydrateDraftFromServer;
  }, [hydrateDraftFromServer]);

  const openDraftFromList = useCallback(
    (messageId: string) => {
      if (!connectedAccount) return;
      // Re-clicking the draft that is already open must not reset the composer
      // over whatever has been typed into it.
      if (isComposeDraftOpenFor(messageId)) {
        setMobilePane('reading');
        return;
      }
      const row = folderEmails.find((email) => email.id === messageId);
      const cachedMessageId = row?.latestMessageId ?? messageId;
      const cachedMessage = queryClient.getQueryData<ConnectedEmailListItem>(
        emailKeys.message(connectedAccount.id, cachedMessageId)
      );
      const cachedConversation = row?.threadId
        ? queryClient.getQueryData<ConnectedEmailThreadMessage[]>(
            emailKeys.conversation(connectedAccount.id, row.threadId)
          )
        : undefined;
      const conversationMessage = cachedConversation?.find(
        (message) => message.id === cachedMessageId || message.providerId === row?.providerId
      );
      // Richest source first; each field is taken from the first source that has
      // it. No request is added — these are cache reads only.
      const snapshot = buildInstantDraftSnapshot([cachedMessage, conversationMessage, row]);

      openComposePendingDraft({ messageId, ...snapshot.fields, attachments: snapshot.attachments });
      setMobilePane('reading');
      hydrateDraftFromServer(messageId);
    },
    [
      connectedAccount,
      folderEmails,
      hydrateDraftFromServer,
      isComposeDraftOpenFor,
      openComposePendingDraft,
      queryClient,
    ]
  );

  const setWorkspaceView = useCallback(
    (view: EmailWorkspaceView) => setMailboxUrlState({ view }),
    [setMailboxUrlState]
  );

  const selectEmail = useCallback(
    (emailId: string, options?: { replace?: boolean }) => {
      if (!accountSlug) return;
      const email = folderEmails.find((item) => item.id === emailId);
      const targetConversationId = email ? getEmailConversationId(email) : emailId;
      // Re-clicking the open conversation must not push duplicate history entries.
      if (targetConversationId !== routeConversationId) {
        navigate(
          buildMailPath(accountSlug, selectedFolder, targetConversationId, buildMailboxSearch()),
          { replace: options?.replace }
        );
      }
      setMobilePane('reading');
    },
    [accountSlug, buildMailboxSearch, folderEmails, navigate, routeConversationId, selectedFolder]
  );

  /**
   * Opening a message from the list while a draft is open. The composer is a
   * popover now, so it neither blocks the click nor gets torn down by it — the
   * draft stays exactly as typed while the reader changes underneath it. This
   * used to close the composer first, which a floating surface should not do.
   */
  const requestSelectEmail = useCallback((run: () => void) => run(), []);

  /**
   * The list's per-row callbacks, hoisted out of the JSX.
   *
   * `EmailListRow` is memoized, and an arrow written inline in the props below
   * is a new identity on every render of this page — which is every keystroke
   * in search. Declared here they change only when what they close over does,
   * so a keystroke re-renders the rows whose highlight moved and nothing else.
   */
  const handleSelectEmail = useCallback(
    (emailId: string) => {
      requestSelectEmail(() => {
        if (connectedAccount && selectedFolderKey === 'drafts') {
          // Opens now from the cache and hydrates when the provider answers
          // (elli-ui#925).
          openDraftFromList(emailId);
          return;
        }
        selectEmail(emailId);
      });
    },
    [connectedAccount, openDraftFromList, requestSelectEmail, selectEmail, selectedFolderKey]
  );
  const handleArchiveEmail = useCallback(
    (email: EmailListItem) => requestArchive(email.latestMessageId ?? email.id),
    [requestArchive]
  );
  const handleDeleteEmail = useCallback(
    (email: EmailListItem) => {
      if (!connectedAccount) return;
      deleteMessageMutation.mutate({
        accountId: connectedAccount.id,
        messageId: email.latestMessageId ?? email.id,
        targetFolderId: deletedFolderId,
      });
    },
    [connectedAccount, deleteMessageMutation, deletedFolderId]
  );
  const handleToggleFlagEmail = useCallback(
    (email: EmailListItem) => {
      if (!connectedAccount) return;
      toggleFlagMutation.mutate({
        accountId: connectedAccount.id,
        messageId: email.latestMessageId ?? email.id,
        conversationKey: email.conversationKey ?? email.threadId ?? undefined,
        flagged: !email.flagged,
      });
    },
    [connectedAccount, toggleFlagMutation]
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
      // Already composing: swallow the shortcut rather than resetting the
      // message the user is part-way through writing.
      if (composeOpen || target?.closest('[role="dialog"], [role="menu"]')) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      openNewCompose();
    };

    window.addEventListener('keydown', handleComposeShortcut, { capture: true });
    return () => window.removeEventListener('keydown', handleComposeShortcut, { capture: true });
  }, [composeOpen, isConnected, openNewCompose, workspaceView]);

  const selectedEmailIndex = orderedEmails.findIndex((email) => email.id === selectedEmailId);
  const previousEmail = selectedEmailIndex > 0 ? orderedEmails[selectedEmailIndex - 1] : null;
  const nextEmail =
    selectedEmailIndex >= 0 && selectedEmailIndex < orderedEmails.length - 1
      ? orderedEmails[selectedEmailIndex + 1]
      : null;

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
      const action = resolveMailShortcut(event);
      if (!action) return;

      // Browsing would swap the message under an open composer without asking;
      // the composer has to be closed (and saved) deliberately first. Opening
      // Elliot is the exception — it does not move you off the draft.
      if (composeOpen && action !== 'toggleAgent') return;

      if (action === 'toggleAgent') {
        event.preventDefault();
        setAgentOpen((open) => !open);
        return;
      }

      if (action === 'jumpToSearch') {
        const search = document.getElementById('mail-list-search');
        if (!(search instanceof HTMLInputElement)) return;
        event.preventDefault();
        search.focus();
        search.select();
        return;
      }

      if (action === 'previousConversation' && previousEmail) {
        event.preventDefault();
        selectEmail(previousEmail.id, { replace: true });
      }
      if (action === 'nextConversation' && nextEmail) {
        event.preventDefault();
        selectEmail(nextEmail.id, { replace: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composeOpen, nextEmail, previousEmail, selectEmail, workspaceView]);

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
      title="Log out of this email account?"
      description={`${address} will be removed from Elli. Your provider mailbox and messages will not be deleted.`}
      confirmLabel={disconnectAccountMutation.isPending ? 'Logging out…' : 'Log out'}
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
        <div className="mail-workspace flex h-[calc(100dvh-var(--header-height-mobile))] min-w-0 flex-col overflow-hidden bg-mail-paper lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
          <MailAccountBar
            account={connectedAccount}
            mailboxAddress={
              isSharedMailbox && connectedAccount.displayName
                ? connectedAccount.displayName
                : address
            }
            accounts={accountsQuery.data ?? []}
            activeView={workspaceView}
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
    <div className="mail-workspace relative flex h-[calc(100dvh-var(--header-height-mobile))] min-w-0 flex-col overflow-hidden bg-mail-paper lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <MailAccountBar
        account={connectedAccount ?? undefined}
        mailboxAddress={
          isSharedMailbox && connectedAccount?.displayName ? connectedAccount.displayName : address
        }
        accounts={accountsQuery.data ?? []}
        activeView={workspaceView}
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
          <div className="flex min-h-0 flex-1">
            {showEmailList && (
              <div
                className={cn(
                  // The divider belongs to the whole column, not to the rows.
                  // On the list pane it started below the folder picker and the
                  // search box, so the line began a third of the way down.
                  'flex h-full min-h-0 w-full shrink-0 flex-col border-e border-mail-line bg-mail-paper',
                  'lg:w-(--mail-list-width)',
                  mobilePane === 'reading' && 'hidden lg:flex'
                )}
              >
                <MailListChrome
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
                  onSelectFolder={(nextFolder) => {
                    // One navigation: the new folder and its reset filters together.
                    navigateToFolder(nextFolder, { resetFilters: true });
                    setMobilePane('list');
                  }}
                  onFilterChange={(filter) => setMailboxUrlState({ filter })}
                  onStatusFilterChange={(statusFilter) => setMailboxUrlState({ statusFilter })}
                  onProjectChange={changeProjectFilter}
                  onCategoryTagChange={(categoryTagId) => setMailboxUrlState({ categoryTagId })}
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
                            {
                              onSuccess: (created) =>
                                navigateToFolder(created.id, { resetFilters: true }),
                            }
                          )
                      : undefined
                  }
                  onEmptyFolder={
                    connectedAccount &&
                    isDeletedFolder &&
                    deletedFolderId &&
                    checkedMessageIds.size === 0
                      ? () => setEmptyFolderConfirm({ folderId: deletedFolderId })
                      : undefined
                  }
                  emptyFolderDisabled={isBulkOperationRunning || folderEmails.length === 0}
                />

                <EmailListPane
                  accountId={connectedAccount?.id}
                  mailbox={connectedAccount?.id ?? 'connected'}
                  folder={selectedFolder}
                  folderLabel={selectedFolderLabel}
                  emails={folderEmails}
                  isLoading={isMailboxLoading}
                  isError={isMailboxError}
                  selectedEmailId={selectedEmailId}
                  onSelectEmail={handleSelectEmail}
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
                  // Keep auto-paging until a filtered match appears or pages run out.
                  autoFetchWhileEmpty={mailFilter !== 'all' || mailStatusFilter !== 'all'}
                  groupByMonth={
                    isConnected && (selectedFolderKey === 'inbox' || selectedFolderKey === 'sent')
                  }
                  search={messageSearch}
                  // The settled term, not the one mid-typing — see the prop.
                  highlightQuery={debouncedMessageSearch}
                  onSearchChange={setMessageSearch}
                  onArchiveEmail={
                    connectedAccount && !isArchiveFolder ? handleArchiveEmail : undefined
                  }
                  onDeleteEmail={
                    connectedAccount && !isDeletedFolder ? handleDeleteEmail : undefined
                  }
                  onToggleFlagEmail={connectedAccount ? handleToggleFlagEmail : undefined}
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
                'relative min-w-0 flex-1 overflow-hidden bg-mail-pane',
                mobilePane === 'list' ? 'hidden lg:flex' : 'flex'
              )}
            >
              {/*
                elli-ui#807 — the composer is a popover over the workspace, so
                the message behind it stays readable and the list stays usable.
                Nothing is unmounted to make room for it, which is why a draft
                survives clicking through the mailbox.
              */}
              <EmailReadingPane
                email={visibleEmail}
                accountId={connectedAccount?.id}
                mailboxAddress={address}
                inlineImageBaseUrl={connectedAccount?.inlineImageBaseUrl}
                isLoading={isReadingLoading}
                isBodyLoading={isThreadBodyLoading}
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
                              selectedEmail ? getEmailConversationId(selectedEmail) : undefined,
                              buildMailboxSearch()
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
                          add: enabled ? [tag.id] : [],
                          remove: enabled ? [] : [tag.id],
                          addNames: enabled ? [tag.name] : [],
                          removeNames: enabled ? [] : [tag.name],
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
                onToggleFlag={
                  connectedAccount && selectedEmail
                    ? (messageId) =>
                        toggleFlagMutation.mutate({
                          accountId: connectedAccount.id,
                          messageId,
                          conversationKey:
                            selectedEmail.conversationKey ?? selectedEmail.threadId ?? undefined,
                          flagged: !selectedEmail.flagged,
                        })
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
                          body: richTextToEmailHtml(draft.body),
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
                          body: richTextToEmailHtml(draft.body),
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

              {composeOpen && (
                <Suspense fallback={null}>
                  <EmailComposePane
                    compose={compose}
                    mailboxAddress={address}
                    accountId={connectedAccount?.id}
                  />
                </Suspense>
              )}
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

/** The message is passed separately because only the caller has narrowed it. */
function toEditableComposeDraft(
  result: EmailDraftResult,
  message: NonNullable<EmailDraftResult['message']>
): EditableComposeDraft {
  return {
    draftId: result.draftId,
    messageId: result.messageId,
    ...toComposeDraftFields(message),
    attachments: message.attachments ?? [],
  };
}

function isConnectedWellKnownFolderKey(folder: string): folder is EmailFolderKey {
  return CONNECTED_WELL_KNOWN_FOLDER_KEYS.has(folder);
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
