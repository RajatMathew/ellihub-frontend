import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';

export type PendingEmailReply = {
  emailId: string;
  plainBody: string;
  message: EmailThreadMessage;
};

export const OPTIMISTIC_EMAIL_REPLY_PREFIX = 'optimistic-reply-';

export function isReplyableEmailMessage(message: EmailThreadMessage): boolean {
  if (message.id.startsWith(OPTIMISTIC_EMAIL_REPLY_PREFIX)) return false;
  return message.deliveryStatus !== 'sending' && message.deliveryStatus !== 'failed';
}

export function markPendingReplySent(
  replies: PendingEmailReply[],
  optimisticId: string,
  sentMessage?: EmailThreadMessage | null
): PendingEmailReply[] {
  return replies.map((reply) =>
    reply.message.id === optimisticId
      ? {
          ...reply,
          message: sentMessage
            ? { ...sentMessage, deliveryStatus: 'sent' }
            : {
                ...reply.message,
                sentAt: 'Just now',
                deliveryStatus: 'sent',
              },
        }
      : reply
  );
}

export function markPendingReplyFailed(
  replies: PendingEmailReply[],
  optimisticId: string
): PendingEmailReply[] {
  return replies.map((reply) =>
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
  );
}
