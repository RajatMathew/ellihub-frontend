import { api } from '@/app/api';
import {
  emailAiSuggestionSchema,
  type EmailAiSuggestion,
} from '@/modules/email/schemas/elliot-reading.schema';

export type {
  ElliotReadingLink,
  ElliotTaskDraft,
  EmailAiSuggestion,
} from '@/modules/email/schemas/elliot-reading.schema';

/** Elliot's readings; the shapes are in `schemas/elliot-reading.schema.ts`. */
export const emailAiSuggestionApi = {
  /** Elliot's latest reading of the thread, or `null` when it has not read it. */
  async getThreadSuggestion(params: {
    accountId: string;
    conversationKey: string;
    signal?: AbortSignal;
  }): Promise<EmailAiSuggestion | null> {
    const { data } = await api.get('/elliot/readings', {
      params: { accountId: params.accountId, conversationKey: params.conversationKey },
      signal: params.signal,
    });
    return emailAiSuggestionSchema.nullable().parse(data?.data ?? null);
  },
};
