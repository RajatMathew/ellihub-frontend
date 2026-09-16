import { useCallback, useState } from 'react';

import {
  emailAiSuggestionApi,
  type EmailAiSuggestion,
} from '@/modules/email/api/email-ai-suggestion.api';
import { emailKeys } from '@/modules/email/hooks/email.hooks';
import {
  deriveEmailAiSuggestionStage,
  type EmailAiSuggestionStage,
} from '@/modules/email/lib/email-ai-suggestion-stage';
import { useQuery } from '@tanstack/react-query';

/** The suggestion for a thread never changes once made, so it is held for the session. */
const AI_SUGGESTION_GC_TIME_MS = 15 * 60 * 1000;

export type { EmailAiSuggestionStage };

export type EmailAiSuggestionState = {
  stage: EmailAiSuggestionStage;
  suggestion: EmailAiSuggestion | null;
  /** The reader accepted it, or edited the panel, and the banner should go. */
  resolve: () => void;
};

/**
 * The AI's read of the open conversation, and whether its banner is still
 * asking for a decision.
 *
 * Only asked for when the thread has nothing on it yet — no assignee, no
 * classification, no linked records. A thread someone has already filed does
 * not need a guess, and asking anyway would put a banner over work that is
 * already done.
 *
 * `resolve` is deliberately local state rather than a mutation: approving a
 * suggestion whose values are *already* written into the panel changes nothing
 * on the server, it just retires the banner. Editing anything in the panel
 * calls it too — changing the assignee is a clearer "I have dealt with this"
 * than clicking a tick, and it costs the reader nothing.
 */
export function useEmailAiSuggestion({
  accountId,
  conversationKey,
  eligible,
}: {
  accountId?: string;
  conversationKey?: string;
  /** False once the thread carries an assignee, a classification or a reference. */
  eligible: boolean;
}): EmailAiSuggestionState {
  const [resolvedKeys, setResolvedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const enabled = Boolean(accountId && conversationKey) && eligible;

  const query = useQuery({
    queryKey: [...emailKeys.all, 'ai-suggestion', accountId, conversationKey] as const,
    queryFn: ({ signal }) =>
      emailAiSuggestionApi.getThreadSuggestion({
        accountId: accountId as string,
        conversationKey: conversationKey as string,
        signal,
      }),
    enabled,
    staleTime: Infinity,
    gcTime: AI_SUGGESTION_GC_TIME_MS,
    // A guess that failed to arrive is not worth a retry or an error state:
    // the panel simply carries on without a banner.
    retry: false,
    refetchOnMount: false,
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

  const stage = deriveEmailAiSuggestionStage({
    enabled,
    isResolved: Boolean(conversationKey && resolvedKeys.has(conversationKey)),
    hasSuggestion: Boolean(query.data),
  });

  return { stage, suggestion: query.data ?? null, resolve };
}
