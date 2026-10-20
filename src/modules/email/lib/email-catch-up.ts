/**
 * When a mailbox has to catch up on what it missed while it was not listening.
 *
 * The realtime socket is the *only* thing that refreshes an open mailbox: every
 * email query sets `refetchOnMount`, `refetchOnWindowFocus` and
 * `refetchOnReconnect` to false, and nothing polls. That is deliberate — it is
 * what keeps a quiet mailbox from issuing a request every few seconds — but it
 * leaves two gaps, and both were reachable by leaving a tab open overnight:
 *
 * - **The socket drops.** A sleeping laptop, a network change or a proxy
 *   timeout closes it. Reconnect already backs off and retries, but
 *   `onopen` only reset the attempt counter — anything the server published
 *   while the socket was down was simply gone, because nothing refetched on
 *   the way back up.
 * - **The tab is hidden.** A background tab is still "connected" as far as the
 *   page is concerned, but the machine it is on may have been asleep for hours.
 *
 * Either way the cache keeps serving whatever it last heard, indefinitely, and
 * the only cure is a manual reload. That is the "almost a day out of sync" a
 * reader hit on staging.
 *
 * Both decisions live here rather than in the hook because the unit suite has
 * no React renderer — a conditional left inside `useEmailRealtime` cannot be
 * tested at all.
 */

/**
 * How long a tab may be hidden before returning to it is treated as a gap.
 *
 * Matched to the messages `staleTime` in `email.hooks.ts`: inside that window
 * the cache is considered good anyway, so refetching would duplicate work a
 * normal mount would not have done. Above it, we have no idea what was missed.
 */
export const EMAIL_CATCH_UP_AFTER_HIDDEN_MS = 60_000;

/**
 * Whether a socket that has just opened should also refetch.
 *
 * Only on a *re*connect. The first open happens while the page is still
 * loading its queries, so catching up there would fire a second copy of
 * requests already in flight.
 *
 * `openCount` counts opens including this one, so the first is 1.
 */
export function shouldCatchUpOnOpen(openCount: number): boolean {
  return openCount > 1;
}

/**
 * Whether a tab that has just become visible should refetch.
 *
 * `hiddenForMs` is how long it spent hidden. A quick alt-tab is not a gap and
 * must not cost a request — otherwise switching windows becomes a refetch
 * trigger on every mailbox.
 */
export function shouldCatchUpOnVisible(
  hiddenForMs: number,
  staleAfterMs: number = EMAIL_CATCH_UP_AFTER_HIDDEN_MS
): boolean {
  return hiddenForMs >= staleAfterMs;
}
