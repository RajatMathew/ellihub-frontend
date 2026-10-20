import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { emailApi } from '@/modules/email/api/email.api';
import { emailKeys } from '@/modules/email/constants/email.keys';
import {
  canLookUpThread,
  emailsAdded,
  mergeThreadRecords,
  threadLookupKey,
  threadRecordOf,
  type LinkedEmail,
  type LinkedRecord,
  type ThreadRecord,
} from '@/modules/email/lib/record-links';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Linked items change as often as a thread is tagged; a minute is plenty. */
const STALE_MS = 60_000;
/** The server's own cap on one lookup. */
const BATCH = 20;

function freshRecords(queryClient: QueryClient, email: LinkedEmail): ThreadRecord[] | undefined {
  const key = emailKeys.threadLinkedRecords(threadLookupKey(email));
  const state = queryClient.getQueryState<ThreadRecord[]>(key);
  return state?.data && Date.now() - state.dataUpdatedAt < STALE_MS ? state.data : undefined;
}

/**
 * Looks up the threads not already cached, in batches of 20, and caches each
 * thread's answer — an empty one too — so the same email is never asked
 * about twice within the minute. Returns every asked-for thread's records.
 */
export async function loadThreadRecords(
  queryClient: QueryClient,
  emails: readonly LinkedEmail[],
  signal?: AbortSignal
): Promise<ThreadRecord[]> {
  const unique = new Map<string, LinkedEmail>();
  for (const email of emails) {
    if (canLookUpThread(email)) unique.set(threadLookupKey(email), email);
  }
  const threads = [...unique.values()];
  const missing = threads.filter((email) => !freshRecords(queryClient, email));
  for (let start = 0; start < missing.length; start += BATCH) {
    const batch = missing.slice(start, start + BATCH);
    const found = await emailApi.listThreadLinkedRecords(
      batch.map(({ accountId, conversationKey, threadId }) => ({
        accountId,
        conversationKey: conversationKey || null,
        threadId: threadId || null,
      })),
      signal
    );
    for (const email of batch) {
      queryClient.setQueryData(
        emailKeys.threadLinkedRecords(threadLookupKey(email)),
        found.filter((record) => threadRecordOf(email, record))
      );
    }
  }
  return threads.flatMap((email) => freshRecords(queryClient, email) ?? []);
}

/**
 * Brings a linked email's own linked items into the task or event modal
 * (elli-ui#1379): link a vendor's quote and its project and RFQ come with it.
 *
 * Only ever adds — a record already there stays where it is, and one the
 * reader removed is not brought back unless another email brings it. The
 * picker warms the cache (`usePrefetchThreadRecords`), so most links land
 * without waiting on a request at all.
 */
export function useBringThreadRecords(
  emails: readonly LinkedEmail[],
  setRecords: Dispatch<SetStateAction<LinkedRecord[]>>
) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);
  // The emails as they are when a lookup returns, not when it started: one
  // unlinked meanwhile must not bring its items in.
  const emailsRef = useRef(emails);
  useEffect(() => {
    emailsRef.current = emails;
  }, [emails]);

  /** Call with the email list as it now is, and as it was. */
  const bring = useCallback(
    async (next: readonly LinkedEmail[], previous: readonly LinkedEmail[]) => {
      // Before the await: the lookup can return before React re-renders.
      emailsRef.current = next;
      const added = emailsAdded(next, previous);
      if (!added.some(canLookUpThread)) return;
      setPending((count) => count + 1);
      try {
        const found = await loadThreadRecords(queryClient, added);
        if (found.length) {
          setRecords((current) => mergeThreadRecords(current, found, emailsRef.current));
        }
      } catch (error: unknown) {
        console.warn('Linked items lookup failed', error);
        toast.error('Couldn’t bring in the items linked to that email. Add them below.');
      } finally {
        setPending((count) => count - 1);
      }
    },
    [queryClient, setRecords]
  );

  return { bring, bringing: pending > 0 };
}

/**
 * Warms the cache for the emails a picker is showing, in one request, so
 * picking one brings its items in at once. Fire and forget: a failure here
 * only means the pick asks again.
 */
export function usePrefetchThreadRecords(emails: readonly LinkedEmail[], enabled: boolean) {
  const queryClient = useQueryClient();
  const key = emails.filter(canLookUpThread).slice(0, BATCH).map(threadLookupKey).join('|');
  const emailsRef = useRef(emails);
  useEffect(() => {
    emailsRef.current = emails;
  }, [emails]);
  useEffect(() => {
    if (!enabled || !key) return;
    const controller = new AbortController();
    // A short pause so scrolling through search results does not fire one
    // lookup per keystroke the debounce let through.
    const timer = window.setTimeout(() => {
      loadThreadRecords(
        queryClient,
        emailsRef.current.filter(canLookUpThread).slice(0, BATCH),
        controller.signal
      ).catch(() => undefined);
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, key, queryClient]);
}
