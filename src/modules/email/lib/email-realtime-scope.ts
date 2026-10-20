/**
 * Who is allowed to hear about a realtime `email.synced` event.
 *
 * The API fans realtime events out per organization, and every user sits in the
 * same default org — so a browser can be handed an event for a mailbox that
 * belongs to a *different user* (elli-ui#918: a mail landing in an admin's
 * personal Outlook raised a toast in a PM's session). The server-side fan-out
 * is being scoped separately; this is the client half of the same fix, and it
 * holds even if the server regresses again.
 *
 * Two separate questions, deliberately kept apart:
 *
 * - **May the event touch the cache?** Only for a mailbox this session is
 *   entitled to — i.e. one the accounts query actually returned for this user.
 *   Suppressing the toast alone is not enough: the event carries a full
 *   serialized message row that gets spliced into the inbox list, so another
 *   user's mail could still appear on screen.
 * - **May the event raise a notification?** By default, yes for any of the
 *   signed-in user's own connected mailboxes — being told about mail in your
 *   second personal account is the feature working, not the bug. Set the scope
 *   to `active-account` for the stricter "only the mailbox I am looking at"
 *   behaviour.
 */

/** Which of the signed-in user's mailboxes may raise a new-mail notification. */
export type EmailNotificationScope =
  /** Any mailbox connected to this user's account (default). */
  | 'connected-accounts'
  /** Only the mailbox currently open on screen. */
  | 'active-account';

export const DEFAULT_EMAIL_NOTIFICATION_SCOPE: EmailNotificationScope = 'connected-accounts';

export type EmailRealtimeScopeInput = {
  /** `accountId` carried by the event. */
  eventAccountId: string;
  /**
   * Mailbox ids the accounts query returned for this session. Read at event
   * time (never captured in a closure) so a sign-out or a refreshed account
   * list cannot leave a handler answering for a previous user.
   */
  knownAccountIds: readonly string[];
  /** The mailbox currently open in the mailbox page, if any. */
  activeAccountId?: string | null;
  scope?: EmailNotificationScope;
};

export type EmailRealtimeScopeReason =
  /** A mailbox this session owns — accept it. */
  | 'entitled'
  /** This session's mailbox, but not the open one, and the scope is strict. */
  | 'inactive-account'
  /** Not one of this session's mailboxes — the server mis-scoped delivery. */
  | 'unknown-account'
  /** The accounts list is not loaded, so entitlement cannot be confirmed. */
  | 'unverifiable-account';

export type EmailRealtimeScopeDecision = {
  /** May the event write to the query cache (splice a row, invalidate)? */
  allowCacheWrite: boolean;
  /** May the event raise a new-mail notification? */
  allowNotification: boolean;
  reason: EmailRealtimeScopeReason;
  /**
   * The event should never have reached this client. Worth a `console.warn` so
   * a mis-scoped server stays diagnosable instead of being silently papered
   * over — never a user-facing toast.
   */
  isScopeViolation: boolean;
};

const DROP = {
  allowCacheWrite: false,
  allowNotification: false,
} as const;

/**
 * Decide what a realtime `email.synced` event is allowed to do in this session.
 * Pure — no cache, no network; dropping an event costs nothing.
 */
export function decideEmailRealtimeScope(
  input: EmailRealtimeScopeInput
): EmailRealtimeScopeDecision {
  const { eventAccountId, knownAccountIds, activeAccountId = null } = input;
  const scope = input.scope ?? DEFAULT_EMAIL_NOTIFICATION_SCOPE;

  if (!eventAccountId) {
    return { ...DROP, reason: 'unknown-account', isScopeViolation: false };
  }

  // Accounts not loaded (first paint, or the entry was garbage collected). We
  // cannot confirm entitlement, so accept only the mailbox that is open on
  // screen — that one is known to be this user's, because the page resolved it
  // from their own accounts list. Everything else waits for the list.
  if (knownAccountIds.length === 0) {
    const isActive = activeAccountId !== null && eventAccountId === activeAccountId;
    return {
      allowCacheWrite: isActive,
      allowNotification: isActive,
      reason: isActive ? 'entitled' : 'unverifiable-account',
      isScopeViolation: false,
    };
  }

  if (!knownAccountIds.includes(eventAccountId)) {
    return { ...DROP, reason: 'unknown-account', isScopeViolation: true };
  }

  // This user's mailbox, but not the one on screen. The cache still gets the
  // update — that account's list should be correct when they switch to it —
  // while the notification obeys the configured scope.
  if (
    scope === 'active-account' &&
    activeAccountId !== null &&
    eventAccountId !== activeAccountId
  ) {
    return {
      allowCacheWrite: true,
      allowNotification: false,
      reason: 'inactive-account',
      isScopeViolation: false,
    };
  }

  return {
    allowCacheWrite: true,
    allowNotification: true,
    reason: 'entitled',
    isScopeViolation: false,
  };
}
