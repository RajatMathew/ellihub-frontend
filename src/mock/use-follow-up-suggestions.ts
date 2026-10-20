import api from '@/app/api';
import { useQuery } from '@tanstack/react-query';
import type { UIMessage } from 'ai';

import { toFollowUps, toFollowUpTurns } from './agent-follow-up-chips';

/**
 * What the reader might ask next, for the answer `anchor` names (see
 * `followUpAnchor`). One small request per finished answer, never while Elliot
 * is still writing, and cached per answer so reopening the chat or switching
 * back to it does not ask again. Any failure is "no chips": the box looks as it
 * always did.
 */
export function useFollowUpSuggestions(
  anchor: string | null,
  messages: readonly UIMessage[],
  threadSubjects: readonly string[]
): string[] {
  const query = useQuery({
    queryKey: ['mock-agent', 'follow-ups', anchor],
    queryFn: async ({ signal }) => {
      const response = await api.post<{ data: unknown }>(
        '/mock/agent/follow-ups',
        { turns: toFollowUpTurns(messages), threads: threadSubjects.slice(0, 10) },
        { signal }
      );
      return toFollowUps(response.data.data);
    },
    enabled: Boolean(anchor),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    throwOnError: false,
  });
  if (query.isError && import.meta.env.DEV) {
    console.warn('[elliot] follow-up suggestions request failed', query.error);
  }
  return anchor && query.data ? query.data : [];
}
