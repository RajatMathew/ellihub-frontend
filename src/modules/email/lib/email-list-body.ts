/** What the reading pane needs from a list row to render without asking for more. */
export type MailListRowContent = {
  threadMessageCount?: number;
  hasAttachments?: boolean;
  attachmentCount?: number;
  body?: string[];
};

/**
 * Whether this list row already is the whole mail.
 *
 * `elli-core` sends a body with the rows a page can afford, and most mail is a
 * single message — 68% of the first fifty conversations in the procurement
 * inbox. When the row carries its body and the thread is that one message, the
 * conversation endpoint would answer with exactly what is on screen already,
 * so opening it costs nothing.
 *
 * Three conditions, and the third is the one that is easy to forget: the row
 * carries an `attachmentCount` but not the attachments themselves, so a mail
 * with a file on it still needs the conversation to draw its chips. The count
 * can lag the flag on a shared-mailbox row, so the flag counts too.
 */
export function listRowIsWholeThread(row: MailListRowContent | null | undefined): boolean {
  if (!row) return false;
  if ((row.threadMessageCount ?? 0) > 1) return false;
  if ((row.attachmentCount ?? 0) > 0 || row.hasAttachments) return false;
  return Boolean(row.body?.some((part) => part.trim().length > 0));
}
