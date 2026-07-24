import { useCallback, useState } from 'react';

import type { ConnectedEmailFolder, ConnectedEmailTag } from '@/modules/email/api';
import { emailApi } from '@/modules/email/api';
import { EmailActionToolbar } from '@/modules/email/components/email-action-toolbar';
import {
  EmailReadingPaneEmptyState,
  EmailReadingPaneErrorState,
  EmailReadingPaneSkeleton,
} from '@/modules/email/components/email-reading-pane-states';
import type {
  EmailAttachment,
  EmailListItem,
  EmailThreadMessage,
} from '@/modules/email/components/email-row-card';
import { EmailThreadMessageCard } from '@/modules/email/components/email-thread-message-card';
import { isInlineEmailAttachment } from '@/modules/email/lib/email-attachments';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { Paperclip } from 'lucide-react';

interface EmailReadingPaneProps {
  email: EmailListItem | null;
  accountId?: string;
  mailboxAddress: string;
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
  onCreateTag?: (name: string) => void;
  onArchive?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onPermanentDelete?: (messageId: string) => Promise<void> | void;
  isPermanentlyDeleting?: boolean;
  isSendingReply?: boolean;
  onReply?: (messageId: string, body: string) => Promise<void> | void;
}

type PendingReply = {
  emailId: string;
  plainBody: string;
  message: EmailThreadMessage;
};

