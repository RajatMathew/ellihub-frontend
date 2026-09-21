/**
 * Whether to ask why someone just made a change.
 *
 * The ask is worth something only while the reason is still in the person's
 * head, which is why it follows an edit rather than sitting behind a button
 * (elli-ui#1050). That same immediacy is what makes it easy to overdo: an ask
 * after every edit is a dialog between someone and the work they came to do,
 * and the second one is already worse than useless — it teaches people to
 * dismiss it without reading.
 *
 * So: once a session, after a real edit, and never again once it has been
 * answered or waved away. "Session" rather than "ever" because a month of
 * using the panel differently is worth asking about again, and rather than
 * "per day" because the reason is tied to a sitting, not to a date.
 */
export function shouldAskForFeedback(options: {
  /** Has the ask already been shown — or answered — in this session? */
  askedThisSession: boolean;
  /** Edits to the details panel so far in this session, including this one. */
  edits: number;
  /**
   * Edits to let pass before asking. One means "ask on the first edit"; the
   * caller can raise it where a screen is edited in bursts and the first
   * change is rarely the interesting one.
   */
  askAfterEdits?: number;
}): boolean {
  const { askedThisSession, edits, askAfterEdits = 1 } = options;

  if (askedThisSession) return false;
  if (askAfterEdits < 1) return false;

  return edits >= askAfterEdits;
}

const SESSION_KEY = 'elli.feedback-ask.shown';

/**
 * Whether this browser session has already been asked.
 *
 * `sessionStorage`, not state: the panel unmounts whenever the reader opens a
 * different thread, so anything held in React would forget and ask again on
 * the next edit. Every access is guarded — a private window, blocked site
 * data, or a thumbnail capture can all make these throw, and failing to read a
 * flag must not take the mailbox down with it.
 */
export function hasAskedForFeedbackThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    // Unreadable storage means "no idea", and asking once is a better failure
    // than never asking at all.
    return false;
  }
}

export function markFeedbackAskShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Nothing to do: the worst case is being asked again next edit, which the
    // caller's own in-memory guard still prevents for this mount.
  }
}

/** What the API accepts for a feedback title, mirrored from the server schema. */
export const FEEDBACK_TITLE_MAX_LENGTH = 120;

/**
 * The title the ask files its feedback under, cut to fit.
 *
 * It names the change — "Additional details changed on <subject>" — and mail
 * subjects are unbounded, so the obvious version of this is a rejected submit
 * the moment someone gives feedback on a thread with a long subject. Which is
 * exactly what happened the first time it was tried: the server answered
 * "Title must be 120 characters or fewer" and the feedback was lost behind a
 * toast.
 *
 * Cut with an ellipsis rather than refused: a title is a label, and a clipped
 * label still says which thread this was about.
 */
export function clampFeedbackTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= FEEDBACK_TITLE_MAX_LENGTH) return trimmed;

  // The ellipsis is one character, so the cut leaves room for it.
  return `${trimmed.slice(0, FEEDBACK_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}
