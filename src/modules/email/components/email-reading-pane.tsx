import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { toastApiError } from '@/app/lib/toast-api-error';
import { cn } from '@/app/lib/utils';
import type {
  ConnectedEmailFolder,
  ConnectedEmailTag,
  EmailMeetingEvent,
  EmailMeetingResponseAction,
} from '@/modules/email/api';
import { EmailAssigneePicker } from '@/modules/email/components/email-assignee-picker';
import { EmailMeetingEventCard } from '@/modules/email/components/email-meeting-event-card';
import {
  EmailReadingPaneEmptyState,
  EmailReadingPaneErrorState,
  EmailReadingPaneSkeleton,
} from '@/modules/email/components/email-reading-pane-states';
import { useEmailReferenceMarker } from '@/modules/email/components/email-reference-marker';
import { EmailThreadStatusMarker } from '@/modules/email/components/email-reference-marker-parts';
import {
  type EmailReferenceMarkerState,
  type EmailThreadAssigneeInfo,
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import {
  EmailReplyComposer,
  type EmailReplyDraft,
} from '@/modules/email/components/email-reply-composer';
import type { EmailListItem, EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { EmailThreadMessageCard } from '@/modules/email/components/email-thread-message-card';
import { EmailThreadNotes } from '@/modules/email/components/email-thread-notes';
import { EmailThreadTimelineEntry } from '@/modules/email/components/email-thread-timeline-entry';
import { MailDetailsPanel } from '@/modules/email/components/mail-details-panel';
import { MailLinkedItems } from '@/modules/email/components/mail-linked-items';
import { MailReadingToolbar } from '@/modules/email/components/mail-reading-toolbar';
import { MailReplyStrip } from '@/modules/email/components/mail-reply-strip';
import { MailShortcutsMenu } from '@/modules/email/components/mail-shortcuts-menu';
import { MailThreadActions } from '@/modules/email/components/mail-thread-actions';
import { MailThreadTasks } from '@/modules/email/components/mail-thread-tasks';
import { ThreadAddTaskLinks } from '@/modules/email/components/thread-add-task-links';
import { useSaveEmailThreadClassificationMutation } from '@/modules/email/hooks';
import {
  useInvalidateEmailActivity,
  useThreadActivityQuery,
} from '@/modules/email/hooks/email-activity.hooks';
import { useEmailAiSuggestion } from '@/modules/email/hooks/use-email-ai-suggestion';
import { useEmailAttachmentPreview } from '@/modules/email/hooks/use-email-attachment-preview';
import { useEmailSwipeNavigation } from '@/modules/email/hooks/use-email-swipe-navigation';
import { useShowEmailThreadTimeline } from '@/modules/email/hooks/use-email-thread-timeline-visibility';
import { useThreadCalendarEvents } from '@/modules/email/hooks/use-thread-calendar-events';
import { elliotFilingUntouched, taskDraftFormValues } from '@/modules/email/lib/elliot-reading';
import { setOpenEmailSource } from '@/modules/email/lib/email-action-source';
import { installEmailActionSourceHeaders } from '@/modules/email/lib/email-action-source-headers';
import { isHiddenInlineEmailAttachment } from '@/modules/email/lib/email-attachments';
import {
  createOptimisticReplyId,
  isReplyableEmailMessage,
  markPendingReplyFailed,
  markPendingReplySent,
  type PendingEmailReply,
} from '@/modules/email/lib/email-reply-state';
import { emailSaveScopes } from '@/modules/email/lib/email-save-scopes';
import {
  pendingStandInAttachmentCount,
  resolveThreadHeaderCounts,
} from '@/modules/email/lib/email-thread-counts';
import {
  latestThreadMessage,
  orderThreadNewestFirst,
} from '@/modules/email/lib/email-thread-order';
import { groupThreadActivity, threadMessageKey } from '@/modules/email/lib/thread-activity';
import { FeedbackAskDialog } from '@/modules/feedback/components/feedback-ask-dialog';
import {
  hasAskedForFeedbackThisSession,
  markFeedbackAskShown,
  shouldAskForFeedback,
} from '@/modules/feedback/lib/feedback-ask';
import { FilePreviewDialog } from '@/modules/files/components/file-preview-dialog';
import { useProjectFolderQuery } from '@/modules/project/hooks';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { TaskFormDialog } from '@/modules/tasks/components/task-form-dialog';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import {
  useCreateTaskMutation,
  useSetTaskCompletedMutation,
  useThreadTasksQuery,
  useUpdateTaskMutation,
} from '@/modules/tasks/hooks/tasks.hooks';
import { findAssigneeForUser, toAssigneeOption } from '@/modules/tasks/lib/task-assignees';
import { changedTaskFields } from '@/modules/tasks/lib/task-edit';
import type {
  CreateTaskInput,
  Task,
  TaskEmailReference,
  TaskFormData,
} from '@/modules/tasks/schemas/task.schema';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { Paperclip } from 'lucide-react';
import { toast } from 'sonner';

// Writes made while a thread is open name it, so the server can record what
// each email made someone do (elli-ui#1309).
installEmailActionSourceHeaders();

interface EmailReadingPaneProps {
  email: EmailListItem | null;
  accountId?: string;
  /** The mailbox has a calendar (Outlook), so a thread can make events in it. */
  calendarSupported?: boolean;
  mailboxAddress: string;
  inlineImageBaseUrl?: string | null;
  isLoading?: boolean;
  /**
   * The thread's real bodies are still loading, so `email` carries only the
   * list row. Every message it stands in for renders a placeholder rather than
   * the plain-text preview (elli-ui#942).
   */
  isBodyLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  folders?: ConnectedEmailFolder[];
  tags?: ConnectedEmailTag[];
  isUpdatingTags?: boolean;
  isCreatingTag?: boolean;
  archiveActionLabel?: string;
  onMoveToFolder?: (messageId: string, folderId: string) => void;
  onToggleTag?: (messageId: string, tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreateTag?: (name: string, messageId?: string) => void;
  onArchive?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  /** Flags or unflags the open conversation — the `F` shortcut. */
  onToggleFlag?: (messageId: string) => void;
  onPermanentDelete?: (messageId: string) => Promise<void> | void;
  isPermanentlyDeleting?: boolean;
  onMarkUnread?: (messageId: string) => void;
  isUpdatingReadStatus?: boolean;
  isSendingReply?: boolean;
  onReply?: (
    messageId: string,
    draft: EmailReplyDraft
  ) => Promise<EmailThreadMessage | null | void> | EmailThreadMessage | null | void;
  onForward?: (
    messageId: string,
    draft: EmailReplyDraft
  ) => Promise<EmailThreadMessage | null | void> | EmailThreadMessage | null | void;
  onComposeTo?: (address: string) => void;
  onSearchSender?: (address: string) => void;
  /** The full-page compose pane is open and covers the feedback bubble's corner. */
  hideFeedbackBubble?: boolean;
  isRespondingToMeeting?: boolean;
  isUpdatingMeeting?: boolean;
  isCancellingMeeting?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onBack?: () => void;
  onOpenAgent?: () => void;
  agentTriggerRef?: Ref<HTMLButtonElement>;
  onRespondToMeeting?: (
    messageId: string,
    response: EmailMeetingResponseAction
  ) => Promise<EmailMeetingEvent>;
  onUpdateMeeting?: (
    messageId: string,
    input: { subject: string; startAt: string; endAt: string; location: string }
  ) => Promise<EmailMeetingEvent>;
  onCancelMeeting?: (messageId: string, comment?: string) => Promise<EmailMeetingEvent>;
}

export function EmailReadingPane({
  email,
  accountId,
  calendarSupported = false,
  mailboxAddress,
  inlineImageBaseUrl,
  isLoading = false,
  isBodyLoading = false,
  isError = false,
  onRetry,
  tags,
  isUpdatingTags,
  isCreatingTag,
  archiveActionLabel = 'Archive',
  onToggleTag,
  onCreateTag,
  onArchive,
  onDelete,
  onToggleFlag,
  isSendingReply = false,
  onReply,
  onForward,
  onComposeTo,
  onSearchSender,
  hideFeedbackBubble = false,
  isRespondingToMeeting = false,
  isUpdatingMeeting = false,
  isCancellingMeeting = false,
  onPrevious,
  onNext,
  onBack,
  onOpenAgent,
  agentTriggerRef,
  onRespondToMeeting,
  onUpdateMeeting,
  onCancelMeeting,
}: EmailReadingPaneProps) {
  const showThreadTimeline = useShowEmailThreadTimeline();
  const [replyTarget, setReplyTarget] = useState<{
    emailId: string;
    messageId: string;
    mode: 'reply' | 'forward';
  } | null>(null);
  /** The reply composer has gone full page and is covering this pane. */
  const [isReplyFullPage, setIsReplyFullPage] = useState(false);
  const [pendingReplies, setPendingReplies] = useState<PendingEmailReply[]>([]);
  const attachmentPreview = useEmailAttachmentPreview(accountId);
  const saveClassificationMutation = useSaveEmailThreadClassificationMutation();
  // The tasks this thread has raised. Keyed on the conversation, so it follows
  // the reader from thread to thread without the panel asking for it.
  const queryClient = useQueryClient();
  const threadTasksQuery = useThreadTasksQuery(accountId, email?.conversationKey);
  const activityThreadKey = email?.conversationKey ?? email?.threadId ?? null;
  const threadActivityQuery = useThreadActivityQuery(
    accountId,
    activityThreadKey,
    showThreadTimeline
  );

  // Anything done from this thread is recorded against it: the open thread is
  // what writes made from here name.
  useEffect(() => {
    if (!accountId || !email || !activityThreadKey) return;
    setOpenEmailSource({
      accountId,
      providerId: email.providerId ?? null,
      conversationKey: activityThreadKey,
    });
    return () => setOpenEmailSource(null);
  }, [accountId, activityThreadKey, email]);

  // Refresh the timeline once a burst of changes made from here has settled,
  // rather than after each one.
  const pendingWrites = useIsMutating();
  const refetchActivity = threadActivityQuery.refetch;
  const hadPendingWrites = useRef(false);
  useEffect(() => {
    if (pendingWrites > 0) {
      hadPendingWrites.current = true;
      return;
    }
    if (!hadPendingWrites.current || !showThreadTimeline) return;
    hadPendingWrites.current = false;
    void refetchActivity();
  }, [pendingWrites, refetchActivity, showThreadTimeline]);
  const threadCalendarEvents = useThreadCalendarEvents({
    accountId,
    email,
    enabled: calendarSupported,
  });
  /**
   * Ticking a task off and opening it to edit, from the thread that raised it
   * (elli-ui#1057).
   *
   * `useUpdateTaskMutation` writes its result into the cached boards, which is
   * where a task normally lives — it knows nothing about this list, so the
   * thread's own query is invalidated after each write or the row would keep
   * showing what it showed before.
   */
  const [editingThreadTask, setEditingThreadTask] = useState<Task | null>(null);
  const updateThreadTask = useUpdateTaskMutation();
  /**
   * A new task raised from this thread, in the board's own dialog rather than a
   * second, smaller form beside it — one way to write a task, everywhere. Holds
   * the thread the task starts out citing and who it starts out with; `null`
   * while the dialog is closed.
   */
  const [newThreadTask, setNewThreadTask] = useState<{
    reference: TaskEmailReference;
    assignee: InfiniteSearchSelectOption | null;
    /** Elliot's drafted task, when the task is raised from its banner. */
    initialValues?: Partial<TaskFormData>;
  } | null>(null);
  const createThreadTask = useCreateTaskMutation();
  /**
   * Opens the dialog seeded with the thread and whoever the thread is assigned
   * to. The thread's assignee is a user and a task's is an employee, so the one
   * is looked up in the task assignee list — the same cached query the picker
   * reads, so this is usually no request at all. A thread nobody holds, or a
   * lookup that fails, opens unassigned rather than not opening.
   */
  const openNewThreadTask = useCallback(
    async (
      reference: TaskEmailReference,
      threadAssignee: EmailThreadAssigneeInfo | null,
      initialValues?: Partial<TaskFormData>
    ) => {
      let assignee: InfiniteSearchSelectOption | null = null;
      if (threadAssignee) {
        const people = await queryClient
          .fetchQuery({
            queryKey: taskKeys.assignees(),
            queryFn: () => tasksApi.assignees(),
            staleTime: 5 * 60 * 1000,
          })
          .catch(() => []);
        const person = findAssigneeForUser(people, threadAssignee);
        assignee = person ? toAssigneeOption(person) : null;
      }
      setNewThreadTask({ reference, assignee, initialValues });
    },
    [queryClient]
  );
  const setThreadTaskCompleted = useSetTaskCompletedMutation();
  // The timeline draws each task this thread raised as it is now, so it is
  // refreshed after any write to one — ticked, edited, deleted or new.
  const refreshActivity = useInvalidateEmailActivity();
  const refreshThreadTasks = useCallback(
    () => queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
    [queryClient]
  );
  const handleToggleThreadTask = useCallback(
    (task: Task, completed: boolean) => {
      setThreadTaskCompleted.mutate({ id: task.id, completed }, { onSettled: refreshActivity });
    },
    [setThreadTaskCompleted, refreshActivity]
  );
  const handleDeleteThreadTask = useCallback(
    (task: Task) => {
      setEditingThreadTask(null);
      void tasksApi
        .delete(task.id)
        .then(async () => {
          toast.success('Task deleted');
          await refreshThreadTasks();
          await queryClient.invalidateQueries({ queryKey: taskKeys.boards() });
          refreshActivity();
        })
        .catch((error: unknown) => toastApiError(error, 'Failed to delete task'));
    },
    [queryClient, refreshThreadTasks, refreshActivity]
  );
  // Closed on the click. Both writes draw themselves into this panel's list
  // before they are sent, so the dialog has nothing left to wait for
  // (elli-ui#1125); a failure rolls the row back and raises a toast.
  const handleSubmitThreadTask = useCallback(
    (payload: CreateTaskInput) => {
      if (!editingThreadTask) {
        createThreadTask.mutate(payload, { onSettled: refreshActivity });
        setNewThreadTask(null);
        return;
      }
      // Only what changed — the dialog rebuilds the due date on every save, so
      // sending the whole form tells the server a date moved that nobody
      // touched. Same reasoning as the board's own edit.
      updateThreadTask.mutate(
        { ...changedTaskFields(editingThreadTask, payload), id: editingThreadTask.id },
        { onSettled: refreshActivity }
      );
      setEditingThreadTask(null);
    },
    [createThreadTask, editingThreadTask, updateThreadTask, refreshActivity]
  );
  // The details card starts open; collapsing it is a per-reader preference for
  // the session, not something worth persisting.
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  // Which conversation has been scrolled past its subject, rather than a bare
  // boolean: switching conversations then clears it by itself, with no effect
  // resetting state the render could have derived.
  const [scrolledThreadId, setScrolledThreadId] = useState<string | null>(null);
  // Swipe between conversations on mobile (elli-ui#1068) — desktop keeps a
  // trackpad drag over the pane as an ordinary scroll.
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEmailSwipeNavigation(scrollContainerRef, { onPrevious, onNext, enabled: isMobile });
  // `E` expands or collapses the whole thread at once; null means every card is
  // on its own choice, which is where a freshly opened conversation starts.
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const expandAllThreadRef = useRef<string | undefined>(undefined);
  if (expandAllThreadRef.current !== email?.id) {
    // Derived during render rather than in an effect: a new conversation opens
    // with its own newest message, never inheriting the last thread's state.
    expandAllThreadRef.current = email?.id;
    if (expandAll !== null) setExpandAll(null);
  }
  const conversationKey = email?.conversationKey ?? email?.threadId ?? email?.id ?? '';
  const referenceMarkerState: EmailReferenceMarkerState = useMemo(
    () =>
      email?.classification
        ? {
            id: email.classification.id ?? null,
            conversationKey: email.classification.conversationKey,
            threadId: email.classification.threadId ?? email.threadId ?? null,
            status: email.classification.status,
            assignedTo: email.classification.assignedTo ?? null,
            references: email.classification.references,
          }
        : {
            id: null,
            conversationKey,
            threadId: email?.threadId ?? null,
            status: 'unset',
            assignedTo: null,
            references: [],
          },
    [conversationKey, email]
  );
  /**
   * The details panel is the one place a thread is deliberately reshaped —
   * reassigned, handed over, linked to a record — so it is where asking why is
   * worth something (elli-ui#1050). The ask follows the save rather than the
   * click: a change the server refused is not a change to explain.
   *
   * `detailsEditsRef` counts within this mount and the session flag survives
   * between them, because the pane unmounts on every thread the reader opens.
   */
  const [feedbackAskOpen, setFeedbackAskOpen] = useState(false);
  const detailsEditsRef = useRef(0);
  const saveReferenceMarkerState = useCallback(
    (nextState: EmailReferenceMarkerState) => {
      if (!accountId || !conversationKey) return;
      saveClassificationMutation.mutate(
        {
          accountId,
          conversationKey,
          threadId: nextState.threadId ?? email?.threadId ?? null,
          status: nextState.status,
          assignedToId: nextState.assignedTo?.id ?? null,
          references: nextState.references,
        },
        {
          onSuccess: () => {
            detailsEditsRef.current += 1;
            if (
              !shouldAskForFeedback({
                askedThisSession: hasAskedForFeedbackThisSession(),
                edits: detailsEditsRef.current,
              })
            ) {
              return;
            }
            // Marked as shown the moment it opens, not when it is answered:
            // dismissing is an answer, and closing it should not re-arm it.
            markFeedbackAskShown();
            setFeedbackAskOpen(true);
          },
        }
      );
    },
    [accountId, conversationKey, email?.threadId, saveClassificationMutation]
  );
  const saveThreadState = useCallback(
    (status: EmailThreadState) => {
      saveReferenceMarkerState({ ...referenceMarkerState, status });
    },
    [referenceMarkerState, saveReferenceMarkerState]
  );
  // Called above any early return (Rules of Hooks), so every id/keyword here
  // is computed against `email` directly rather than the post-return
  // `actionMessageId`/`latestMessage` derived further down — same values in
  // practice, since those are themselves just `email`'s own latest message.
  const referenceActionMessageId = email?.latestMessageId ?? email?.id;
  // Elliot's reading: whether it filed this thread, and its drafted task.
  const aiSuggestion = useEmailAiSuggestion({ accountId, conversationKey });
  const referenceMarker = useEmailReferenceMarker({
    accountId: accountId ?? '',
    state: referenceMarkerState,
    tags,
    appliedTags: email?.tags,
    isUpdatingTags,
    isCreatingTag,
    // Deliberately not `saveClassificationMutation.isPending` — see the prop.
    onToggleTag: onToggleTag
      ? (tag, enabled) => {
          if (!referenceActionMessageId) return;
          aiSuggestion.resolve();
          onToggleTag(referenceActionMessageId, tag, enabled);
        }
      : undefined,
    onCreateTag: onCreateTag ? (name) => onCreateTag(name, referenceActionMessageId) : undefined,
    onChange: (nextState) => {
      aiSuggestion.resolve();
      saveReferenceMarkerState(nextState);
    },
    // A text link, not a bordered button: beside a section heading in a 288px
    // panel the button was the heaviest thing on screen (elli-ui#921).
    renderTrigger: ({ disabled }) => (
      <button
        type="button"
        disabled={disabled}
        className="cursor-pointer text-[13px] font-medium text-link hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50"
      >
        + Add item
      </button>
    ),
  });

  // Blue border on the card while it still shows exactly what Elliot filed; any change drops it.
  const elliotHighlight =
    aiSuggestion.stage !== 'resolved' &&
    elliotFilingUntouched(aiSuggestion.suggestion, referenceMarkerState);

  const clearAttachmentCache = attachmentPreview.clearCache;
  useEffect(() => {
    clearAttachmentCache();
  }, [accountId, clearAttachmentCache, email?.id]);

  // Route "Save to Files" into the project's folder subtree when the email is
  // classified to a project; otherwise the picker falls back to the org root
  // (admin-only). Non-admins without a project classification simply won't get
  // the scoped picker and will see the picker error state.
  const projectReference = email?.classification?.references?.find(
    (reference) => reference.type === 'project' && reference.entityId
  );
  // Resolved only for a thread that actually carries a file. It is a two-hop
  // lookup on this backend and was measured at ~2.2s, and it ran on every
  // project-classified thread the moment it opened — for a destination folder
  // nobody had asked for yet. Most mail has no attachment and now pays nothing.
  const threadCarriesAFile =
    Boolean(email?.attachments?.length) ||
    Boolean(email?.threadMessages?.some((message) => message.attachments?.length));
  const savedRootProjectId = threadCarriesAFile
    ? (projectReference?.entityId ?? undefined)
    : undefined;
  const projectFolderQuery = useProjectFolderQuery(savedRootProjectId);
  const savedRootFolderId = projectFolderQuery.data ?? undefined;
  // Named for the project only once the picker is actually inside its folder;
  // otherwise it is browsing the whole of Files, and "Project Files" over the
  // org's top-level folders said something untrue.
  const savedRootLabel = (savedRootFolderId && projectReference?.label) || 'Files';
  // Every linked project, as chips in the save dialog; the first is the one
  // resolved above, which the dialog opens in (elli-ui#1067).
  const saveToFilesProjects = useMemo(
    () => emailSaveScopes(email?.classification?.references),
    [email?.classification?.references]
  );

  if (isLoading) {
    return <EmailReadingPaneSkeleton />;
  }

  if (isError) {
    return <EmailReadingPaneErrorState onRetry={onRetry} />;
  }

  if (!email) {
    return <EmailReadingPaneEmptyState mailboxAddress={mailboxAddress} />;
  }

  const baseMessages = getThreadMessages(email, mailboxAddress);
  // True only while the stand-in built from the list row is on screen: once the
  // conversation resolves, `threadMessages` carries real bodies.
  const isShowingPreviewStandIn =
    isBodyLoading && !email.threadMessages?.length && !email.body?.length;
  // The stand-in knows its message has files but not what they are, so it
  // holds their place until the conversation brings them. Keyed on the
  // stand-in itself — the list row may carry a body, so the body can be on
  // screen while the files are not.
  const standInMessageId = email.latestMessageId ?? email.id;
  const standInPendingAttachments = pendingStandInAttachmentCount({
    isThreadPending: isBodyLoading && !email.threadMessages?.length,
    hasAttachments: email.hasAttachments,
    attachmentCount: email.attachmentCount,
    loadedAttachmentCount: email.attachments?.length ?? 0,
  });
  const actionMessageId = email.latestMessageId ?? email.id;
  const visiblePendingReplies = pendingReplies
    .filter((reply) => reply.emailId === email.id)
    .filter((reply) => !hasMatchingSyncedReply(baseMessages, mailboxAddress, reply.plainBody))
    .map((reply) => reply.message);
  // Chronological, and stays that way — everything below derives from send
  // order. Only the reading order is flipped, in `displayMessages`.
  const messages = [...baseMessages, ...visiblePendingReplies];
  const latestMessage = latestThreadMessage(messages);
  const displayMessages = orderThreadNewestFirst(messages);
  const threadActivity = groupThreadActivity(
    threadActivityQuery.data ?? [],
    displayMessages.map(threadMessageKey)
  );
  const latestReplyableMessage =
    latestMessage && isReplyableEmailMessage(latestMessage) ? latestMessage : null;
  const meetingMessage = [...messages].reverse().find((message) => message.meetingEvent);
  const replyMessageId = replyTarget?.emailId === email.id ? replyTarget.messageId : null;
  const isUnarchiveAction = archiveActionLabel.toLowerCase() === 'unarchive';
  const totalAttachments = messages.reduce(
    (total, message) =>
      total +
      (message.attachments?.filter((attachment) => !isHiddenInlineEmailAttachment(attachment))
        .length ?? 0),
    0
  );
  // What the head is allowed to say about the conversation's size. While the
  // real messages are still on their way the pane is rendering a single
  // stand-in built from the list row, and counting that said "1 message" for a
  // thread the row already knew held more — a stated fact the pane then
  // contradicted a few hundred milliseconds later (elli-ui#1016).
  const headerCounts = resolveThreadHeaderCounts({
    renderedMessageCount: messages.length,
    renderedAttachmentCount: totalAttachments,
    rowMessageCount: email.threadMessageCount,
    rowAttachmentCount: email.threadAttachmentCount ?? email.attachmentCount,
    isThreadPending: isBodyLoading,
  });
  const sendReply = (messageId: string, draft: EmailReplyDraft) => {
    const mode = replyTarget?.mode ?? 'reply';
    const send = mode === 'forward' ? onForward : onReply;
    if (!send) return;
    const targetMessage = messages.find((message) => message.id === messageId);
    const optimisticId = createOptimisticReplyId();
    const optimisticMessage: EmailThreadMessage = {
      id: optimisticId,
      senderName: mailboxAddress,
      senderEmail: mailboxAddress,
      recipientName:
        mode === 'forward' ? draft.to : (targetMessage?.senderName ?? email.senderName),
      recipientEmail:
        mode === 'forward' ? draft.to : (targetMessage?.senderEmail ?? email.senderEmail),
      sentAt: 'Sending...',
      body: [draft.body],
      deliveryStatus: 'sending',
    };

    setPendingReplies((current) => [
      ...current,
      { emailId: email.id, plainBody: draft.body, message: optimisticMessage },
    ]);
    setReplyTarget(null);
    Promise.resolve(send(messageId, draft))
      .then((sentMessage) => {
        setPendingReplies((current) =>
          markPendingReplySent(current, optimisticId, sentMessage ? sentMessage : null)
        );
      })
      .catch(() => {
        setPendingReplies((current) => markPendingReplyFailed(current, optimisticId));
      });
  };

  const composerMessage = replyMessageId
    ? (messages.find((message) => message.id === replyMessageId) ?? null)
    : null;

  const detailsPanel = accountId ? (
    <MailDetailsPanel
      categoryControl={referenceMarker.categoryControl}
      referenceList={
        referenceMarker.isProjectMode && referenceMarker.references.length > 0 ? (
          <MailLinkedItems
            references={referenceMarker.references}
            onRemove={referenceMarker.removeReference}
          />
        ) : null
      }
      referenceTrigger={referenceMarker.trigger}
      tagsSection={referenceMarker.tagsSection}
      projectTagsSection={referenceMarker.projectTagsSection}
      isOtherSelected={referenceMarker.isOtherSelected}
      actions={<MailThreadActions conversationKey={conversationKey} />}
      // Neither the assignee nor the court is disabled while the save is in
      // flight. The mutation is optimistic — `onMutate` writes both into the
      // cache before the request leaves and `onError` puts the old ones back —
      // so what is on screen is already the answer. Greying them out for the
      // length of a round trip only made the panel feel frozen, and it stopped
      // the reader correcting a misclick until the previous one landed
      // (elli-ui#985).
      assignee={
        <EmailAssigneePicker
          accountId={accountId}
          assignee={referenceMarkerState.assignedTo ?? null}
          onChange={(assignee) => {
            aiSuggestion.resolve();
            saveReferenceMarkerState({ ...referenceMarkerState, assignedTo: assignee });
          }}
        />
      }
      court={
        <EmailThreadStatusMarker
          state={referenceMarkerState.status}
          onChange={(status) => {
            aiSuggestion.resolve();
            saveThreadState(status);
          }}
        />
      }
      addTask={
        (email.providerId ?? email.id) ? (
          <ThreadAddTaskLinks
            draft={aiSuggestion.suggestion?.task ?? null}
            onAdd={(withDraft) => {
              const reading = aiSuggestion.suggestion;
              void openNewThreadTask(
                {
                  accountId,
                  providerId: email.providerId ?? email.id,
                  conversationKey: email.conversationKey ?? null,
                  threadId: email.threadId ?? null,
                  subject: email.subject ?? null,
                  fromEmail: email.senderEmail ?? null,
                },
                referenceMarkerState.assignedTo ?? null,
                withDraft && reading?.task
                  ? taskDraftFormValues(reading.task, reading.court)
                  : undefined
              );
            }}
          />
        ) : null
      }
      addEvent={threadCalendarEvents?.addEvent}
      eventsSection={threadCalendarEvents ? threadCalendarEvents.section : undefined}
      tasksSection={
        threadTasksQuery.isError ? (
          <p className="pb-1 text-[12.5px] text-mail-muted">Couldn’t load this thread’s tasks.</p>
        ) : (
          <MailThreadTasks
            tasks={threadTasksQuery.data?.data ?? []}
            threadKey={email?.conversationKey}
            // Nothing is "updating" from the reader's side any more: the tick
            // is drawn on the click and rolled back only if the server refuses
            // it. Keeping the row disabled through the round trip was the whole
            // of the lag (elli-ui#1125).
            isUpdating={false}
            onToggleComplete={handleToggleThreadTask}
            onEdit={setEditingThreadTask}
          />
        )
      }
      highlightElliot={elliotHighlight}
      collapsed={detailsCollapsed}
      onToggleCollapsed={() => setDetailsCollapsed((collapsed) => !collapsed)}
    />
  ) : null;

  return (
    <section
      // `@container` is what makes the thread's `@min-[…]` rules below measure
      // this pane rather than the window. Without it they never match and the
      // details card is stacked above the messages at every width.
      className="@container relative flex min-h-0 min-w-0 flex-1 flex-col bg-mail-pane"
      aria-label="Email"
    >
      <MailReadingToolbar
        subject={email.subject}
        scrolled={scrolledThreadId === email.id}
        onBack={onBack}
        onPrevious={onPrevious}
        onNext={onNext}
        onUnarchive={isUnarchiveAction && onArchive ? () => onArchive(actionMessageId) : undefined}
        onOpenAgent={onOpenAgent}
        agentTriggerRef={agentTriggerRef}
        shortcuts={
          <EmailReadingPaneShortcuts
            mailboxActionKey={isUnarchiveAction ? 'u' : 'a'}
            onReply={
              latestReplyableMessage && onReply
                ? () =>
                    setReplyTarget({
                      emailId: email.id,
                      messageId: latestReplyableMessage.id,
                      mode: 'reply',
                    })
                : undefined
            }
            onArchive={onArchive ? () => onArchive(actionMessageId) : undefined}
            onDelete={onDelete ? () => onDelete(actionMessageId) : undefined}
            onToggleFlag={onToggleFlag ? () => onToggleFlag(actionMessageId) : undefined}
            onToggleExpandAll={
              messages.length > 1
                ? () => setExpandAll((current) => (current === true ? false : true))
                : undefined
            }
          />
        }
      />

      <div
        ref={scrollContainerRef}
        className="mail-pane-scroll kt-scrollable-y-auto min-h-0 flex-1 pt-[54px]"
        onScroll={(event) =>
          setScrolledThreadId(event.currentTarget.scrollTop > 28 ? email.id : null)
        }
      >
        {/*
          A CONTAINER query, not a viewport one: the pane sits inside the app
          shell next to the nav sidebar and the conversation list, so how much
          room it has is nothing like how wide the window is.

          The details card belongs beside the thread, not above it — that is
          where the design puts it and where an AI suggestion has to be to be
          read alongside the message it is about. The threshold is only there
          for the widths where a second column genuinely does not fit: a phone,
          or the reading pane on its own on a narrow laptop. Everywhere else
          this is two columns, with the panel given at least 288px and never
          more than a third. It shares a grid row with the thread body rather
          than the head, which is what lines its top edge up with the reply
          strip instead of the subject.
        */}
        <article
          className={cn(
            'mx-auto w-full min-w-0 max-w-[1140px] px-5 pb-16 pt-6 sm:px-[30px] @min-[760px]:grid @min-[760px]:max-w-[1520px] @min-[760px]:grid-rows-[auto_1fr] @min-[760px]:gap-x-7',
            // Collapsed, the panel is a rail, so the column shrinks to it and
            // the thread takes the rest. It used to keep its full
            // `minmax(288px,34%)` whether or not anything was in it, which made
            // collapsing pointless at exactly the widths it was meant to help
            // (elli-ui#990).
            detailsCollapsed
              ? '@min-[760px]:grid-cols-[minmax(0,1fr)_auto]'
              : '@min-[760px]:grid-cols-[minmax(0,1fr)_minmax(288px,34%)]'
          )}
        >
          {/* The head spans both columns. A subject is the one thing on this
              screen with no natural width — it is whatever the sender typed —
              and boxing it into the thread column wrapped a long one onto three
              lines while a third of the row sat empty above the details card
              (elli-ui#997). Across the full width it wraps where the window
              runs out, not where the grid does. */}
          <div className="min-w-0 @min-[760px]:col-span-2 @min-[760px]:col-start-1 @min-[760px]:row-start-1">
            <p className="mb-1.5 flex min-w-0 flex-wrap items-center gap-2 text-[12.5px] text-mail-muted">
              <span>
                {headerCounts.messageCount}{' '}
                {headerCounts.messageCount === 1 ? 'message' : 'messages'}
              </span>
              {headerCounts.attachmentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                  {headerCounts.attachmentCount}
                </span>
              )}
              {email.category && <span className="text-mail-mid">{email.category}</span>}
            </p>
            <h1 className="min-w-0 font-serif text-[29px] font-normal leading-[1.22] tracking-[-0.014em] text-mail-ink [overflow-wrap:anywhere]">
              {email.subject}
            </h1>
          </div>

          {detailsPanel && (
            // `mt-5` is the thread column's own offset below the head, which is
            // what puts the panel's top edge level with the reply strip rather
            // than hard up under the subject now that the subject owns the full
            // width above it (elli-ui#997).
            // `self-start` is what makes the `sticky` above it actually do
            // anything (elli-ui#1019). A grid item defaults to `align-self:
            // stretch`, so this column was being drawn the full height of the
            // row — 1650px against a 541px card — and a sticky box that already
            // fills its containing block has nowhere to travel within it. It
            // was inert, and the panel scrolled away with the thread. Shrunk to
            // its content it pins at `top-0`, which is the scrollport's content
            // edge and so already clears the 54px reading toolbar the scroller
            // pads for.
            <div className="mb-5 mt-4 min-w-0 @min-[760px]:sticky @min-[760px]:top-0 @min-[760px]:col-start-2 @min-[760px]:row-start-2 @min-[760px]:mb-0 @min-[760px]:mt-5 @min-[760px]:self-start">
              {detailsPanel}
            </div>
          )}

          <div className="min-w-0 @min-[760px]:col-start-1 @min-[760px]:row-start-2 @min-[760px]:mt-5">
            {composerMessage ? (
              <div className="mb-3">
                <EmailReplyComposer
                  key={`${composerMessage.id}:${replyTarget?.mode ?? 'reply'}`}
                  message={composerMessage}
                  mode={replyTarget?.mode}
                  subject={email.subject}
                  accountId={accountId}
                  mailboxAddress={mailboxAddress}
                  isSending={isSendingReply}
                  onSend={(draft) => sendReply(composerMessage.id, draft)}
                  onCancel={() => setReplyTarget(null)}
                  onOpenAgent={onOpenAgent}
                  onFullPageChange={setIsReplyFullPage}
                />
              </div>
            ) : (
              latestReplyableMessage &&
              onReply && (
                <MailReplyStrip
                  message={latestReplyableMessage}
                  canForward={Boolean(onForward)}
                  onReply={(messageId) =>
                    setReplyTarget({ emailId: email.id, messageId, mode: 'reply' })
                  }
                  onForward={(messageId) =>
                    setReplyTarget({ emailId: email.id, messageId, mode: 'forward' })
                  }
                />
              )
            )}

            {meetingMessage?.meetingEvent && (
              <div className="mb-3">
                <EmailMeetingEventCard
                  key={meetingMessage.meetingEvent.id}
                  event={meetingMessage.meetingEvent}
                  messageId={meetingMessage.id}
                  isResponding={isRespondingToMeeting}
                  isUpdating={isUpdatingMeeting}
                  isCancelling={isCancellingMeeting}
                  onRespond={onRespondToMeeting}
                  onUpdate={onUpdateMeeting}
                  onCancel={onCancelMeeting}
                />
              </div>
            )}

            <div className="space-y-5">
              {showThreadTimeline && accountId && activityThreadKey && (
                <EmailThreadNotes
                  accountId={accountId}
                  conversationKey={activityThreadKey}
                  providerId={email.providerId ?? null}
                  items={threadActivity.threadLevel}
                />
              )}
              {displayMessages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {showThreadTimeline && (
                    <EmailThreadTimelineEntry
                      items={threadActivity.byMessage.get(threadMessageKey(message)) ?? []}
                    />
                  )}
                  <EmailThreadMessageCard
                    message={message}
                    inlineImageBaseUrl={inlineImageBaseUrl}
                    singleMessage={messages.length === 1}
                    isBodyPending={isShowingPreviewStandIn}
                    pendingAttachmentCount={
                      message.id === standInMessageId ? standInPendingAttachments : 0
                    }
                    // By identity, not by position: the newest message is drawn
                    // first now, so "last one rendered" is the oldest one.
                    latest={message.id === latestMessage?.id}
                    accountId={accountId}
                    onComposeTo={onComposeTo}
                    onSearchSender={onSearchSender}
                    onDateMention={
                      threadCalendarEvents?.createAt
                        ? (mention) =>
                            threadCalendarEvents.createAt?.({
                              ...mention,
                              providerId: threadMessageKey(message),
                            })
                        : undefined
                    }
                    // Every reply opens in the one composer above the thread, so
                    // a card never grows a second one of its own.
                    replyOpen={false}
                    isSendingReply={isSendingReply}
                    onReply={(messageId) =>
                      setReplyTarget({ emailId: email.id, messageId, mode: 'reply' })
                    }
                    onForward={
                      onForward
                        ? (messageId) =>
                            setReplyTarget({ emailId: email.id, messageId, mode: 'forward' })
                        : undefined
                    }
                    onSendReply={sendReply}
                    onCancelReply={() => setReplyTarget(null)}
                    onOpenAttachment={
                      accountId
                        ? (attachment) => attachmentPreview.openAttachment(message.id, attachment)
                        : undefined
                    }
                    onLoadAttachment={accountId ? attachmentPreview.loadAttachment : undefined}
                    saveToFilesRootFolderId={savedRootFolderId}
                    saveToFilesRootLabel={savedRootLabel}
                    saveToFilesProjects={saveToFilesProjects}
                    expandAll={expandAll}
                  />
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      <FilePreviewDialog
        {...attachmentPreview.dialogProps}
        saveToFiles={
          attachmentPreview.previewAttachment
            ? {
                rootFolderId: savedRootFolderId,
                rootLabel: savedRootLabel,
                projectScopes: saveToFilesProjects,
                onSaved: () =>
                  toast.success(
                    `Saved ${attachmentPreview.previewAttachment?.attachment.name} to Files.`
                  ),
              }
            : null
        }
      />

      {/* The thread's own task, opened or raised from the panel. The board's
          dialog, not a second one — same form, same validation, same delete. */}
      <TaskFormDialog
        open={Boolean(editingThreadTask || newThreadTask)}
        task={editingThreadTask}
        accountId={newThreadTask?.reference.accountId}
        emailReferences={newThreadTask ? [newThreadTask.reference] : undefined}
        assignee={newThreadTask?.assignee}
        initialValues={newThreadTask?.initialValues}
        isSaving={updateThreadTask.isPending || createThreadTask.isPending}
        onOpenChange={(open) => {
          if (open) return;
          setEditingThreadTask(null);
          setNewThreadTask(null);
        }}
        onSubmit={handleSubmitThreadTask}
        onDelete={handleDeleteThreadTask}
      />

      {/* An event made from this thread, or one it already made (elli-ui#1305). */}
      {threadCalendarEvents?.dialog}

      <FeedbackAskDialog
        open={feedbackAskOpen}
        context={`Additional details changed on “${email?.subject ?? 'a thread'}”`}
        idleContext={`Feedback from the mailbox — “${email?.subject ?? 'a thread'}”`}
        onOpenChange={setFeedbackAskOpen}
        // The bubble is `fixed bottom-4 right-4`, so over a full-page editor
        // it lands on the Send button. The new-message editor has always been
        // told to hide it; a reply gone full page is the same editor in the
        // same layer, and used not to be (elli-ui#1189).
        hideBubble={hideFeedbackBubble || isReplyFullPage}
      />
    </section>
  );
}

function EmailReadingPaneShortcuts({
  mailboxActionKey,
  onReply,
  onArchive,
  onDelete,
  onToggleFlag,
  onToggleExpandAll,
}: {
  mailboxActionKey: 'a' | 'u';
  onReply?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onToggleFlag?: () => void;
  onToggleExpandAll?: () => void;
}) {
  // Every handler is read through a ref at key time rather than captured, so
  // the listener is bound once and never restarts as the thread changes under
  // it — a rebind mid-keypress used to drop the key.
  const handlersRef = useRef({
    mailboxActionKey,
    onReply,
    onArchive,
    onDelete,
    onToggleFlag,
    onToggleExpandAll,
  });

  useLayoutEffect(() => {
    handlersRef.current = {
      mailboxActionKey,
      onReply,
      onArchive,
      onDelete,
      onToggleFlag,
      onToggleExpandAll,
    };
  }, [mailboxActionKey, onArchive, onDelete, onReply, onToggleExpandAll, onToggleFlag]);

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) {
        return;
      }
      const menu = target?.closest<HTMLElement>('[role="menu"]');
      if (
        menu &&
        (menu.dataset.state === 'open' || (!menu.dataset.state && menu.getClientRects().length > 0))
      ) {
        return;
      }

      const handlers = handlersRef.current;
      const key = event.key.toLowerCase();
      const run = (action?: () => void) => {
        if (!action) return;
        event.preventDefault();
        action();
      };

      if (key === 'r') run(handlers.onReply);
      if (key === 'e') run(handlers.onToggleExpandAll);
      if (key === 'f') run(handlers.onToggleFlag);
      if (key === handlers.mailboxActionKey) run(handlers.onArchive);
      if (key === 'd') run(handlers.onDelete);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  return <MailShortcutsMenu />;
}

function getThreadMessages(email: EmailListItem, mailboxAddress: string): EmailThreadMessage[] {
  if (email.threadMessages?.length) {
    return [...email.threadMessages]
      .sort((left, right) => getMessageTimestamp(left) - getMessageTimestamp(right))
      .map((message) => ({
        ...message,
        recipientName: message.recipientName === 'Elli Team' ? '' : message.recipientName,
        recipientEmail: message.recipientEmail || mailboxAddress,
      }));
  }
  const messageId = email.latestMessageId ?? email.id;

  return [
    {
      id: messageId,
      providerId: email.providerId,
      senderName: email.senderName,
      senderEmail: email.senderEmail,
      recipientName: '',
      recipientEmail: mailboxAddress,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      sentAt: email.receivedAt,
      meetingResponse: email.meetingResponse,
      meetingEvent: email.meetingEvent,
      // The preview is a plain-text excerpt of the whole thread, quoted chain
      // included. It stands in only so the card has something to measure; when
      // `isBodyPending` is set the card draws a placeholder instead of
      // rendering it (elli-ui#942).
      body: email.body?.length ? email.body : [email.preview],
      attachments: email.attachments ?? [],
      keywords: email.keywords ?? [],
      tags: email.tags ?? [],
    },
  ];
}

function getMessageTimestamp(message: EmailThreadMessage): number {
  const timestamp = new Date(message.sentAt).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function hasMatchingSyncedReply(
  messages: EmailThreadMessage[],
  mailboxAddress: string,
  plainBody: string
) {
  const normalizedBody = normalizeText(plainBody);
  if (!normalizedBody) return false;

  return messages.some((message) => {
    if (message.senderEmail.toLowerCase() !== mailboxAddress.toLowerCase()) return false;
    return normalizeText(message.body.join('\n')).includes(normalizedBody);
  });
}

function normalizeText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
