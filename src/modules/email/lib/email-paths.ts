import type { EmailListItem } from '@/modules/email/components/email-row-card';

/**
 * Canonical mail URLs, Outlook-style:
 *   /app/email/accounts/:accountSlug/:folder
 *   /app/email/accounts/:accountSlug/:folder/id/:conversationId
 *
 * `folder` is a well-known key (inbox, sent, …) or a folder cache id for
 * custom folders. The id segment is the provider conversation id — stable when
 * messages move between folders — and both segments are URI-encoded because
 * provider ids are base64-ish (`+ / =`).
 */
export function buildMailPath(
  accountSlug: string,
  folder: string,
  conversationId?: string | null
): string {
  const base = `/app/email/accounts/${encodeURIComponent(accountSlug)}/${encodeURIComponent(folder)}`;
  return conversationId ? `${base}/id/${encodeURIComponent(conversationId)}` : base;
}

/** The identity a mail-list row (a conversation) is addressed by in URLs. */
export function getEmailConversationId(
  email: Pick<EmailListItem, 'conversationKey' | 'threadId' | 'id'>
): string {
  return email.conversationKey ?? email.threadId ?? email.id;
}
