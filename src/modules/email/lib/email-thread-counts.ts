/**
 * What the reading pane's head may say about a conversation's size.
 *
 * Opening a row shows the pane straight away, but the conversation itself is a
 * second request. Until it lands the pane has only the list row to draw from,
 * and `getThreadMessages` turns that row into exactly one stand-in message —
 * so the head counted what it had rendered and announced "1 message" for a
 * thread the row itself already knew held three, then contradicted itself a
 * few hundred milliseconds later when the real messages arrived. That
 * self-contradiction is the flash: not a slow load, a stated fact that was
 * wrong (elli-ui#1016).
 *
 * The row carries `threadMessageCount` and `attachmentCount` for the whole
 * conversation, so the true size is known from the first frame. Use it while
 * the thread is still pending, and hand back to what is actually rendered once
 * it is not — after that the rendered list is the truth, optimistic replies
 * included, and it can legitimately be larger than the row's stale count.
 *
 * Pure so it can be tested: getting it backwards means either the flash stays
 * or a sent reply stops being counted.
 */
export type ThreadHeaderCountsInput = {
  /** Messages the pane can render right now (stand-in included). */
  renderedMessageCount: number;
  /** Visible attachments across those messages. */
  renderedAttachmentCount: number;
  /** The conversation's size per the list row, when the row says. */
  rowMessageCount?: number | null;
  /** The conversation's attachment count per the list row, when the row says. */
  rowAttachmentCount?: number | null;
  /** True while the conversation's real messages are still on their way. */
  isThreadPending: boolean;
};

export type ThreadHeaderCounts = {
  messageCount: number;
  attachmentCount: number;
};

export function resolveThreadHeaderCounts({
  renderedMessageCount,
  renderedAttachmentCount,
  rowMessageCount,
  rowAttachmentCount,
  isThreadPending,
}: ThreadHeaderCountsInput): ThreadHeaderCounts {
  return {
    messageCount: pendingCount(renderedMessageCount, rowMessageCount, isThreadPending),
    attachmentCount: pendingCount(renderedAttachmentCount, rowAttachmentCount, isThreadPending),
  };
}

/**
 * The row's number only wins while the thread is pending, and only when it is
 * a real number that is larger than what is on screen. A row that under-counts
 * (an older cached page, a mailbox that does not report the field) must never
 * shrink the head below what the reader can already see.
 */
function pendingCount(
  rendered: number,
  fromRow: number | null | undefined,
  isThreadPending: boolean
): number {
  if (!isThreadPending) return rendered;
  if (typeof fromRow !== 'number' || !Number.isFinite(fromRow)) return rendered;
  return Math.max(rendered, Math.trunc(fromRow));
}
