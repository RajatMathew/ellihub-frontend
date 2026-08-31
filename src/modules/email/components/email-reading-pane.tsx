import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';

import { Button } from '@/app/components/ui/button';
import type {
  ConnectedEmailFolder,
  ConnectedEmailTag,
  EmailMeetingEvent,
  EmailMeetingResponseAction,
} from '@/modules/email/api';
import { emailApi } from '@/modules/email/api';
import { EmailMeetingEventCard } from '@/modules/email/components/email-meeting-event-card';
import {
  EmailReadingPaneEmptyState,
  EmailReadingPaneErrorState,
  EmailReadingPaneSkeleton,
} from '@/modules/email/components/email-reading-pane-states';
import {
  EmailReferenceMarker,
  EmailThreadStatusMarker,
} from '@/modules/email/components/email-reference-marker';
import {
  type EmailReferenceMarkerState,
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import type { EmailReplyDraft } from '@/modules/email/components/email-reply-composer';
import type {
  EmailAttachment,
  EmailListItem,
  EmailThreadMessage,
} from '@/modules/email/components/email-row-card';
import { EmailThreadMessageCard } from '@/modules/email/components/email-thread-message-card';
import { useSaveEmailThreadClassificationMutation } from '@/modules/email/hooks';
import { isReferencedInlineEmailAttachment } from '@/modules/email/lib/email-attachments';
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
import { ArrowLeft, ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface EmailReadingPaneProps {
  email: EmailListItem | null;
  accountId?: string;
  mailboxAddress: string;
  inlineImageBaseUrl?: string | null;
  isLoading?: boolean;
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
  onPermanentDelete?: (messageId: string) => Promise<void> | void;
  isPermanentlyDeleting?: boolean;
  onMarkUnread?: (messageId: string) => void;
  isUpdatingReadStatus?: boolean;
  isSendingReply?: boolean;
  onReply?: (
    messageId: string,
    draft: EmailReplyDraft
  ) => Promise<EmailThreadMessage | null | void> | EmailThreadMessage | null | void;
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
  isSendingReply = false,
  onReply,
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
  const [replyTarget, setReplyTarget] = useState<{ emailId: string; messageId: string } | null>(
    null
  );
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
  const conversationKey = email?.conversationKey ?? email?.threadId ?? email?.id ?? '';
  const referenceMarkerState: EmailReferenceMarkerState = useMemo(
    () =>
      email?.classification
        ? {
            id: email.classification.id ?? null,
            conversationKey: email.classification.conversationKey,
            threadId: email.classification.threadId ?? email.threadId ?? null,
            status: email.classification.status,
            references: email.classification.references,
          }
        : {
            id: null,
            conversationKey,
            threadId: email?.threadId ?? null,
            status: 'open',
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
  const savedRootProjectId = projectReference?.entityId ?? undefined;
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
      (message.attachments?.filter(
        (attachment) => !isReferencedInlineEmailAttachment(attachment, message.body)
      ).length ?? 0),
    0
  );
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background" aria-label="Email">
      <div className="flex min-h-12 shrink-0 items-center gap-1.5 border-b border-border bg-background px-3">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            size="icon"
            className="size-10 lg:hidden"
            aria-label="Back to email list"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          mode="icon"
          size="icon"
          className="size-10 sm:size-9"
          disabled={!onPrevious}
          aria-label="Previous email"
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          mode="icon"
          size="icon"
          className="size-10 sm:size-9"
          disabled={!onNext}
          aria-label="Next email"
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <EmailReadingPaneShortcuts
            mailboxActionKey={isUnarchiveAction ? 'u' : 'a'}
            mailboxActionLabel={isUnarchiveAction ? 'unarchive' : 'archive'}
            agentActionKey={onOpenAgent ? 'e' : undefined}
            onReply={
              latestReplyableMessage && onReply
                ? () =>
                    setReplyTarget({
                      emailId: email.id,
                      messageId: latestReplyableMessage.id,
                    })
                : undefined
            }
            onArchive={onArchive ? () => onArchive(actionMessageId) : undefined}
            onDelete={onDelete ? () => onDelete(actionMessageId) : undefined}
          />
          {onOpenAgent && (
            <Button
              type="button"
              ref={agentTriggerRef}
              variant="outline"
              mode="icon"
              size="icon"
              className="size-10 bg-background p-1.5 sm:size-9"
              aria-label="Open or close Elliot Agent"
              title="Open or close Elliot Agent (E)"
              onClick={onOpenAgent}
            >
              <img
                src="/favicon/apple-touch-icon.png"
                alt=""
                aria-hidden="true"
                className="size-7 rounded-sm object-contain sm:size-6"
              />
            </Button>
          )}
        </div>
      </div>

      <div className="kt-scrollable-y-auto min-h-0 flex-1 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <header className="mb-5 border-b border-border pb-5">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{email.senderName}</span>
              <span className="truncate">&lt;{email.senderEmail}&gt;</span>
              <span aria-hidden="true">·</span>
              <span>
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
              {totalAttachments > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                  {totalAttachments}
                </span>
              )}
              {email.category && (
                <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  {email.category}
                </span>
              )}
            </div>
            <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="min-w-0 text-2xl font-semibold leading-tight tracking-tight text-foreground">
                {email.subject}
              </h1>
              <EmailThreadStatusMarker
                state={referenceMarkerState.status}
                isSaving={saveClassificationMutation.isPending}
                onChange={saveThreadState}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">to {mailboxAddress}</p>
            {accountId && (
              <EmailReferenceMarker
                accountId={accountId}
                state={referenceMarkerState}
                messageId={actionMessageId}
                tags={tags}
                keywords={latestMessage?.keywords ?? email.keywords}
                isUpdatingTags={isUpdatingTags}
                isCreatingTag={isCreatingTag}
                onToggleTag={
                  onToggleTag
                    ? (tag, enabled) => onToggleTag(actionMessageId, tag, enabled)
                    : undefined
                }
                onCreateTag={onCreateTag ? (name) => onCreateTag(name, actionMessageId) : undefined}
                isSaving={saveClassificationMutation.isPending}
                onChange={saveReferenceMarkerState}
              />
            )}
          </header>

          <div className="space-y-4">
            {meetingMessage?.meetingEvent && (
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
            )}
            {messages.map((message, index) => (
              <EmailThreadMessageCard
                key={message.id}
                message={message}
                inlineImageBaseUrl={inlineImageBaseUrl}
                singleMessage={messages.length === 1}
                latest={index === messages.length - 1}
                replyOpen={replyMessageId === message.id}
                isSendingReply={isSendingReply}
                onReply={(messageId) => setReplyTarget({ emailId: email.id, messageId })}
                onSendReply={(messageId, draft) => {
                  if (!onReply) return;
                  const targetMessage = messages.find((message) => message.id === messageId);
                  const optimisticId = `${OPTIMISTIC_EMAIL_REPLY_PREFIX}${Date.now()}`;
                  const optimisticMessage: EmailThreadMessage = {
                    id: optimisticId,
                    senderName: mailboxAddress,
                    senderEmail: mailboxAddress,
                    recipientName: targetMessage?.senderName ?? email.senderName,
                    recipientEmail: targetMessage?.senderEmail ?? email.senderEmail,
                    sentAt: 'Sending...',
                    body: [draft.body],
                    deliveryStatus: 'sending',
                  };

                  setPendingReplies((current) => [
                    ...current,
                    {
                      emailId: email.id,
                      plainBody: draft.body,
                      message: optimisticMessage,
                    },
                  ]);
                  setReplyTarget(null);
                  Promise.resolve(onReply(messageId, draft))
                    .then((sentMessage) => {
                      setPendingReplies((current) =>
                        markPendingReplySent(
                          current,
                          optimisticId,
                          sentMessage ? sentMessage : null
                        )
                      );
                    })
                    .catch(() => {
                      setPendingReplies((current) => markPendingReplyFailed(current, optimisticId));
                    });
                }}
                onCancelReply={() => setReplyTarget(null)}
                onOpenAttachment={
                  accountId
                    ? (attachment) => setPreviewAttachment({ messageId: message.id, attachment })
                    : undefined
                }
                onLoadAttachment={accountId ? loadEmailAttachment : undefined}
                saveToFilesRootFolderId={savedRootFolderId}
                saveToFilesRootLabel={savedRootLabel}
              />
            ))}
          </div>
        </div>
      </div>

      <FilePreviewDialog
        open={Boolean(accountId && previewAttachment)}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
        file={
          previewAttachment
            ? ({
                id: previewAttachment.attachment.id,
                name: previewAttachment.attachment.name,
                displayName: previewAttachment.attachment.name,
                mimeType: previewAttachment.attachment.mimeType,
                size: previewAttachment.attachment.sizeBytes,
                type: 'FILE',
              } satisfies FilePreviewItem)
            : null
        }
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
  mailboxActionLabel,
  agentActionKey,
  onReply,
  onArchive,
  onDelete,
}: {
  mailboxActionKey: 'a' | 'u';
  mailboxActionLabel: 'archive' | 'unarchive';
  agentActionKey?: 'e';
  onReply?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const onReplyRef = useRef(onReply);
  const onArchiveRef = useRef(onArchive);
  const onDeleteRef = useRef(onDelete);
  const mailboxActionKeyRef = useRef(mailboxActionKey);

  useLayoutEffect(() => {
    onReplyRef.current = onReply;
    onArchiveRef.current = onArchive;
    onDeleteRef.current = onDelete;
    mailboxActionKeyRef.current = mailboxActionKey;
  }, [mailboxActionKey, onArchive, onDelete, onReply]);

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

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

      const key = event.key.toLowerCase();
      if (key === 'r' && onReplyRef.current) {
        event.preventDefault();
        onReplyRef.current();
      }
      if (key === mailboxActionKeyRef.current && onArchiveRef.current) {
        event.preventDefault();
        onArchiveRef.current();
      }
      if (key === 'd' && onDeleteRef.current) {
        event.preventDefault();
        onDeleteRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  return (
    <span
      className="hidden items-center gap-1.5 whitespace-nowrap font-mono text-xs text-muted-foreground lg:flex"
      aria-label="Keyboard shortcuts"
    >
      <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
        ↑↓
      </kbd>
      <span>navigate</span>
      <span aria-hidden="true">·</span>
      <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
        R
      </kbd>
      <span>reply</span>
      <span aria-hidden="true">·</span>
      <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
        {mailboxActionKey.toUpperCase()}
      </kbd>
      <span>{mailboxActionLabel}</span>
      {onDelete ? (
        <>
          <span aria-hidden="true">·</span>
          <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
            D
          </kbd>
          <span>delete</span>
        </>
      ) : null}
      {agentActionKey ? (
        <>
          <span aria-hidden="true">·</span>
          <kbd className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
            {agentActionKey.toUpperCase()}
          </kbd>
          <span>Elliot</span>
        </>
      ) : null}
    </span>
  );
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
      body: email.body?.length ? email.body : [email.preview],
      attachments: email.attachments ?? [],
      keywords: email.keywords ?? [],
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
