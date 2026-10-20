import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { setHeaderAction } from '@/app/hooks/use-header-action';
import { useLingering } from '@/app/hooks/use-lingering';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { useResetOnChange } from '@/app/hooks/use-reset-on-change';
import { cn } from '@/app/lib/utils';
import type { EmailAgentLayout } from '@/mock/email-agent-panel';
import {
  emailApi,
  type ConnectedEmailListItem,
  type ConnectedEmailThreadMessage,
  type EmailDraftResult,
} from '@/modules/email/api';
import { EmailActivityFeed } from '@/modules/email/components/activity/email-activity-feed';
import { EmailCalendarView } from '@/modules/email/components/calendar/email-calendar-view';
import { ElliotHeaderButton } from '@/modules/email/components/elliot-header-button';
import { EmailAccountNicknameDialog } from '@/modules/email/components/email-account-nickname-dialog';
import {
  EmailBulkProgressPanel,
  type EmailBulkOperationState,
} from '@/modules/email/components/email-bulk-progress-panel';
import { EmailListPane } from '@/modules/email/components/email-list-pane';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import { EmailReconnectRequiredState } from '@/modules/email/components/email-reconnect-required-state';
import type { EmailAttachment, EmailListItem } from '@/modules/email/components/email-row-card';
import { EmailUnactionedBanner } from '@/modules/email/components/email-unactioned-banner';
import {
  MailAccountBar,
  type EmailWorkspaceView,
} from '@/modules/email/components/mail-account-bar';
import { MailListChrome } from '@/modules/email/components/mail-list-chrome';
import { holdSendWithUndo, useHeldEmailSends } from '@/modules/email/components/toast-undo-send';
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
  useEmailSignaturesQuery,
  useEmailTagsQuery,
  useForwardConnectedEmailMutation,
  useMoveEmailMessageMutation,
  useOpenEmailDraftMutation,
  usePermanentlyDeleteEmailMessageMutation,
  usePinnedEmailThreadsQuery,
  useRefreshEmailMessagesMutation,
  useReplyConnectedEmailMutation,
  useRespondToEmailMeetingMutation,
  useSaveEmailDraftMutation,
  useSendEmailDraftMutation,
  useSetEmailThreadPinnedMutation,
  useStartEmailAuthMutation,
  useToggleEmailFlagMutation,
  useUnarchiveEmailMessageMutation,
  useUpdateEmailAccountNicknameMutation,
  useUpdateEmailMeetingMutation,
  useUpdateEmailMessageStatusMutation,
  useUpdateEmailMessageTagsMutation,
} from '@/modules/email/hooks';
import { useEmailAttachmentPreview } from '@/modules/email/hooks/use-email-attachment-preview';
import {
  useEmailCompose,
  type EditableComposeDraft,
} from '@/modules/email/hooks/use-email-compose';
import {
  isAwaitingNextPage,
  paneSlideKey,
  useEmailPaneSlide,
} from '@/modules/email/hooks/use-email-pane-slide';
import { useEmailRealtime } from '@/modules/email/hooks/use-email-realtime';
import { useMailboxUrlState } from '@/modules/email/hooks/use-mailbox-url-state';
import { useUnactionedEmails } from '@/modules/email/hooks/use-unactioned-emails';
import { parseEmailAddresses } from '@/modules/email/lib/email-addresses';
import { resolveBulkArchiveAction } from '@/modules/email/lib/email-bulk-archive-action';
import { encodeEmailAttachments } from '@/modules/email/lib/email-compose-attachments';
import { COMPOSE_LAYER_ATTRIBUTE } from '@/modules/email/lib/email-compose-layer';
import {
  buildInstantDraftSnapshot,
  toComposeDraftFields,
} from '@/modules/email/lib/email-draft-compose';
import { isEmailReconnectRequiredError } from '@/modules/email/lib/email-errors';
import { decideKeyboardAdvance } from '@/modules/email/lib/email-keyboard-paging';
import { listRowIsWholeThread } from '@/modules/email/lib/email-list-body';
import { isEmailListShown, nextEmailListVisible } from '@/modules/email/lib/email-list-visibility';
import { groupEmailsByMonth } from '@/modules/email/lib/email-month-groups';
import { buildMailPath, getEmailConversationId } from '@/modules/email/lib/email-paths';
import { richTextToEmailHtml } from '@/modules/email/lib/email-rich-text';
import { archiveTakesOpenEmail } from '@/modules/email/lib/email-row-leaving';
import { emailSaveScopes } from '@/modules/email/lib/email-save-scopes';
import { resolveMailShortcut } from '@/modules/email/lib/email-shortcut-keys';
import { getSignatureSeed } from '@/modules/email/lib/email-signature';
import { toThreadStatusFilter } from '@/modules/email/lib/email-status-filter';
import { carriesAnyTag, filterTagsFor } from '@/modules/email/lib/email-tag-presets';
import { isThreadBodyPending } from '@/modules/email/lib/email-thread-body-pending';
import { MAILBOX_FILTER_RESET } from '@/modules/email/lib/mailbox-url-state';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { FilePreviewDialog } from '@/modules/files/components/file-preview-dialog';
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
  fullscreen: false,
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
  // Closing keeps the panel for its slide-out before it leaves the tree.
  const agentMounted = useLingering(agentOpen, 220);
  // The list column: closed from its header's collapse button, or by Elliot
  // growing wide; reopened from the tab on the workspace's left edge.
  const [emailListVisible, setEmailListVisible] = useState(true);
  const agentHidEmailList = useRef(false);
  const isMobile = useIsMobile();
  const {
    filter: mailFilter,
    statusFilter: mailStatusFilter,
    projectId: selectedProjectId,
    tagIds: selectedTagIds,
    tagFolderId: selectedTagFolderId,
    view: workspaceView,
  } = mailboxUrlState;
  const [mobilePane, setMobilePane] = useState<'list' | 'reading'>('list');
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [reconnectRequiredAccountId, setReconnectRequiredAccountId] = useState<string | null>(null);
  const [checkedMessageIds, setCheckedMessageIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ count: number } | null>(null);
  const [bulkArchiveConfirm, setBulkArchiveConfirm] = useState<{
    count: number;
    kind: 'archive' | 'unarchive';
  } | null>(null);
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
  // Only Elli's own tags are folders: provider categories are read-only and
  // never written to `tags`, so a view of one would always be empty.
  const folderTags = useMemo(
    () => (tagsQuery.data ?? []).filter((tag) => tag.source === 'custom'),
    [tagsQuery.data]
  );
  const selectedTagFolder = selectedTagFolderId
    ? (folderTags.find((tag) => tag.id === selectedTagFolderId) ?? null)
    : null;
  // A tag deleted while its view is open, or a stale link to one: fall back to
  // the folder in the path rather than asking the API for a tag it 404s on.
  const isMissingTagFolder = Boolean(
    selectedTagFolderId && tagsQuery.isSuccess && !selectedTagFolder
  );
  useEffect(() => {
    if (isMissingTagFolder) setMailboxUrlState({ tagFolderId: null });
  }, [isMissingTagFolder, setMailboxUrlState]);
  // Loaded with the mailbox so a new message or a reply opens with its
  // signature in place. The reply composer and the signature menu read the
  // same cache entry, so this is the one request for all of them.
  const signaturesQuery = useEmailSignaturesQuery(connectedAccount?.id, canLoadConnectedMailbox);
  const newMessageBody = useMemo(
    () => getSignatureSeed(signaturesQuery.data, 'new'),
    [signaturesQuery.data]
  );
  const selectedConnectedFolder = isConnected
    ? (foldersQuery.data?.find((folder) => folder.id === selectedFolder) ??
      foldersQuery.data?.find((folder) => folder.key === selectedFolder) ??
      null)
    : null;
  const selectedFolderQuery = isConnectedWellKnownFolderKey(selectedFolder)
    ? { key: selectedFolder }
    : { id: selectedConnectedFolder?.id ?? selectedFolder };
  const referenceProjectsQuery = useEmailReferenceProjectsQuery(
    connectedAccount?.id,
    selectedFolderQuery,
    canLoadConnectedMailbox
  );
  const activeProjectId = useMemo(() => {
    if (!selectedProjectId || !referenceProjectsQuery.isSuccess) return selectedProjectId;
    return referenceProjectsQuery.data.some((project) => project.entityId === selectedProjectId)
      ? selectedProjectId
      : null;
  }, [referenceProjectsQuery.data, referenceProjectsQuery.isSuccess, selectedProjectId]);
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
      status: toThreadStatusFilter(mailStatusFilter),
      tagId: (!isMissingTagFolder && selectedTagFolderId) || undefined,
      // Answered from the cache server-side, across the whole list (elli-ui#1420).
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
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
  /** Filled in below with the real handler; see `reopenUnsentDraft`. */
  const reopenUnsentDraftRef = useRef<(draft: EditableComposeDraft) => void>(() => {});
  const saveDraftMutation = useSaveEmailDraftMutation();
  const sendDraftMutation = useSendEmailDraftMutation();
  const heldDraftIds = useHeldEmailSends();
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
  const setThreadPinnedMutation = useSetEmailThreadPinnedMutation();
  // A file pressed in the list opens in the same dialog the reading pane uses.
  const rowAttachmentPreview = useEmailAttachmentPreview(connectedAccount?.id);
  const openRowAttachment = rowAttachmentPreview.openAttachment;
  const handleOpenRowAttachment = useCallback(
    (email: EmailListItem, attachment: EmailAttachment) =>
      openRowAttachment(
        email.latestMessageId ?? email.id,
        attachment,
        emailSaveScopes(email.classification?.references)
      ),
    [openRowAttachment]
  );
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
          // Kept before `folder` is repurposed below as this list's folder id:
          // the row still needs to know it is looking at Sent or Drafts, where
          // it is labelled by recipient rather than sender (elli-ui#1115).
          folderKey: email.folder,
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
  // The Filters menu's tags (elli-ui#1420): every Elli tag the organization
  // has, this side's presets first. Provider categories are read-only and not
  // Elli's vocabulary, so they do not appear here.
  const filterTags = useMemo(
    () => filterTagsFor(tagsQuery.data ?? [], mailFilter === 'other' ? 'other' : 'project'),
    [mailFilter, tagsQuery.data]
  );
  const selectedTagNames = useMemo(() => {
    const byId = new Map((tagsQuery.data ?? []).map((tag) => [tag.id, tag.name]));
    return selectedTagIds.flatMap((id) => byId.get(id) ?? []);
  }, [selectedTagIds, tagsQuery.data]);
  const folderEmails = useMemo(() => {
    // A tag view is answered server-side too. This pass is a no-op against an
    // API that knows `tagId`; against one that does not yet, it shows the
    // tagged mail it has rather than the whole Inbox under the tag's name. It
    // also drops a row the moment its tag is removed, ahead of the refetch.
    if (selectedTagFolder) {
      const tagName = selectedTagFolder.name.toLowerCase();
      return emailsForActiveSearch.filter((email) =>
        (email.tags ?? []).some((tag) => tag.toLowerCase() === tagName)
      );
    }
    // Everything else is answered server-side. The tag filter is too; this
    // pass only drops a row the moment its tag is removed, ahead of the
    // refetch, and is a no-op on the server's own answer.
    if (selectedTagNames.length === 0) return emailsForActiveSearch;
    return emailsForActiveSearch.filter((email) => carriesAnyTag(email.tags, selectedTagNames));
  }, [emailsForActiveSearch, selectedTagFolder, selectedTagNames]);
  /**
   * Pinned threads, lifted to the top of this folder (elli-ui#1034).
   *
   * Only on the plain folder view. A pin says "keep this visible", not
   * "exempt this from every filter" — surfacing a pinned thread while the
   * reader is looking at Unread, or at one project, or at search results,
   * would put a row in front of them that does not answer the question they
   * asked. So the moment anything narrows the list, pins behave like any
   * other conversation and appear only if they match.
   */
  const isPlainFolderView =
    mailFilter === 'all' &&
    mailStatusFilter === 'all' &&
    !selectedProjectId &&
    // A tag view is a question too; an untagged pin does not answer it.
    !selectedTagFolderId &&
    selectedTagIds.length === 0 &&
    messageSearch.trim().length === 0;
  const pinnedThreadsQuery = usePinnedEmailThreadsQuery(
    connectedAccount?.id,
    selectedConnectedFolder?.id ?? null,
    canLoadConnectedMailbox && isPlainFolderView
  );
  const emailsWithPinned = useMemo(() => {
    if (!isPlainFolderView) return folderEmails;

    // Same shape the folder page gets, built the same way.
    const pinned: EmailListItem[] = (pinnedThreadsQuery.data ?? []).map((email) => ({
      ...email,
      mailbox: connectedAccount?.id ?? 'connected',
      folderKey: email.folder,
      folder: email.folderId ?? selectedFolder,
      latestMessageId: email.id,
    }));
    if (pinned.length === 0) return folderEmails;

    // The page the list already holds is the fresher copy of any thread that
    // is in both, so it wins; the pinned query only contributes the threads
    // that have fallen off it. Keyed on the conversation, not the message id:
    // a thread that has been replied to since the pin is a different newest
    // message but the same row.
    const seen = new Set<string>();
    const merged: EmailListItem[] = [];
    for (const email of [...folderEmails, ...pinned]) {
      const key = email.conversationKey ?? email.threadId ?? email.id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(email);
    }

    return merged;
  }, [
    connectedAccount?.id,
    folderEmails,
    isPlainFolderView,
    pinnedThreadsQuery.data,
    selectedFolder,
  ]);
  // The list pane renders emails grouped by month (Today/This week/…), which can
  // reorder them relative to the raw query order — server search results arrive in
  // relevance order. Prev/next navigation must walk the list in the order the user
  // actually sees, so flatten the same grouping the list pane renders.
  const orderedEmails = useMemo(
    () => groupEmailsByMonth(emailsWithPinned).flatMap((group) => group.emails),
    [emailsWithPinned]
  );
  // Opening a folder with no conversation id in the URL should land on the
  // list, not silently auto-open whatever happens to sort first — only an
  // explicit selection (route deep link, or a row the caller marked
  // `selected`) should populate the reading pane.
  const defaultEmail = emailsWithPinned.find((email) => email.selected) ?? null;
  // The URL id is a conversation id, so a deep link matches its list row directly.
  const routeSelectedEmail = routeConversationId
    ? (emailsWithPinned.find((email) => getEmailConversationId(email) === routeConversationId) ??
      null)
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
  // Inbox mail opened and left without an action (elli-ui#1378).
  const unactioned = useUnactionedEmails({
    accountId: connectedAccount?.id,
    enabled: isConnected && selectedFolderKey === 'inbox',
    emails: emailsWithPinned,
    openEmail: selectedEmail,
  });
  const selectedFolderLabel =
    selectedTagFolder?.name ??
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
    workspaceView === 'calendar'
      ? 'Calendar'
      : workspaceView === 'tasks'
        ? 'Tasks'
        : workspaceView === 'activity'
          ? 'Activity'
          : undefined;
  useBreadcrumbLabel(
    accountSlug ? `/app/email/accounts/${accountSlug}/${selectedFolder}` : undefined,
    workspaceViewLabel ?? selectedFolderLabel
  );
  const isArchiveFolder = selectedConnectedFolder?.key === 'archive';
  const isDeletedFolder = selectedFolderKey === 'deleted';
  const inboxFolderId = foldersQuery.data?.find((folder) => folder.key === 'inbox')?.id ?? null;
  const bulkArchiveAction = resolveBulkArchiveAction({
    isArchiveFolder,
    isDeletedFolder,
    hasInboxFolder: Boolean(inboxFolderId),
  });
  const archiveFolderId = foldersQuery.data?.find((folder) => folder.key === 'archive')?.id ?? null;
  const deletedFolderId = foldersQuery.data?.find((folder) => folder.key === 'deleted')?.id ?? null;
  // Compose lives on the page rather than inside its shell so the page can ask
  // it to close — and save what was typed — before navigating somewhere else.
  const compose = useEmailCompose({
    // Retrying a failed draft load needs the composer, and the composer needs
    // this option — so the handler is reached through a ref it fills in below.
    onRetryDraftHydration: (messageId) => hydrateDraftRef.current(messageId),
    isSending: sendDraftMutation.isPending,
    heldDraftIds,
    newMessageBody,
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
    // Held for the undo window rather than sent, so the composer closes at once
    // and the message only goes if nobody takes it back. The draft is already
    // saved, so undoing costs nothing but reopening it.
    onSendDraft: connectedAccount
      ? async (draft, sent) => {
          const accountId = connectedAccount.id;
          holdSendWithUndo({
            keys: [draft.draftId, draft.messageId],
            send: () =>
              void sendDraftMutation
                .mutateAsync({ accountId, draftId: draft.draftId, messageId: draft.messageId })
                // The mutation's own `onError` raises the toast.
                .catch(() => undefined),
            onUndo: () => reopenUnsentDraftRef.current(sent),
          });
        }
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
  // A tag view spans folders, so it opens from the Inbox path: the folder
  // decides folder-only actions (Empty, Archive), and a tag has none of them.
  const openTagFolder = useCallback(
    (tagFolderId: string) => {
      if (!accountSlug) return;
      const inboxPath = foldersQuery.data?.find((folder) => folder.key === 'inbox')?.id ?? 'inbox';
      navigate(
        buildMailPath(
          accountSlug,
          inboxPath,
          null,
          buildMailboxSearch({ ...MAILBOX_FILTER_RESET, tagFolderId })
        )
      );
    },
    [accountSlug, buildMailboxSearch, foldersQuery.data, navigate]
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
      // The pinned group is a separate query; left alone it puts a pinned
      // thread the bulk action just moved back at the top of the list.
      void queryClient.invalidateQueries({ queryKey: emailKeys.pinnedThreadsRoot(accountId) });
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
    setBulkArchiveConfirm(null);
  }, [
    checkedMessageIds,
    clearRouteSelection,
    connectedAccount,
    invalidateAfterBulk,
    runBulkPerId,
    selectedEmail,
  ]);
  const runBulkUnarchive = useCallback(() => {
    if (!connectedAccount || checkedMessageIds.size === 0) return;
    const accountId = connectedAccount.id;
    const ids = Array.from(checkedMessageIds);
    void runBulkPerId('unarchive', ids, (messageId) =>
      emailApi.unarchiveMessage(accountId, messageId)
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
    setBulkArchiveConfirm(null);
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
    void runBulkPerId('restore', ids, (messageId) =>
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
      void queryClient.invalidateQueries({
        queryKey: emailKeys.pinnedThreadsRoot(connectedAccount.id),
      });
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

  // Reset selection whenever the folder / account / project context changes.
  // During render rather than in an effect: an effect painted one frame of the
  // previous folder's selection before clearing it.
  useResetOnChange(
    `${connectedAccount?.id ?? ''}|${selectedFolder}|${selectedProjectId ?? ''}|${mailFilter}`,
    () => setCheckedMessageIds(() => new Set())
  );

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
  const showEmailList = isEmailListShown({ visible: emailListVisible, isMobile });
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
    const agentHidList = agentHidEmailList.current;
    agentHidEmailList.current = layout.hidesEmailList;
    setEmailListVisible((visible) =>
      nextEmailListVisible({ visible, agentHidList, agentHidesList: layout.hidesEmailList })
    );
  }, []);

  const {
    openNew: openComposeSurface,
    openPendingDraft: openComposePendingDraft,
    openDraft: openComposeDraft,
    requestClose: requestComposeClose,
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

  /**
   * Undo-send puts the message back in the composer. Something else may be
   * open in it by then, and `openDraft` would write straight over it, so that
   * is closed the usual way first — which saves it to Drafts. If it cannot be
   * closed, the undone message stays where it already is: in Drafts.
   */
  const reopenUnsentDraft = useCallback(
    async (draft: EditableComposeDraft) => {
      if (!(await requestComposeClose())) {
        toast.info('Sending cancelled. The message is in Drafts.');
        return;
      }
      openComposeDraft(draft);
      setMobilePane('reading');
    },
    [openComposeDraft, requestComposeClose]
  );
  useEffect(() => {
    reopenUnsentDraftRef.current = (draft) => void reopenUnsentDraft(draft);
  }, [reopenUnsentDraft]);

  const openDraftFromList = useCallback(
    (messageId: string) => {
      if (!connectedAccount) return;
      // Re-clicking the draft that is already open must not reset the composer
      // over whatever has been typed into it.
      if (isComposeDraftOpenFor(messageId)) {
        setMobilePane('reading');
        return;
      }
      const row = emailsWithPinned.find((email) => email.id === messageId);
      const cachedMessageId = row?.latestMessageId ?? messageId;
      const cachedMessage = queryClient.getQueryData<ConnectedEmailListItem>(
        emailKeys.message(connectedAccount.id, cachedMessageId)
      );
      const cachedConversation = row?.threadId
        ? queryClient.getQueryData<ConnectedEmailThreadMessage[]>(
            emailKeys.conversation(connectedAccount.id, row.threadId, row.conversationKey)
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
      emailsWithPinned,
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

  /**
   * The row Next was pressed on while the next conversation's page loads — the
   * pane shows its skeleton meanwhile (elli-ui#1238). State beside the
   * `pendingAdvanceAfterIdRef` below, which does the moving: this only draws.
   */
  const [awaitingNextAfterId, setAwaitingNextAfterId] = useState<string | null>(null);

  const selectEmail = useCallback(
    (emailId: string, options?: { replace?: boolean }) => {
      if (!accountSlug) return;
      setAwaitingNextAfterId(null);
      const email = emailsWithPinned.find((item) => item.id === emailId);
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
    [
      accountSlug,
      buildMailboxSearch,
      emailsWithPinned,
      navigate,
      routeConversationId,
      selectedFolder,
    ]
  );

  // Replaced below: the composer is no longer a see-through popover but an
  // opaque layer over the reading pane, so leaving it open on a row click left
  // the draft stuck on top of the newly selected mail. Kept until verified.
  // /**
  //  * Opening a message from the list while a draft is open. The composer is a
  //  * popover now, so it neither blocks the click nor gets torn down by it — the
  //  * draft stays exactly as typed while the reader changes underneath it. This
  //  * used to close the composer first, which a floating surface should not do.
  //  */
  // const requestSelectEmail = useCallback((run: () => void) => run(), []);

  /**
   * Opening a message from the list while the composer is open closes it first,
   * the way Collapse does — saved to Drafts — so the clicked mail is what shows.
   * If it cannot close (still sending, or the save failed) it stays, and the
   * click stands down rather than dropping what was typed. Re-clicking the
   * draft already open is left alone: closing and reopening it would only reset
   * the composer under the person typing into it.
   */
  const requestSelectEmail = useCallback(
    (emailId: string, run: () => void) => {
      const isOpenDraft = selectedFolderKey === 'drafts' && isComposeDraftOpenFor(emailId);
      if (!composeOpen || isOpenDraft) {
        run();
        return;
      }
      void requestComposeClose().then((closed) => {
        if (closed) run();
      });
    },
    [composeOpen, isComposeDraftOpenFor, requestComposeClose, selectedFolderKey]
  );

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
      requestSelectEmail(emailId, () => {
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
  // Elliot's archive lets go of the open conversation the way the mailbox's
  // own does, so the row fades out of this folder (elli-ui#651).
  const handleAgentArchiveStart = useCallback(
    (messageIds: readonly string[]) => {
      if (archiveTakesOpenEmail(selectedEmail ?? null, messageIds)) clearRouteSelection();
    },
    [clearRouteSelection, selectedEmail]
  );
  const handleArchiveEmail = useCallback(
    (email: EmailListItem) => requestArchive(email.latestMessageId ?? email.id),
    [requestArchive]
  );
  // No confirmation: unarchiving only puts the mail back in the Inbox, the
  // same as the `u` shortcut in the reading pane.
  const handleUnarchiveEmail = useCallback(
    (email: EmailListItem) => {
      if (!connectedAccount) return;
      if (selectedEmail?.id === email.id) clearRouteSelection();
      unarchiveMessageMutation.mutate({
        accountId: connectedAccount.id,
        messageId: email.latestMessageId ?? email.id,
        targetFolderId: inboxFolderId,
      });
    },
    [clearRouteSelection, connectedAccount, inboxFolderId, selectedEmail, unarchiveMessageMutation]
  );
  // Asks, like every other way of deleting one email does. This was the one
  // path that mutated straight from the row: the hover trash on a list row
  // moved the mail to Deleted Items on a single click, with only a toast after
  // the fact, while the identical trash in the reading pane toolbar, the `d`
  // shortcut and the bulk bar all went through the dialog first (elli-ui#1070).
  // Routing it through `requestDelete` also picks up the selection clearing in
  // `confirmDelete`, so deleting the open email from the list no longer leaves
  // the reading pane showing it.
  const handleDeleteEmail = useCallback(
    (email: EmailListItem) => requestDelete(email.latestMessageId ?? email.id),
    [requestDelete]
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

  const handleTogglePinEmail = useCallback(
    (email: EmailListItem) => {
      if (!connectedAccount) return;
      const conversationKey = email.conversationKey ?? email.threadId;
      if (!conversationKey) return;

      setThreadPinnedMutation.mutate({
        accountId: connectedAccount.id,
        conversationKey,
        threadId: email.threadId ?? null,
        pinned: !email.classification?.pinnedAt,
      });
    },
    [connectedAccount, setThreadPinnedMutation]
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

  /**
   * Arrowing past the last loaded row (elli-ui#1237).
   *
   * Paging is driven by an `IntersectionObserver` on a sentinel below the list,
   * so it only ever fired on a scroll. Keyboard navigation stopped at the last
   * loaded row instead, and the mailbox read as finished while more sat on the
   * server. `decideKeyboardAdvance` owns the rules; this holds what it needs,
   * through a ref so the key handler is not rebuilt on every page of mail.
   */
  const keyboardPagingRef = useRef({
    orderedEmails,
    selectedEmailIndex,
    hasNextPage: false,
    isFetchingNextPage: false,
    loadMoreError: false,
    fetchNextPage: () => {},
  });
  // Written after commit, not during render: the key handler only ever runs
  // between commits, so it always reads the state the reader can see.
  useEffect(() => {
    keyboardPagingRef.current = {
      orderedEmails,
      selectedEmailIndex,
      hasNextPage: isConnected && Boolean(messagesQuery.hasNextPage),
      isFetchingNextPage: messagesQuery.isFetchingNextPage,
      loadMoreError: messagesQuery.isFetchNextPageError,
      fetchNextPage: () => void messagesQuery.fetchNextPage(),
    };
  });

  /**
   * The row the reader was on when they arrowed past the end, so the move they
   * asked for can finish once the page lands. One keypress is one move, rather
   * than one to fetch and another to go.
   */
  const pendingAdvanceAfterIdRef = useRef<string | null>(null);

  const isAwaitingNextConversation = isAwaitingNextPage({
    awaitingAfterId: awaitingNextAfterId,
    selectedEmailId,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    hasRowAfterSelected: selectedEmailIndex >= 0 && selectedEmailIndex < orderedEmails.length - 1,
  });
  const readingPaneSlideRef = useRef<HTMLDivElement>(null);
  const slideReadingPane = useEmailPaneSlide(
    readingPaneSlideRef,
    paneSlideKey(selectedEmailId, isAwaitingNextConversation)
  );

  const canGoToNextConversation =
    selectedEmailIndex >= 0 &&
    (selectedEmailIndex < orderedEmails.length - 1 ||
      (isConnected && Boolean(messagesQuery.hasNextPage) && !messagesQuery.isFetchNextPageError));

  /**
   * Move to the next conversation, paging the list if that is what it takes.
   *
   * Shared by the arrow keys and the reading pane's Next button: they are the
   * same action, and a Next button that goes dead at the last loaded row is the
   * same bug reached with a mouse. Returns whether it did anything, so the key
   * handler can leave an arrow it cannot act on to the browser.
   */
  const goToNextConversation = useCallback(() => {
    const paging = keyboardPagingRef.current;
    const decision = decideKeyboardAdvance({
      selectedIndex: paging.selectedEmailIndex,
      loadedCount: paging.orderedEmails.length,
      hasNextPage: paging.hasNextPage,
      isFetchingNextPage: paging.isFetchingNextPage,
      loadMoreError: paging.loadMoreError,
    });
    const nextRow =
      decision.nextIndex === null ? null : (paging.orderedEmails[decision.nextIndex] ?? null);
    if (!nextRow && !decision.loadMore && !decision.waitForMore) return false;

    if (decision.loadMore) paging.fetchNextPage();
    slideReadingPane('next');
    if (nextRow) {
      selectEmail(nextRow.id, { replace: true });
    } else if (decision.waitForMore) {
      const anchorId = paging.orderedEmails[paging.selectedEmailIndex]?.id ?? null;
      pendingAdvanceAfterIdRef.current = anchorId;
      setAwaitingNextAfterId(anchorId);
    }
    return true;
  }, [selectEmail, slideReadingPane]);

  const goToPreviousConversation = useMemo(() => {
    if (!previousEmail) return undefined;
    return () => {
      slideReadingPane('previous');
      selectEmail(previousEmail.id, { replace: true });
    };
  }, [previousEmail, selectEmail, slideReadingPane]);

  useEffect(() => {
    const anchorId = pendingAdvanceAfterIdRef.current;
    if (!anchorId) return;

    // Moved on by other means — a click, a deep link, the thread being
    // archived. The reader is no longer where they pressed the key, so the
    // pending move is no longer theirs to make.
    if (selectedEmailId !== anchorId) {
      pendingAdvanceAfterIdRef.current = null;
      return;
    }

    const index = orderedEmails.findIndex((email) => email.id === anchorId);
    const next = index >= 0 ? orderedEmails[index + 1] : undefined;
    if (next) {
      pendingAdvanceAfterIdRef.current = null;
      selectEmail(next.id, { replace: true });
      return;
    }

    // Nothing arrived and nothing more is coming — stop waiting, or the next
    // page to land for any reason would move the reader without being asked.
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchNextPageError) {
      pendingAdvanceAfterIdRef.current = null;
    }
  }, [
    messagesQuery.hasNextPage,
    messagesQuery.isFetchNextPageError,
    orderedEmails,
    selectEmail,
    selectedEmailId,
  ]);

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

      if (action === 'previousConversation' && goToPreviousConversation) {
        event.preventDefault();
        goToPreviousConversation();
      }
      if (action === 'nextConversation') {
        // Only claim the key when it does something. An arrow at the true end
        // of the mailbox belongs to the browser.
        if (goToNextConversation()) event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composeOpen, goToNextConversation, goToPreviousConversation, workspaceView]);

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
  const bulkArchiveCount = bulkArchiveConfirm?.count ?? 0;
  const bulkArchiveNoun = bulkArchiveCount === 1 ? '1 email' : `${bulkArchiveCount} emails`;
  const bulkArchiveDialog = (
    <ConfirmDialog
      open={Boolean(bulkArchiveConfirm)}
      onOpenChange={(open) => {
        if (!isBulkOperationRunning && !open) setBulkArchiveConfirm(null);
      }}
      title={
        bulkArchiveConfirm?.kind === 'unarchive'
          ? `Unarchive ${bulkArchiveNoun}?`
          : `Archive ${bulkArchiveNoun}?`
      }
      description={
        bulkArchiveConfirm?.kind === 'unarchive'
          ? 'The selected emails will be moved out of Archive and back to your Inbox.'
          : 'The selected emails will be moved out of your inbox and into Archive.'
      }
      confirmLabel={bulkArchiveConfirm?.kind === 'unarchive' ? 'Move to Inbox' : 'Archive'}
      variant="primary"
      isPending={isBulkOperationRunning}
      autoFocusConfirm
      onConfirm={bulkArchiveConfirm?.kind === 'unarchive' ? runBulkUnarchive : runBulkArchive}
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

  // Memoised on what it shows, so the header is not redrawn on every keystroke here.
  const elliotHeaderButton = useMemo(
    () => (
      <ElliotHeaderButton
        ref={agentTriggerRef}
        open={agentOpen}
        onClick={() => setAgentOpen((open) => !open)}
      />
    ),
    [agentOpen]
  );
  useEffect(() => {
    setHeaderAction(workspaceView === 'mail' ? elliotHeaderButton : null);
    return () => setHeaderAction(null);
  }, [elliotHeaderButton, workspaceView]);

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
              mailboxAddress={connectedAccount?.mailboxAddress ?? null}
              provider={connectedAccount?.provider ?? null}
            />
          ) : workspaceView === 'activity' ? (
            <EmailActivityFeed />
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
          <div className="relative flex min-h-0 flex-1">
            {!showEmailList && !agentLayout.fullscreen && (
              // The way back to a closed list (elli-ui#1409). It went missing
              // when Elliot's full screen landed, which left the list hidden
              // with nothing to bring it back but closing Elliot.
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute start-0 top-1/2 z-20 hidden h-12 w-8 -translate-y-1/2 cursor-pointer rounded-s-none border-s-0 bg-mail-pane text-mail-ink shadow-sm hover:bg-mail-chip lg:inline-flex"
                aria-label="Show email list"
                aria-expanded={false}
                title="Show email list"
                onClick={() => setEmailListVisible(true)}
              >
                <PanelLeftOpen aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </Button>
            )}
            {showEmailList && (
              <div
                className={cn(
                  // The divider belongs to the whole column, not to the rows.
                  // On the list pane it started below the folder picker and the
                  // search box, so the line began a third of the way down.
                  'flex h-full min-h-0 w-full shrink-0 flex-col border-e border-mail-line bg-mail-pane',
                  'lg:w-(--mail-list-width)',
                  // On a phone the open message covers the list rather than
                  // replacing it. `display: none` threw the list's layout away:
                  // its scroll offset dropped to 0 and every row it was
                  // measuring reported a height of 0, so coming back it
                  // re-measured and settled somewhere else. Laid out but
                  // invisible, it keeps its place — and `visibility: hidden`
                  // still takes it out of reach of taps, focus and screen
                  // readers.
                  mobilePane === 'reading' && 'invisible absolute inset-0 lg:visible lg:static'
                )}
              >
                <MailListChrome
                  selectedFolder={selectedFolder}
                  folders={foldersQuery.data}
                  filter={mailFilter}
                  statusFilter={mailStatusFilter}
                  search={messageSearch}
                  projects={referenceProjectsQuery.data}
                  filterTags={filterTags}
                  selectedProjectId={activeProjectId}
                  selectedTagIds={selectedTagIds}
                  folderTags={folderTags}
                  selectedTagFolder={selectedTagFolder}
                  isRefreshing={showEmailSyncIndicator}
                  onSelectFolder={(nextFolder) => {
                    // One navigation: the new folder and its reset filters together.
                    navigateToFolder(nextFolder, { resetFilters: true });
                    setMobilePane('list');
                  }}
                  onSelectTagFolder={(tagFolderId) => {
                    openTagFolder(tagFolderId);
                    setMobilePane('list');
                  }}
                  onFilterChange={(filter) => setMailboxUrlState({ filter })}
                  onStatusFilterChange={(statusFilter) => setMailboxUrlState({ statusFilter })}
                  onProjectChange={changeProjectFilter}
                  onTagFilterChange={(tagIds) => setMailboxUrlState({ tagIds })}
                  onSearchChange={setMessageSearch}
                  onRefresh={() => {
                    if (connectedAccount) {
                      refreshMessagesMutation.mutate({ accountId: connectedAccount.id });
                    }
                  }}
                  onCompose={openNewCompose}
                  onCollapse={() => setEmailListVisible(false)}
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

                <EmailUnactionedBanner
                  accountId={connectedAccount?.id}
                  items={unactioned.items}
                  now={unactioned.now}
                  onOpen={(email) => handleSelectEmail(email.id)}
                />

                <EmailListPane
                  accountId={connectedAccount?.id}
                  mailbox={connectedAccount?.id ?? 'connected'}
                  folder={selectedFolder}
                  folderLabel={selectedFolderLabel}
                  emails={emailsWithPinned}
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
                  isFetching={messagesQuery.isFetching}
                  loadMoreError={messagesQuery.isFetchNextPageError}
                  // `cancelRefetch: false`: the list asks again whenever its end
                  // is on screen, so a call while a page is already loading must
                  // join that fetch, not cancel and restart it.
                  onLoadMore={() => void messagesQuery.fetchNextPage({ cancelRefetch: false })}
                  // Keep auto-paging until a filtered match appears or pages
                  // run out. Only the "other" category tag is still filtered
                  // in the browser; everything else is answered server-side.
                  autoFetchWhileEmpty={mailFilter === 'other'}
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
                  onUnarchiveEmail={
                    connectedAccount && isArchiveFolder ? handleUnarchiveEmail : undefined
                  }
                  onDeleteEmail={
                    connectedAccount && !isDeletedFolder ? handleDeleteEmail : undefined
                  }
                  onToggleFlagEmail={connectedAccount ? handleToggleFlagEmail : undefined}
                  onTogglePinEmail={connectedAccount ? handleTogglePinEmail : undefined}
                  onOpenAttachment={connectedAccount ? handleOpenRowAttachment : undefined}
                  checkedIds={checkedMessageIds}
                  onToggleChecked={connectedAccount ? toggleChecked : undefined}
                  onToggleCheckedAll={
                    connectedAccount
                      ? () => {
                          const allChecked =
                            emailsWithPinned.length > 0 &&
                            emailsWithPinned.every((email) => checkedMessageIds.has(email.id));
                          setCheckedMessageIds(
                            () =>
                              new Set(allChecked ? [] : emailsWithPinned.map((email) => email.id))
                          );
                        }
                      : undefined
                  }
                  onClearChecked={clearChecked}
                  onBulkArchive={
                    connectedAccount && bulkArchiveAction
                      ? bulkArchiveAction.kind === 'restore'
                        ? runBulkRestore
                        : () =>
                            setBulkArchiveConfirm({
                              count: checkedMessageIds.size,
                              kind:
                                bulkArchiveAction.kind === 'unarchive' ? 'unarchive' : 'archive',
                            })
                      : undefined
                  }
                  onBulkDelete={
                    connectedAccount
                      ? () => setBulkDeleteConfirm({ count: checkedMessageIds.size })
                      : undefined
                  }
                  isBulkMutating={isBulkOperationRunning}
                  bulkArchiveLabel={bulkArchiveAction?.label}
                  bulkArchiveVariant={bulkArchiveAction?.variant}
                  bulkDeleteLabel="Delete"
                />
              </div>
            )}

            <div
              // The layer both full-page editors live in: the new-message one
              // below, and a reply that portals in when it goes full page
              // (elli-ui#1008).
              {...{ [COMPOSE_LAYER_ATTRIBUTE]: '' }}
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
              {/* What slides between conversations (elli-ui#1238). A wrapper,
                  so the pane itself is never remounted to replay it. */}
              <div ref={readingPaneSlideRef} className="flex min-h-0 min-w-0 flex-1">
                <EmailReadingPane
                  email={visibleEmail}
                  accountId={connectedAccount?.id}
                  calendarSupported={connectedAccount?.provider === 'outlook'}
                  mailboxAddress={address}
                  inlineImageBaseUrl={connectedAccount?.inlineImageBaseUrl}
                  isLoading={isReadingLoading || isAwaitingNextConversation}
                  isBodyLoading={isThreadBodyLoading}
                  isError={isReadingError}
                  onPrevious={goToPreviousConversation}
                  // Enabled while more mail can still be fetched, not only while
                  // the next row is already loaded — see `goToNextConversation`.
                  onNext={canGoToNextConversation ? goToNextConversation : undefined}
                  hideFeedbackBubble={composeOpen || agentOpen}
                  onBack={() => {
                    clearRouteSelection();
                    setMobilePane('list');
                  }}
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
                              selectedEmail?.conversationKey ??
                              selectedEmail?.threadId ??
                              undefined,
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
                      ? async (messageId, draft) => {
                          const sent = await replyMutation.mutateAsync({
                            accountId: connectedAccount.id,
                            messageId,
                            body: richTextToEmailHtml(draft.body),
                            bodyType: 'html',
                            // The composer built the quote (or deliberately left
                            // it out), so the provider must not add its own —
                            // Graph's reply action otherwise sends two
                            // (elli-ui#1176).
                            quoteHandledByClient: draft.quoteHandledByClient,
                            subject: selectedEmail?.subject,
                            to: parseEmailAddresses(draft.to),
                            cc: parseEmailAddresses(draft.cc),
                            bcc: parseEmailAddresses(draft.bcc),
                            // Read only now, with a message to put them on.
                            attachments: await encodeEmailAttachments(draft.attachments),
                          });
                          unactioned.markHandled(selectedEmail);
                          return sent;
                        }
                      : undefined
                  }
                  onForward={
                    connectedAccount
                      ? async (messageId, draft) => {
                          const sent = await forwardMutation.mutateAsync({
                            accountId: connectedAccount.id,
                            messageId,
                            body: richTextToEmailHtml(draft.body),
                            bodyType: 'html',
                            subject: selectedEmail?.subject,
                            to: parseEmailAddresses(draft.to),
                            cc: parseEmailAddresses(draft.cc),
                            bcc: parseEmailAddresses(draft.bcc),
                            // Read only now, with a message to put them on.
                            attachments: await encodeEmailAttachments(draft.attachments),
                          });
                          unactioned.markHandled(selectedEmail);
                          return sent;
                        }
                      : undefined
                  }
                  isRespondingToMeeting={respondToMeetingMutation.isPending}
                  isUpdatingMeeting={updateMeetingMutation.isPending}
                  isCancellingMeeting={cancelMeetingMutation.isPending}
                  onRespondToMeeting={
                    connectedAccount
                      ? async (messageId, response) => {
                          const result = await respondToMeetingMutation.mutateAsync({
                            accountId: connectedAccount.id,
                            messageId,
                            response,
                            sendResponse: true,
                          });
                          unactioned.markHandled(selectedEmail);
                          return result;
                        }
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
          mailboxAddress={connectedAccount?.mailboxAddress ?? null}
          provider={connectedAccount?.provider ?? null}
        />
      ) : workspaceView === 'activity' ? (
        <EmailActivityFeed />
      ) : (
        <TasksWorkspaceView inWorkspace />
      )}

      {workspaceView === 'mail' && agentMounted && (
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
            inlineImageBaseUrl={connectedAccount?.inlineImageBaseUrl}
            onArchiveStart={handleAgentArchiveStart}
          />
        </Suspense>
      )}
      {nicknameDialog}
      {disconnectDialog}
      {archiveDialog}
      <FilePreviewDialog
        {...rowAttachmentPreview.dialogProps}
        saveToFiles={
          rowAttachmentPreview.previewAttachment
            ? {
                rootLabel: 'Files',
                projectScopes: rowAttachmentPreview.previewAttachment.projectScopes,
                onSaved: () =>
                  toast.success(
                    `Saved ${rowAttachmentPreview.previewAttachment?.attachment.name} to Files.`
                  ),
              }
            : null
        }
      />
      {deleteDialog}
      {bulkDeleteDialog}
      {bulkArchiveDialog}
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
