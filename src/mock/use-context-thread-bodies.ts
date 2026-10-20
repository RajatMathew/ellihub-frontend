import { useMemo } from 'react';

import { emailApi } from '@/modules/email/api/email.api';
import { conversationScope, emailKeys } from '@/modules/email/constants/email.keys';
import { shouldRetryEmailRequest } from '@/modules/email/lib/email-errors';
import { useQueries } from '@tanstack/react-query';

import type { ThreadBodyState } from './agent-context-rules';

/** What the loader needs of a thread in context, the way the mailbox keys it. */
export type ContextThreadRef = {
  messageId: string;
  threadId?: string | null;
  conversationKey?: string | null;
};

const CACHE = {
  staleTime: 60 * 1000,
  gcTime: 15 * 60 * 1000,
  retry: shouldRetryEmailRequest,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;

/**
 * The full message behind each thread in the chat, keyed by message id,
 * loaded the way the mailbox's reading pane loads it: a threaded row gets its
 * whole conversation (that is where its bodies live), a lone message gets the
 * message itself. Same query keys as the mailbox, so nothing is fetched twice.
 */
export function useContextThreadBodies(
  accountId: string | undefined,
  threads: ContextThreadRef[]
): ReadonlyMap<string, ThreadBodyState> {
  const conversations = useQueries({
    queries: threads.map((thread) => ({
      queryKey: emailKeys.conversation(accountId, thread.threadId, thread.conversationKey),
      queryFn: () =>
        emailApi.listConversation(
          accountId!,
          thread.threadId!,
          conversationScope(thread.threadId, thread.conversationKey) ?? undefined
        ),
      enabled: Boolean(accountId && thread.threadId),
      ...CACHE,
    })),
  });
  const messages = useQueries({
    queries: threads.map((thread) => ({
      queryKey: emailKeys.message(accountId, thread.messageId),
      queryFn: () => emailApi.getMessage(accountId!, thread.messageId),
      enabled: Boolean(accountId) && !thread.threadId,
      ...CACHE,
    })),
  });

  // Keyed on what came back, so the map only changes when a body does.
  const signature = threads
    .map((thread, index) => {
      const conversation = conversations[index];
      const message = messages[index];
      const size = thread.threadId
        ? (conversation?.data?.reduce((total, item) => total + item.body.length, 0) ?? 0)
        : (message?.data?.body?.length ?? 0);
      return `${thread.messageId}:${conversation?.status}:${message?.status}:${size}`;
    })
    .join('|');

  return useMemo(() => {
    const map = new Map<string, ThreadBodyState>();
    threads.forEach((thread, index) => {
      const query = thread.threadId ? conversations[index] : messages[index];
      const body = thread.threadId
        ? conversations[index]?.data?.flatMap((item) => item.body)
        : messages[index]?.data?.body;
      if (body?.length) map.set(thread.messageId, { status: 'loaded', body });
      else if (query?.status === 'error' || query?.status === 'success')
        map.set(thread.messageId, { status: 'error' });
      else map.set(thread.messageId, { status: 'loading' });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
