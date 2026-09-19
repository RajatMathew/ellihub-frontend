/**
 * What an `email.synced` realtime event is allowed to do, read off the event
 * itself.
 *
 * Two gates, and they are deliberately not the same one:
 *
 * - **Refetch** on `changed` — the server saying this account's cached mail
 *   actually moved. It cannot be the event's mere arrival: `email.synced` is
 *   published after every sync run, new mail or not, and invalidating on all of
 *   them had a quiet mailbox issuing a request every few seconds.
 * - **Notify** on `newMail` — which the server sets only for unread inbound
 *   Inbox mail, because that is the only thing worth interrupting anyone over.
 *
 * Conflating the two is what broke: the refetch used to ride on `newMail`, so
 * every publisher that had a change to report but no toast to raise — a
 * background revalidation, a widened search or filter, a conversation that
 * gained a message — was ignored, and mail already sitting in the server's
 * cache stayed off the screen until the reader hit refresh (elli-ui#965).
 *
 * `changed` is absent on an older API, where it reads as `false`. That is the
 * behaviour this repo had before the flag existed, so the two deploy in either
 * order.
 */
export type EmailSyncedEvent = {
  changed?: boolean;
  newMail?: { conversationId?: string } | null;
};

export type EmailSyncedActions = {
  /** Invalidate the account's message, conversation and folder queries. */
  refetch: boolean;
  /** Raise the new-mail toast. Still subject to the scope check. */
  notify: boolean;
};

export function emailSyncedActions(event: EmailSyncedEvent): EmailSyncedActions {
  // A toast without a refetch would announce mail the list never shows, so
  // `newMail` implies a refetch even from a server that has not learnt the
  // flag yet.
  const notify = Boolean(event.newMail?.conversationId);
  return { refetch: Boolean(event.changed) || notify, notify };
}
