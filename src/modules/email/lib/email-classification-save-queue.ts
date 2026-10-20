import type { SaveEmailThreadClassificationPayload } from '@/modules/email/api';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Whether another classification save for the same thread is still waiting
 * behind this one.
 *
 * Saves are queued one at a time and each sends the thread's whole reference
 * set, built from what is on screen when it was clicked. Every queued save has
 * already drawn its own optimistic value, so the screen is ahead of any single
 * server answer. Writing an earlier answer back over it — or rolling back to
 * the snapshot an earlier save took — shows a set that is missing the later
 * clicks, and a click made in that window is built from the shorter set and
 * saves it. Linking three records quickly lost the middle two.
 *
 * The mutation this is called for is still pending while its own callbacks
 * run, so it counts itself: more than one means something is behind it.
 */
export function hasQueuedClassificationSave(
  queryClient: QueryClient,
  mutationKey: QueryKey,
  payload: Pick<SaveEmailThreadClassificationPayload, 'accountId' | 'conversationKey'>
): boolean {
  return (
    queryClient.isMutating({
      mutationKey,
      predicate: (mutation) => {
        const variables = mutation.state.variables as
          | SaveEmailThreadClassificationPayload
          | undefined;
        return (
          variables?.accountId === payload.accountId &&
          variables.conversationKey === payload.conversationKey
        );
      },
    }) > 1
  );
}
