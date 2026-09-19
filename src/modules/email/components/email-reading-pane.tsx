import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';

import type {
  ConnectedEmailFolder,
  ConnectedEmailTag,
  EmailMeetingEvent,
  EmailMeetingResponseAction,
} from '@/modules/email/api';
import { emailApi } from '@/modules/email/api';
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
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import {
  EmailReplyComposer,
  type EmailReplyDraft,
} from '@/modules/email/components/email-reply-composer';
import type {
  EmailAttachment,
  EmailListItem,
  EmailThreadMessage,
} from '@/modules/email/components/email-row-card';
import { EmailThreadMessageCard } from '@/modules/email/components/email-thread-message-card';
import { MailAddTaskPopover } from '@/modules/email/components/mail-add-task-popover';
import { MailDetailsPanel } from '@/modules/email/components/mail-details-panel';
import { MailLinkedItems } from '@/modules/email/components/mail-linked-items';
import { MailReadingToolbar } from '@/modules/email/components/mail-reading-toolbar';
import { MailReplyStrip } from '@/modules/email/components/mail-reply-strip';
import { MailShortcutsMenu } from '@/modules/email/components/mail-shortcuts-menu';
import { MailThreadActions } from '@/modules/email/components/mail-thread-actions';
import { useSaveEmailThreadClassificationMutation } from '@/modules/email/hooks';
import { useEmailAiSuggestion } from '@/modules/email/hooks/use-email-ai-suggestion';
import { isHiddenInlineEmailAttachment } from '@/modules/email/lib/email-attachments';
import {
  isReplyableEmailMessage,
  markPendingReplyFailed,
  markPendingReplySent,
  OPTIMISTIC_EMAIL_REPLY_PREFIX,
  type PendingEmailReply,
} from '@/modules/email/lib/email-reply-state';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { useProjectFolderQuery } from '@/modules/project/hooks';
import { Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface EmailReadingPaneProps {
  email: EmailListItem | null;
  accountId?: string;
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

const MAX_CACHED_ATTACHMENT_PREVIEWS = 6;

export function EmailReadingPane({
  email,
  accountId,
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
  const [replyTarget, setReplyTarget] = useState<{
    emailId: string;
    messageId: string;
    mode: 'reply' | 'forward';
  } | null>(null);
  const [pendingReplies, setPendingReplies] = useState<PendingEmailReply[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<{
    messageId: string;
    attachment: EmailAttachment;
  } | null>(null);
  const attachmentBlobCacheRef = useRef(new Map<string, Promise<Blob>>());
  const [previewProgress, setPreviewProgress] = useState<{
    loaded: number;
    total: number | null;
  } | null>(null);
  const saveClassificationMutation = useSaveEmailThreadClassificationMutation();
  // The details card starts open; collapsing it is a per-reader preference for
  // the session, not something worth persisting.
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  // Which conversation has been scrolled past its subject, rather than a bare
  // boolean: switching conversations then clears it by itself, with no effect
  // resetting state the render could have derived.
  const [scrolledThreadId, setScrolledThreadId] = useState<string | null>(null);
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
  const loadEmailAttachment = useCallback(
    (
      messageId: string,
      attachmentId: string,
      onProgress?: (progress: { loaded: number; total: number | null }) => void
    ) => {
      if (!accountId) return Promise.reject(new Error('Email account is unavailable'));

      const cacheKey = `${accountId}:${messageId}:${attachmentId}`;
      const cached = attachmentBlobCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const request = emailApi.getAttachment(accountId, messageId, attachmentId, onProgress);
      attachmentBlobCacheRef.current.set(cacheKey, request);

      if (attachmentBlobCacheRef.current.size > MAX_CACHED_ATTACHMENT_PREVIEWS) {
        const oldestKey = attachmentBlobCacheRef.current.keys().next().value;
        if (oldestKey) attachmentBlobCacheRef.current.delete(oldestKey);
      }

      void request.catch(() => {
        if (attachmentBlobCacheRef.current.get(cacheKey) === request) {
          attachmentBlobCacheRef.current.delete(cacheKey);
        }
      });
      return request;
    },
    [accountId]
  );
  const loadPreviewAttachment = useCallback(
    (file: FilePreviewItem) => {
      if (!previewAttachment) return Promise.reject(new Error('No attachment selected'));
      setPreviewProgress({ loaded: 0, total: file.size && file.size > 0 ? file.size : null });
      const request = loadEmailAttachment(previewAttachment.messageId, file.id, (progress) =>
        setPreviewProgress(progress)
      );
      request.then(
        () => setPreviewProgress(null),
        () => setPreviewProgress(null)
      );
      return request;
    },
    [loadEmailAttachment, previewAttachment]
  );
  /**
   * Built once per attachment, not once per render. `loadPreviewAttachment`
   * reports download progress into state, so this component re-renders
   * throughout the download — and an inline object here would hand the preview
   * dialog a different file every time (elli-ui#975).
   */
  const previewFile = useMemo<FilePreviewItem | null>(
    () =>
      previewAttachment
        ? {
            id: previewAttachment.attachment.id,
            name: previewAttachment.attachment.name,
            displayName: previewAttachment.attachment.name,
            mimeType: previewAttachment.attachment.mimeType,
            size: previewAttachment.attachment.sizeBytes,
            type: 'FILE',
          }
        : null,
    [previewAttachment]
  );
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
            status: 'open',
            assignedTo: null,
            references: [],
          },
    [conversationKey, email]
  );
  const saveReferenceMarkerState = useCallback(
    (nextState: EmailReferenceMarkerState) => {
      if (!accountId || !conversationKey) return;
      saveClassificationMutation.mutate({
        accountId,
        conversationKey,
        threadId: nextState.threadId ?? email?.threadId ?? null,
        status: nextState.status,
        assignedToId: nextState.assignedTo?.id ?? null,
        references: nextState.references,
      });
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
  const referenceMarker = useEmailReferenceMarker({
    accountId: accountId ?? '',
    state: referenceMarkerState,
    tags,
    appliedTags: email?.tags,
    isUpdatingTags,
    isCreatingTag,
    isSaving: saveClassificationMutation.isPending,
    onToggleTag: onToggleTag
      ? (tag, enabled) =>
          referenceActionMessageId && onToggleTag(referenceActionMessageId, tag, enabled)
      : undefined,
    onCreateTag: onCreateTag ? (name) => onCreateTag(name, referenceActionMessageId) : undefined,
    onChange: saveReferenceMarkerState,
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

  // Only a thread nobody has filed yet gets a guess — see the hook.
  const aiSuggestion = useEmailAiSuggestion({
    accountId,
    conversationKey,
    eligible:
      !referenceMarkerState.assignedTo &&
      referenceMarkerState.references.length === 0 &&
      referenceMarkerState.status === 'open',
  });

  useEffect(() => {
    attachmentBlobCacheRef.current.clear();
  }, [accountId, email?.id]);

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
  const savedRootLabel = projectReference?.label ?? 'Project Files';

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
  const actionMessageId = email.latestMessageId ?? email.id;
  const visiblePendingReplies = pendingReplies
    .filter((reply) => reply.emailId === email.id)
    .filter((reply) => !hasMatchingSyncedReply(baseMessages, mailboxAddress, reply.plainBody))
    .map((reply) => reply.message);
  const messages = [...baseMessages, ...visiblePendingReplies];
  const latestMessage = messages[messages.length - 1] ?? null;
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
  const sendReply = (messageId: string, draft: EmailReplyDraft) => {
    const mode = replyTarget?.mode ?? 'reply';
    const send = mode === 'forward' ? onForward : onReply;
    if (!send) return;
    const targetMessage = messages.find((message) => message.id === messageId);
    const optimisticId = `${OPTIMISTIC_EMAIL_REPLY_PREFIX}${Date.now()}`;
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
            isSaving={saveClassificationMutation.isPending}
            onRemove={referenceMarker.removeReference}
          />
        ) : null
      }
      referenceTrigger={referenceMarker.trigger}
      tagsSection={referenceMarker.tagsSection}
      isOtherSelected={referenceMarker.isOtherSelected}
      actions={<MailThreadActions conversationKey={conversationKey} />}
      assignee={
        <EmailAssigneePicker
          accountId={accountId}
          assignee={referenceMarkerState.assignedTo ?? null}
          disabled={saveClassificationMutation.isPending}
          onChange={(assignee) => {
            aiSuggestion.resolve();
            saveReferenceMarkerState({ ...referenceMarkerState, assignedTo: assignee });
          }}
        />
      }
      court={
        <EmailThreadStatusMarker
          state={referenceMarkerState.status}
          isSaving={saveClassificationMutation.isPending}
          onChange={(status) => {
            aiSuggestion.resolve();
            saveThreadState(status);
          }}
        />
      }
      addTask={
        (email.providerId ?? email.id) ? (
          <MailAddTaskPopover
            email={{
              accountId,
              providerId: email.providerId ?? email.id,
              conversationKey: email.conversationKey,
              threadId: email.threadId,
              subject: email.subject,
              fromEmail: email.senderEmail,
            }}
          />
        ) : null
      }
      ai={aiSuggestion}
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
        <article className="mx-auto w-full min-w-0 max-w-[1140px] px-5 pb-16 pt-6 sm:px-[30px] @min-[760px]:grid @min-[760px]:max-w-[1520px] @min-[760px]:grid-cols-[minmax(0,1fr)_minmax(288px,34%)] @min-[760px]:grid-rows-[auto_1fr] @min-[760px]:gap-x-7">
          <div className="min-w-0 @min-[760px]:col-start-1 @min-[760px]:row-start-1">
            <p className="mb-1.5 flex min-w-0 flex-wrap items-center gap-2 text-[12.5px] text-mail-muted">
              <span>
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
              {totalAttachments > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                  {totalAttachments}
                </span>
              )}
              {email.category && <span className="text-mail-mid">{email.category}</span>}
            </p>
            <h1 className="min-w-0 font-serif text-[29px] font-normal leading-[1.22] tracking-[-0.014em] text-mail-ink [overflow-wrap:anywhere]">
              {email.subject}
            </h1>
          </div>

          {detailsPanel && (
            <div className="mb-5 mt-4 min-w-0 @min-[760px]:sticky @min-[760px]:top-0 @min-[760px]:col-start-2 @min-[760px]:row-start-2 @min-[760px]:mb-0 @min-[760px]:mt-0">
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
                  isSending={isSendingReply}
                  onSend={(draft) => sendReply(composerMessage.id, draft)}
                  onCancel={() => setReplyTarget(null)}
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

            <div className="space-y-3">
              {messages.map((message, index) => (
                <EmailThreadMessageCard
                  key={message.id}
                  message={message}
                  inlineImageBaseUrl={inlineImageBaseUrl}
                  singleMessage={messages.length === 1}
                  isBodyPending={isShowingPreviewStandIn}
                  latest={index === messages.length - 1}
                  accountId={accountId}
                  onComposeTo={onComposeTo}
                  onSearchSender={onSearchSender}
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
                      ? (attachment) => setPreviewAttachment({ messageId: message.id, attachment })
                      : undefined
                  }
                  onLoadAttachment={accountId ? loadEmailAttachment : undefined}
                  saveToFilesRootFolderId={savedRootFolderId}
                  saveToFilesRootLabel={savedRootLabel}
                  expandAll={expandAll}
                />
              ))}
            </div>
          </div>
        </article>
      </div>

      <FilePreviewDialog
        open={Boolean(accountId && previewAttachment)}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
        file={previewFile}
        loadFile={loadPreviewAttachment}
        loadProgress={previewProgress}
        saveToFiles={
          previewAttachment
            ? {
                rootFolderId: savedRootFolderId,
                rootLabel: savedRootLabel,
                onSaved: () =>
                  toast.success(`Saved ${previewAttachment.attachment.name} to Files.`),
              }
            : null
        }
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
