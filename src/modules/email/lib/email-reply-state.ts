import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';

export type PendingEmailReply = {
  emailId: string;
  plainBody: string;
  message: EmailThreadMessage;
};

export const OPTIMISTIC_EMAIL_REPLY_PREFIX = 'optimistic-reply-';

/**
 * The id an optimistic reply carries until the real one comes back.
 *
 * A module function rather than a `Date.now()` inline in the pane: the clock is
 * impure, and the React Compiler reads a bare call to it inside a component
 * body as render-time work even when it only ever runs from a submit handler
 * (`react-hooks/purity`). Behind a call it is unambiguously the caller's.
 */
export function createOptimisticReplyId(): string {
  return `${OPTIMISTIC_EMAIL_REPLY_PREFIX}${Date.now()}`;
}

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
