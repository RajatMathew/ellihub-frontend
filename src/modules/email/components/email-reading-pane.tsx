import { useState } from 'react';

import type { ConnectedEmailFolder, ConnectedEmailTag } from '@/modules/email/api';
import { EmailActionToolbar } from '@/modules/email/components/email-action-toolbar';
import {
  EmailReadingPaneEmptyState,
  EmailReadingPaneErrorState,
  EmailReadingPaneSkeleton,
} from '@/modules/email/components/email-reading-pane-states';
import type { EmailListItem, EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { EmailThreadMessageCard } from '@/modules/email/components/email-thread-message-card';
import { Paperclip } from 'lucide-react';

interface EmailReadingPaneProps {
  email: EmailListItem | null;
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
}

export function EmailReadingPane({
  email,
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
}: EmailReadingPaneProps) {
  const [replyTarget, setReplyTarget] = useState<{ emailId: string; messageId: string } | null>(
    null
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

  const messages = getThreadMessages(email, mailboxAddress);
  const replyMessageId = replyTarget?.emailId === email.id ? replyTarget.messageId : null;
  const totalAttachments = messages.reduce(
    (total, message) => total + (message.attachments?.length ?? 0),
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
              onMoveToFolder ? (folderId) => onMoveToFolder(email.id, folderId) : undefined
            }
            onToggleTag={
              onToggleTag ? (tag, enabled) => onToggleTag(email.id, tag, enabled) : undefined
            }
            onCreateTag={onCreateTag}
            onArchive={onArchive ? () => onArchive(email.id) : undefined}
            onDelete={onDelete ? () => onDelete(email.id) : undefined}
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
              onReply={(messageId) => setReplyTarget({ emailId: email.id, messageId })}
              onCancelReply={() => setReplyTarget(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function getThreadMessages(email: EmailListItem, mailboxAddress: string): EmailThreadMessage[] {
  if (email.threadMessages?.length) return email.threadMessages;

  return [
    {
      id: `${email.id}-message`,
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
