import {
  EMAIL_ADDRESS_PATTERN,
  formatEmailAddress,
  type ParsedEmailAddress,
} from '@/modules/email/lib/email-addresses';

type ReplyRecipients = {
  to?: ParsedEmailAddress[];
  cc?: ParsedEmailAddress[];
  bcc?: ParsedEmailAddress[];
};

/** Recipients as the To / Cc boxes show them. */
export function formatRecipients(recipients: ParsedEmailAddress[] | undefined): string {
  return (recipients ?? []).map(formatEmailAddress).join(', ');
}

/**
 * Why the reply cannot be sent yet, or null. An empty To is allowed — the
 * reply then goes back to the sender — but an address the server would reject
 * blocks the card here instead of failing after the undo window.
 */
export function replyActionBlocker(reply: ReplyRecipients): string | null {
  for (const [label, list] of [
    ['To', reply.to],
    ['Cc', reply.cc],
    ['Bcc', reply.bcc],
  ] as const) {
    const bad = (list ?? []).find((recipient) => !EMAIL_ADDRESS_PATTERN.test(recipient.address));
    if (bad) return `${label} has an address that isn't valid: ${bad.address}`;
  }
  return null;
}

const MAIL_ACTIONS = new Set([
  'reply',
  'archive',
  'move',
  'tag',
  'mark_read',
  'delete',
  'set_status',
]);

/**
 * Whether a streamed email proposal has its action type yet. Until it does, the
 * card has no title or buttons to draw and shows "Preparing" instead.
 */
export function isMailActionReady<T extends { action?: string }>(
  action: T | undefined
): action is T & { action: string } {
  return !!action?.action && MAIL_ACTIONS.has(action.action);
}
