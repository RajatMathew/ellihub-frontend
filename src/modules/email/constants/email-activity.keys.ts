import type { EmailActivityFilter } from '@/modules/email/api';

export const emailActivityKeys = {
  all: ['email-activity'] as const,
  thread: (accountId?: string, conversationKey?: string | null) =>
    [...emailActivityKeys.all, 'thread', accountId, conversationKey ?? null] as const,
  feed: (filter: EmailActivityFilter) => [...emailActivityKeys.all, 'feed', filter] as const,
};
