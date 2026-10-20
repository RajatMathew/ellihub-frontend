import { toastApiError } from '@/app/lib/toast-api-error';
import {
  emailActivityApi,
  type EmailActivity,
  type EmailActivityFilter,
} from '@/modules/email/api';
import { emailActivityKeys } from '@/modules/email/constants/email-activity.keys';
import { useThreadCalendarEventsQuery } from '@/modules/email/hooks/calendar.hooks';
import { activityCalendarEvent } from '@/modules/email/lib/thread-activity';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const ACTIVITY_STALE_TIME_MS = 30 * 1000;

/** One thread's timeline: what each of its emails made someone do. */
export const useThreadActivityQuery = (
  accountId: string | undefined,
  conversationKey: string | null | undefined,
  enabled = true
) =>
  useQuery({
    queryKey: emailActivityKeys.thread(accountId, conversationKey),
    queryFn: () => emailActivityApi.listForThread(accountId!, conversationKey!),
    enabled: enabled && Boolean(accountId && conversationKey),
    staleTime: ACTIVITY_STALE_TIME_MS,
  });

/** Everything done from the reader's mailboxes, a page at a time. */
export const useEmailActivityFeedQuery = (filter: EmailActivityFilter) =>
  useInfiniteQuery({
    queryKey: emailActivityKeys.feed(filter),
    queryFn: ({ pageParam }) =>
      emailActivityApi.listForOrganization({ ...filter, before: pageParam, limit: 50 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextBefore ?? undefined,
    staleTime: ACTIVITY_STALE_TIME_MS,
  });

/**
 * Anything done from a thread lands in its activity, so a thread's timeline is
 * refreshed after an action there — and the feed with it.
 */
export function useInvalidateEmailActivity() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: emailActivityKeys.all });
}

export const useAddThreadNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: emailActivityApi.addNote,
    onSuccess: (_note, input) =>
      queryClient.invalidateQueries({
        queryKey: emailActivityKeys.thread(input.accountId, input.conversationKey),
      }),
    onError: (error) => toastApiError(error, 'Could not add the note. Try again.'),
  });
};

export const useEditThreadNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; note: string }) =>
      emailActivityApi.editNote(input.id, input.note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailActivityKeys.all }),
    onError: (error) => toastApiError(error, 'Could not save the note. Try again.'),
  });
};

export const useDeleteThreadNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailActivityApi.deleteNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailActivityKeys.all }),
    onError: (error) => toastApiError(error, 'Could not delete the note. Try again.'),
  });
};

/**
 * The linked event an "added calendar event" row made. It reads the thread's
 * event list under the same key the details panel uses, so on an open thread
 * it costs no request of its own. `fetch: false` only reads what is already
 * cached — the activity feed spans many threads, and one request per row
 * there would be a request loop.
 */
export const useActivityCalendarEvent = (item: EmailActivity, fetch = true) => {
  const isEvent = item.action === 'calendar_event';
  const { data } = useThreadCalendarEventsQuery(
    item.accountId,
    item.conversationKey,
    fetch && isEvent
  );
  return isEvent ? activityCalendarEvent(item, data) : null;
};
