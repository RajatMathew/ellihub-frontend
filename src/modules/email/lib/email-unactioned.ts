import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { getEmailConversationId } from '@/modules/email/lib/email-paths';

/**
 * Inbox mail that was opened and then left without anything done to it
 * (elli-ui#1378).
 *
 * Every email has to be dealt with. Opening one and moving on is how mail gets
 * lost, so the Inbox warns about each thread the reader opened a while ago and
 * still has not acted on.
 *
 * It is all client-side. The server already records most of what counts as an
 * action — a thread's status, assignee, linked records, flag, tags, pin, and
 * whether it is still in the Inbox at all — so the only thing this keeps is when
 * the reader first opened each thread, plus the replies, forwards and meeting
 * responses the server does not tie back to a thread. Nothing polls: the
 * warning is worked out from the list already on screen.
 */

/** How long an opened thread may sit without an action before it is flagged. */
export const UNACTIONED_EMAIL_DELAY_MS = 5 * 60 * 1000;

/** Opens older than this are forgotten, so the record cannot grow without end. */
export const UNACTIONED_EMAIL_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export interface UnactionedEmailEntry {
  /** When the reader first opened the thread. Later opens never move it. */
  openedAt: number;
  /** Set once the reader replied, forwarded or answered a meeting from it. */
  handledAt?: number;
}

/** First opens, keyed by `unactionedEmailKey`. */
export type UnactionedEmailStore = Record<string, UnactionedEmailEntry>;

export interface UnactionedEmail {
  key: string;
  email: EmailListItem;
  openedAt: number;
}

/** One thread in one mailbox — the same conversation in two mailboxes is two. */
export function unactionedEmailKey(
  accountId: string,
  email: Pick<EmailListItem, 'conversationKey' | 'threadId' | 'id'>
): string {
  return `${accountId}:${getEmailConversationId(email)}`;
}

/** Records the first open. A thread opened before keeps its original time. */
export function recordEmailOpened(
  store: UnactionedEmailStore,
  key: string,
  now: number
): UnactionedEmailStore {
  if (store[key]) return store;
  return { ...store, [key]: { openedAt: now } };
}

/** The reader dealt with the thread in a way the row itself cannot show. */
export function markEmailHandled(
  store: UnactionedEmailStore,
  key: string,
  now: number
): UnactionedEmailStore {
  const entry = store[key];
  if (!entry || entry.handledAt !== undefined) return store;
  return { ...store, [key]: { ...entry, handledAt: now } };
}

/** Drops opens past the retention window. */
export function pruneUnactionedEmails(
  store: UnactionedEmailStore,
  now: number,
  retentionMs = UNACTIONED_EMAIL_RETENTION_MS
): UnactionedEmailStore {
  const kept = Object.entries(store).filter(([, entry]) => now - entry.openedAt < retentionMs);
  return kept.length === Object.keys(store).length ? store : Object.fromEntries(kept);
}

/**
 * Whether the row already shows that someone acted on the thread.
 *
 * Any of these is a decision about the mail: a status other than "unset", an
 * assignee, a linked project or record, a flag, an Elli tag, or a pin.
 * Archiving, moving and deleting need no rule: the row leaves the Inbox and is
 * never looked at. Reading it is not an action, and neither is its read state
 * — opening the thread again, or new mail landing in it, leaves it flagged.
 */
export function isEmailActioned(email: EmailListItem): boolean {
  if (email.flagged) return true;
  if ((email.tags ?? []).length > 0) return true;
  const classification = email.classification;
  if (!classification) return false;
  return (
    classification.status !== 'unset' ||
    Boolean(classification.assignedTo) ||
    classification.references.length > 0 ||
    Boolean(classification.pinnedAt)
  );
}

/**
 * The Inbox threads to warn about, oldest open first.
 *
 * Opening one again — from the warning itself, or from the list — does not
 * clear it. Only acting on it does.
 */
export function selectUnactionedEmails({
  accountId,
  emails,
  store,
  now,
  delayMs = UNACTIONED_EMAIL_DELAY_MS,
}: {
  accountId: string;
  emails: readonly EmailListItem[];
  store: UnactionedEmailStore;
  now: number;
  delayMs?: number;
}): UnactionedEmail[] {
  const seen = new Set<string>();
  const result: UnactionedEmail[] = [];
  for (const email of emails) {
    const key = unactionedEmailKey(accountId, email);
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = store[key];
    if (!entry || entry.handledAt !== undefined) continue;
    if (now - entry.openedAt < delayMs) continue;
    if (isEmailActioned(email)) continue;
    result.push({ key, email, openedAt: entry.openedAt });
  }
  return result.sort((a, b) => a.openedAt - b.openedAt);
}

/**
 * When the next thread will cross the delay, so the page can re-check exactly
 * then instead of on an interval. Null when nothing is waiting.
 */
export function nextUnactionedDeadline({
  accountId,
  emails,
  store,
  now,
  delayMs = UNACTIONED_EMAIL_DELAY_MS,
}: {
  accountId: string;
  emails: readonly EmailListItem[];
  store: UnactionedEmailStore;
  now: number;
  delayMs?: number;
}): number | null {
  let next: number | null = null;
  for (const email of emails) {
    const entry = store[unactionedEmailKey(accountId, email)];
    if (!entry || entry.handledAt !== undefined || isEmailActioned(email)) continue;
    const due = entry.openedAt + delayMs;
    if (due > now && (next === null || due < next)) next = due;
  }
  return next;
}

/** "just now", "6 min ago", "2 hr ago", "3 days ago" — for the warning's rows. */
export function formatOpenedAgo(openedAt: number, now: number): string {
  const minutes = Math.floor((now - openedAt) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