export function EmailReadingPane({
  email,
  accountId,
  mailboxAddress,
  isLoading = false,
  isError = false,
  onRetry,
  folders,
  tags,
  isUpdatingTags = false,
  isCreatingTag = false,
  archiveActionLabel,
  onMoveToFolder,
  onToggleTag,
  onCreateTag,
  onArchive,
  onDelete,
  onPermanentDelete,
  isPermanentlyDeleting = false,
  isSendingReply = false,
  onReply,
}: EmailReadingPaneProps) {
  const [replyTarget, setReplyTarget] = useState<{ emailId: string; messageId: string } | null>(
    null
  );
  const [pendingReplies, setPendingReplies] = useState<PendingReply[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<{
    messageId: string;
    attachment: EmailAttachment;
  } | null>(null);
  const loadEmailAttachment = useCallback(
    (file: FilePreviewItem) =>
      emailApi.getAttachment(accountId!, previewAttachment!.messageId, file.id),
    [accountId, previewAttachment]
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
  const actionMessageId = email.latestMessageId ?? email.id;
  const visiblePendingReplies = pendingReplies
    .filter((reply) => reply.emailId === email.id)
    .filter((reply) => !hasMatchingSyncedReply(baseMessages, mailboxAddress, reply.plainBody))
    .map((reply) => reply.message);
  const messages = [...baseMessages, ...visiblePendingReplies];
  const latestMessage = messages[messages.length - 1] ?? null;
  const replyMessageId = replyTarget?.emailId === email.id ? replyTarget.messageId : null;
  const totalAttachments = messages.reduce(
    (total, message) =>
      total +
      (message.attachments?.filter((attachment) => !isInlineEmailAttachment(attachment)).length ??
        0),
    0
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/20" aria-label="Email">
      <div className="flex h-28 shrink-0 items-center border-b border-border bg-background px-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex min-w-0 flex-nowrap items-center gap-3 whitespace-nowrap text-xs text-muted-foreground">
              {email.category && (
                <span className="inline-flex h-6 shrink-0 items-center rounded-sm bg-primary/10 px-2 font-medium leading-none text-primary">
                  {email.category}
                </span>
              )}
              <span className="shrink-0 leading-none">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
              {totalAttachments > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 leading-none">
                  <Paperclip aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                  {totalAttachments}
                </span>
              )}
            </div>
            <h1 className="truncate text-lg font-semibold text-foreground">{email.subject}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {email.senderName} &lt;{email.senderEmail}&gt;
            </p>
          </div>

          <EmailActionToolbar
            folders={folders}
            tags={tags}
            keywords={email.keywords}
            currentFolderId={email.folderId ?? null}
            isUpdatingTags={isUpdatingTags}
            isCreatingTag={isCreatingTag}
            archiveActionLabel={archiveActionLabel}
            onMoveToFolder={
              onMoveToFolder ? (folderId) => onMoveToFolder(actionMessageId, folderId) : undefined
            }
            onToggleTag={
              onToggleTag ? (tag, enabled) => onToggleTag(actionMessageId, tag, enabled) : undefined
            }
            onCreateTag={onCreateTag}
            onArchive={onArchive ? () => onArchive(actionMessageId) : undefined}
            onDelete={onDelete ? () => onDelete(actionMessageId) : undefined}
            onPermanentDelete={
              onPermanentDelete ? () => onPermanentDelete(actionMessageId) : undefined
            }
            isPermanentlyDeleting={isPermanentlyDeleting}
            onReply={
              latestMessage
                ? () => setReplyTarget({ emailId: email.id, messageId: latestMessage.id })
                : undefined
            }
          />
        </div>
      </div>

      <div className="kt-scrollable-y-auto min-h-0 flex-1 px-5 py-5">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.map((message, index) => (
            <EmailThreadMessageCard
              key={message.id}
              message={message}
              latest={index === messages.length - 1}
              replyOpen={replyMessageId === message.id}
              isSendingReply={isSendingReply}
              onReply={(messageId) => setReplyTarget({ emailId: email.id, messageId })}
              onSendReply={(messageId, body) => {
                if (!onReply) return;
                const targetMessage = messages.find((message) => message.id === messageId);
                const optimisticId = `optimistic-reply-${Date.now()}`;
                const optimisticMessage: EmailThreadMessage = {
                  id: optimisticId,
                  senderName: mailboxAddress,
                  senderEmail: mailboxAddress,
                  recipientName: targetMessage?.senderName ?? email.senderName,
                  recipientEmail: targetMessage?.senderEmail ?? email.senderEmail,
                  sentAt: 'Sending...',
                  body: [body],
                  deliveryStatus: 'sending',
                };

                setPendingReplies((current) => [
                  ...current,
                  {
                    emailId: email.id,
                    plainBody: body,
                    message: optimisticMessage,
                  },
                ]);
                setReplyTarget(null);
                Promise.resolve(onReply(messageId, body))
                  .then(() => {
                    setPendingReplies((current) =>
                      current.map((reply) =>
                        reply.message.id === optimisticId
                          ? {
                              ...reply,
                              message: {
                                ...reply.message,
                                sentAt: 'Just now',
                                deliveryStatus: 'sent',
                              },
                            }
                          : reply
                      )
                    );
                  })
                  .catch(() => {
                    setPendingReplies((current) =>
                      current.map((reply) =>
                        reply.message.id === optimisticId
                          ? {
                              ...reply,
                              message: {
                                ...reply.message,
                                sentAt: 'Failed',
                                deliveryStatus: 'failed',
                              },
                            }
                          : reply
                      )
                    );
                  });
              }}
              onCancelReply={() => setReplyTarget(null)}
              onOpenAttachment={
                accountId
                  ? (attachment) => setPreviewAttachment({ messageId: message.id, attachment })
                  : undefined
              }
            />
          ))}
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
                type: 'FILE',
              } satisfies FilePreviewItem)
            : null
        }
        loadFile={loadEmailAttachment}
      />
    </section>
  );
}

function getThreadMessages(email: EmailListItem, mailboxAddress: string): EmailThreadMessage[] {
  if (email.threadMessages?.length) return email.threadMessages;
  const messageId = email.latestMessageId ?? email.id;

  return [
    {
      id: messageId,
      providerId: email.providerId,
      senderName: email.senderName,
      senderEmail: email.senderEmail,
      recipientName: 'Elli Team',
      recipientEmail: mailboxAddress,
      sentAt: email.receivedAt,
      body: email.body?.length ? email.body : [email.preview],
      attachments: email.attachments ?? [],
      keywords: email.keywords ?? [],
    },
  ];
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
