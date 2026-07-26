import { describe, expect, test } from 'bun:test';

import type { EmailThreadMessage } from '../src/modules/email/components/email-row-card';
import {
  isReplyableEmailMessage,
  markPendingReplyFailed,
  markPendingReplySent,
  type PendingEmailReply,
} from '../src/modules/email/lib/email-reply-state';

function createMessage(id: string): EmailThreadMessage {
  return {
    id,
    senderName: 'Sender',
    senderEmail: 'sender@example.com',
    recipientName: 'Recipient',
    recipientEmail: 'recipient@example.com',
    sentAt: 'Sending...',
    body: ['Reply body'],
  };
}

function createPendingReply(): PendingEmailReply {
  return {
    emailId: 'email-1',
    plainBody: 'Reply body',
    message: {
      ...createMessage('optimistic-reply-1'),
      deliveryStatus: 'sending',
    },
  };
}

describe('optimistic email reply state', () => {
  test('replaces a successful optimistic reply with the real cache id', () => {
    const sentMessage = {
      ...createMessage('cached-reply-id'),
      providerId: 'provider-reply-id',
      sentAt: '2026-07-25T10:30:00.000Z',
    };
    const [reply] = markPendingReplySent([createPendingReply()], 'optimistic-reply-1', sentMessage);

    expect(reply?.message).toMatchObject({
      id: 'cached-reply-id',
      providerId: 'provider-reply-id',
      deliveryStatus: 'sent',
    });
    expect(reply && isReplyableEmailMessage(reply.message)).toBe(true);
  });

  test('does not allow replies to unresolved or failed optimistic messages', () => {
    const pending = createPendingReply();
    const unresolved = markPendingReplySent([pending], 'optimistic-reply-1', null)[0];
    const failed = markPendingReplyFailed([pending], 'optimistic-reply-1')[0];

    expect(unresolved && isReplyableEmailMessage(unresolved.message)).toBe(false);
    expect(failed && isReplyableEmailMessage(failed.message)).toBe(false);
  });
});
