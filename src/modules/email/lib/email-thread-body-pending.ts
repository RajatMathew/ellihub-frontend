/**
 * Whether the reading pane is showing a stand-in instead of a real body.
 *
 * Clicking a row opens the pane immediately — the list row is already cached,
 * so there is something to draw. What the row does not carry is the message
 * itself: only `preview`, a flattened plain-text excerpt of the whole thread.
 * `getThreadMessages` falls back to that so the card has something, and for the
 * moment before the conversation resolves the reader sees it rendered as the
 * body — a wall of unformatted text carrying the quoted chain's
 * `-----Original Message-----` rules, replaced a beat later by the real HTML
 * (elli-ui#942).
 *
 * Kept out of the page so the condition can be tested: it is easy to get
 * backwards, and backwards means either the flash stays or every message is
 * permanently a skeleton.
 */
export type ThreadBodyPendingInput = {
  /** A row is selected, so the pane is rendering something. */
  hasSelection: boolean;
  /** The conversation query has returned at least one message. */
  hasConversation: boolean;
  /** The single-message detail query has returned. */
  hasMessageDetail: boolean;
  isConversationPending: boolean;
  isMessageDetailPending: boolean;
};

export function isThreadBodyPending({
  hasSelection,
  hasConversation,
  hasMessageDetail,
  isConversationPending,
  isMessageDetailPending,
}: ThreadBodyPendingInput): boolean {
  // Nothing selected: the pane is showing its empty state, not a body.
  if (!hasSelection) return false;
  // Either query having answered is enough — whichever it was carries a real
  // body, and the stand-in is gone.
  if (hasConversation || hasMessageDetail) return false;
  // Neither has answered. Pending means one is still coming; if both have
  // settled without data there is nothing better arriving, so show what there
  // is rather than a skeleton that never resolves.
  return isConversationPending || isMessageDetailPending;
}
