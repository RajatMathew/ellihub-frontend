import { useMemo } from 'react';

import api from '@/app/api';
import { useQuery } from '@tanstack/react-query';

import { compactBody, type ThreadBodyState } from './agent-context-rules';
import type { ContextThread } from './agent-fullscreen-rules';
import { toSuggestedActions } from './agent-suggestions';
import {
  resolveThreadSuggestions,
  shouldAskLive,
  type ThreadSuggestions,
} from './thread-suggestions-state';

export type { ThreadSuggestions } from './thread-suggestions-state';

const KEPT_MS = 30 * 60 * 1000;

/**
 * What Elliot suggests for the one thread in context.
 *
 * The suggestions kept for the message are asked for first, the moment the panel opens — the
 * classifier writes them when it reads new mail, so they are usually there and show at once
 * (elli-ui#1481). Only when nothing is kept does the panel wait for the body and ask the model,
 * sending the message's ids so that answer is kept for next time. Any failure is "no
 * suggestions": the chat keeps its fixed chips.
 */
export function useThreadSuggestions(
  thread: (ContextThread & { senderEmail?: string | null; attachments?: string[] }) | undefined,
  body: ThreadBodyState | undefined,
  accountId: string | undefined
): ThreadSuggestions {
  // Trimmed to plain text the way the chat context is: the raw body is HTML.
  const loaded = useMemo(
    () => (body?.status === 'loaded' ? compactBody(body.body) : undefined),
    [body]
  );
  const messageId = thread?.messageId ?? null;

  const storedQuery = useQuery({
    queryKey: ['mock-agent', 'suggestions', 'stored', accountId ?? null, messageId],
    queryFn: async ({ signal }) => {
      const response = await api.get<{ data: { suggestions: unknown } }>(
        '/mock/agent/suggest/stored',
        { params: { accountId, messageId }, signal }
      );
      const kept = response.data.data?.suggestions;
      return kept === null || kept === undefined
        ? null
        : toSuggestedActions({ suggestions: kept }, 'model');
    },
    enabled: Boolean(thread && accountId),
    // A kept answer does not change; "nothing kept yet" is asked again next open.
    staleTime: (query) => (query.state.data ? KEPT_MS : 0),
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  const stored = {
    // No account to look under, or an API without the route: settled, nothing kept.
    settled: !accountId || storedQuery.isSuccess || storedQuery.isError,
    items: storedQuery.data ?? null,
  };
  const askLive = shouldAskLive({
    hasThread: Boolean(thread),
    bodyLoaded: Boolean(loaded),
    stored,
  });

  const liveQuery = useQuery({
    queryKey: ['mock-agent', 'suggestions', messageId],
    queryFn: async () => {
      const response = await api.post<{ data: unknown }>('/mock/agent/suggest', {
        subject: thread!.subject,
        senderName: thread!.senderName,
        senderEmail: thread!.senderEmail ?? null,
        body: loaded,
        attachments: thread!.attachments ?? [],
        ...(accountId && messageId ? { accountId, messageId } : {}),
      });
      return toSuggestedActions(response.data.data, 'model');
    },
    enabled: askLive,
    // A real answer is kept; an empty one is asked again next time.
    staleTime: (query) => (query.state.data?.length ? KEPT_MS : 0),
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    throwOnError: false,
  });

  if (liveQuery.isError && import.meta.env.DEV) {
    console.warn('[elliot] suggestions request failed', liveQuery.error);
  }
  return resolveThreadSuggestions({
    hasThread: Boolean(thread),
    stored,
    live: {
      enabled: askLive,
      settled: liveQuery.isSuccess || liveQuery.isError,
      failed: liveQuery.isError,
      items: liveQuery.data ?? null,
    },
  });
}
