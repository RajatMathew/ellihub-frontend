export type EmailAiSuggestionStage = 'idle' | 'pending' | 'resolved';

/**
 * Whether the AI banner is asking for a decision on this thread.
 *
 * Deliberately has no "loading" state. The details card carries the thread's
 * real assignee, court and links, all of which are known the moment it opens —
 * so nothing on screen may wait for a guess about them. An earlier version
 * replaced the whole card with a shimmer until the suggestion landed, which
 * put a visible stall on every mail the reader opened (elli-ui#921). A request
 * in flight is therefore indistinguishable from no suggestion at all until it
 * arrives, and the banner animates in on top when it does.
 */
export function deriveEmailAiSuggestionStage({
  enabled,
  isResolved,
  hasSuggestion,
}: {
  /** False once the thread carries an assignee, a classification or a reference. */
  enabled: boolean;
  /** The reader accepted or dismissed it, or edited the panel. */
  isResolved: boolean;
  hasSuggestion: boolean;
}): EmailAiSuggestionStage {
  if (!enabled) return 'idle';
  if (isResolved) return 'resolved';
  return hasSuggestion ? 'pending' : 'idle';
}
