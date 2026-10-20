/**
 * Rows on their way out of the list (elli-ui#651). An archive removes its row
 * from the cache the moment it starts, so a row that should fade has to be
 * marked first, fade, and only then be archived. These are the marks.
 *
 * Module scope rather than React state: the agent panel marks the rows and the
 * list paints them, and the two share no parent that could carry it.
 */

/** How long a row takes to fade. The archive waits this long before it runs. */
export const EMAIL_ROW_LEAVE_MS = 220;

const leaving = new Map<symbol, readonly string[]>();
/** A new set after every change, so React can tell it changed. */
let leavingIds: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function changed() {
  leavingIds = new Set([...leaving.values()].flat());
  for (const listener of listeners) listener();
}

/**
 * Starts the given messages fading. Returns the release, which brings them
 * back: call it once the archive has taken the rows out of the cache, or
 * failed and put them back.
 */
export function markEmailRowsLeaving(messageIds: readonly string[]): () => void {
  const key = Symbol('leaving-rows');
  leaving.set(key, messageIds);
  changed();
  return () => {
    if (leaving.delete(key)) changed();
  };
}

export function getLeavingEmailRows(): ReadonlySet<string> {
  return leavingIds;
}

export function subscribeLeavingEmailRows(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A row is one conversation, named by one of its messages: its own id, or the
 * latest message's when the list groups by thread.
 */
export function isEmailRowLeaving(
  row: { id: string; latestMessageId?: string },
  leavingRows: ReadonlySet<string>
): boolean {
  if (leavingRows.size === 0) return false;
  return leavingRows.has(row.id) || (!!row.latestMessageId && leavingRows.has(row.latestMessageId));
}

/** Resolves once a row has had time to fade, or at once when motion is reduced. */
export function waitForEmailRowLeave(reducedMotion: boolean): Promise<void> {
  if (reducedMotion) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, EMAIL_ROW_LEAVE_MS));
}

/**
 * Whether archiving these messages takes the open conversation away. The
 * reading pane then closes, as it does for the mailbox's own archive, rather
 * than following the mail into Archive and undoing the fade.
 */
export function archiveTakesOpenEmail(
  open: { id: string; latestMessageId?: string; threadMessages?: { id: string }[] } | null,
  messageIds: readonly string[]
): boolean {
  if (!open) return false;
  const ids = new Set(messageIds);
  return (
    ids.has(open.id) ||
    (!!open.latestMessageId && ids.has(open.latestMessageId)) ||
    (open.threadMessages ?? []).some((message) => ids.has(message.id))
  );
}
