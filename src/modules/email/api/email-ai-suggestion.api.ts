import { z } from 'zod';

/**
 * The AI's read of one conversation: who it thinks should own it, whether it
 * belongs to project work at all, and which records it looks related to.
 *
 * **This is a stand-in.** elli-ui#921 asks for a fake endpoint until the real
 * one exists, so `getThreadSuggestion` below resolves from a local fixture
 * after a short delay rather than calling the API. Everything else — the
 * schema, the hook, the panel — is written against the shape the real endpoint
 * is expected to return, so swapping it is one function body:
 *
 * ```ts
 * const { data } = await api.get(`/email/accounts/${accountId}/conversations/${conversationKey}/ai-suggestion`);
 * return emailAiSuggestionSchema.parse(data?.data ?? data);
 * ```
 *
 * Nothing else in the module imports the fixture, and no component knows the
 * difference.
 */
export const emailAiSuggestionReferenceSchema = z.object({
  type: z.enum(['project', 'rfq', 'rfi', 'po', 'co', 'invoice']),
  /** The record's own code — `30000`, `RFQ-30000-002`. Shown in the chip. */
  code: z.string(),
  label: z.string(),
  entityId: z.string().nullable(),
});

export const emailAiSuggestionSchema = z.object({
  conversationKey: z.string(),
  /** `project` when the thread looks like project work, `other` when it does not. */
  classification: z.enum(['project', 'other']),
  /** Confidence in [0,1]; the panel does not render it yet, but the server sends it. */
  confidence: z.number().min(0).max(1),
  assignee: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
    })
    .nullable(),
  references: z.array(emailAiSuggestionReferenceSchema),
  /** One sentence, shown in the banner when present. */
  rationale: z.string().nullable(),
});

export type EmailAiSuggestion = z.infer<typeof emailAiSuggestionSchema>;
export type EmailAiSuggestionReference = z.infer<typeof emailAiSuggestionReferenceSchema>;

/** How long the stand-in takes to "think". Roughly what a real call would cost. */
const FAKE_SUGGESTION_DELAY_MS = 450;

export const emailAiSuggestionApi = {
  async getThreadSuggestion(params: {
    accountId: string;
    conversationKey: string;
    signal?: AbortSignal;
  }): Promise<EmailAiSuggestion | null> {
    const { suggestionFixture } = await import('@/modules/email/data/ai-suggestion.fixture');

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, FAKE_SUGGESTION_DELAY_MS);
      // An abandoned thread must not keep a timer alive, and must not resolve
      // into a panel the reader has already navigated away from.
      params.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });

    return emailAiSuggestionSchema.nullable().parse(suggestionFixture(params.conversationKey));
  },
};
