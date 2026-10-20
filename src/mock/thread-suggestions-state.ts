import type { SuggestedAction } from './agent-suggestions';

export type ThreadSuggestions =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; items: SuggestedAction[] };

/**
 * What the agent panel shows for one thread's suggestions (elli-ui#1481), from two requests:
 *
 * - **stored** — `GET /agent/suggest/stored`, the suggestions kept for the message when the
 *   classifier read it (or the panel first asked). It needs no body, so it goes out the moment
 *   the panel opens; `null` data means nothing is kept yet. An API that predates it fails, and
 *   that reads the same as "nothing kept".
 * - **live** — `POST /agent/suggest`, the model asked now. Only needed when nothing is kept, and
 *   only possible once the body has loaded.
 *
 * A kept answer wins as soon as it arrives, even while the body is still loading.
 */
export function resolveThreadSuggestions(input: {
  hasThread: boolean;
  stored: { settled: boolean; items: SuggestedAction[] | null };
  live: { enabled: boolean; settled: boolean; failed: boolean; items: SuggestedAction[] | null };
}): ThreadSuggestions {
  const { hasThread, stored, live } = input;
  if (!hasThread) return { status: 'idle' };
  if (stored.items) return { status: 'ready', items: stored.items };
  if (!stored.settled) return { status: 'loading' };
  if (live.failed) return { status: 'ready', items: [] };
  if (live.items) return { status: 'ready', items: live.items };
  return live.enabled ? { status: 'loading' } : { status: 'idle' };
}

/** Whether the live request should go out: nothing kept, and the body is ready to send. */
export function shouldAskLive(input: {
  hasThread: boolean;
  bodyLoaded: boolean;
  stored: { settled: boolean; items: SuggestedAction[] | null };
}): boolean {
  return input.hasThread && input.bodyLoaded && input.stored.settled && !input.stored.items;
}
