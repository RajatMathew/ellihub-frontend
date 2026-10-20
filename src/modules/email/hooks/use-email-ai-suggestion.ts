import { useCallback, useState } from 'react';

import {
  emailAiSuggestionApi,
  type EmailAiSuggestion,
} from '@/modules/email/api/email-ai-suggestion.api';
import { emailKeys } from '@/modules/email/hooks/email.hooks';
import { readingWorthShowing } from '@/modules/email/lib/elliot-reading';
import { isElliotClassifierDisabled } from '@/modules/email/lib/email-agent-availability';
import {
  deriveEmailAiSuggestionStage,
  type EmailAiSuggestionStage,
} from '@/modules/email/lib/email-ai-suggestion-stage';
import { useQuery } from '@tanstack/react-query';

/**
 * A thread's reading changes when Elliot reads a newer message in it, which is minutes after it
 * lands at most — as fresh as the message list the thread was opened from.
 */
const AI_SUGGESTION_STALE_TIME_MS = 60 * 1000;
const AI_SUGGESTION_GC_TIME_MS = 15 * 60 * 1000;

export type { EmailAiSuggestionStage };

export type EmailAiSuggestionState = {
  stage: EmailAiSuggestionStage;
  suggestion: EmailAiSuggestion | null;
  /** The reader edited the panel; retires the stage, which drops Elliot's border. */
  resolve: () => void;
};

/**
 * Elliot's reading of the open conversation (`GET /elliot/readings`).
 *
 * Nothing here asks for approval. elli-core has already written Elliot's court
 * and confident links onto an unfiled thread, so the panel's own fields show
 * them and the reader changes them with the same controls as anything else. The
 * reading only outlines the card in blue while it still shows Elliot's filing,
 * and gives "+ Add task" Elliot's drafted task to prefill.
 *
 * Asked for on every opened thread — a thread Elliot filed is no longer
 * "unfiled", so filing state cannot gate it. `VITE_DISABLE_ELLIOT_CLASSIFIER` turns it off.
 */
export function useEmailAiSuggestion({
  accountId,
  conversationKey,
}: {
  accountId?: string;
  conversationKey?: string;
}): EmailAiSuggestionState {
  const [resolvedKeys, setResolvedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const enabled = !isElliotClassifierDisabled && Boolean(accountId && conversationKey);

  const query = useQuery({
    queryKey: emailKeys.aiSuggestion(accountId, conversationKey),
    queryFn: ({ signal }) =>
      emailAiSuggestionApi.getThreadSuggestion({
        accountId: accountId as string,
        conversationKey: conversationKey as string,
        signal,
      }),
    enabled,
    staleTime: AI_SUGGESTION_STALE_TIME_MS,
    gcTime: AI_SUGGESTION_GC_TIME_MS,
    // A guess that failed to arrive is not worth a retry or an error state:
    // the panel simply carries on without Elliot's marks.
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const resolve = useCallback(() => {
    if (!conversationKey) return;
    setResolvedKeys((current) => {
      if (current.has(conversationKey)) return current;
      const next = new Set(current);
      next.add(conversationKey);
      return next;
    });
  }, [conversationKey]);

  // Only a reading that filed the thread or drafted a task changes anything on screen.
  const suggestion = query.data && readingWorthShowing(query.data) ? query.data : null;
  const stage = deriveEmailAiSuggestionStage({
    enabled,
    isResolved: Boolean(conversationKey && resolvedKeys.has(conversationKey)),
    hasSuggestion: Boolean(suggestion),
  });

  return { stage, suggestion, resolve };
}
