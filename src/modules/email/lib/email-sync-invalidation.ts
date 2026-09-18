import type { EmailSyncResult } from '@/modules/email/api';

/** What a finished sync makes stale. */
export type EmailSyncInvalidation = {
  /** The message lists — new or changed mail. */
  messages: boolean;
  /** Folder unread and total counts. */
  folders: boolean;
  /** Provider categories, which a sync can discover. */
  tags: boolean;
  /** The account row, which carries `freshness` and so changes either way. */
  accounts: boolean;
};

/**
 * What to refetch once a sync answers.
 *
 * A sync that moved nothing has nothing to tell anyone. It still answered —
 * that is how the list learns it is no longer catching up — but the messages,
 * the folder counts and the tag list are exactly what they were a moment ago.
 * Refetching all four cost four requests and ~35KB every time a merely stale
 * mailbox was opened, which is most openings of most mailboxes.
 *
 * `use-email-realtime` already draws this line for the socket path — "only when
 * the sync actually landed something", after a quiet mailbox was found issuing
 * a request every few seconds. The HTTP sync never got the same treatment.
 */
export function emailSyncInvalidation(
  result: Pick<EmailSyncResult, 'processed'>
): EmailSyncInvalidation {
  const landed = result.processed > 0;
  return { messages: landed, folders: landed, tags: landed, accounts: true };
}
