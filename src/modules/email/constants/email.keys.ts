import type { EmailThreadStatusFilter } from '@/modules/email/constants/email-filters';

export const emailKeys = {
  contactSuggestions: (accountId?: string, q?: string) =>
    ['email', 'contact-suggestions', accountId, q] as const,
  all: ['connected-email'] as const,
  /** The records linked to one thread, keyed by `threadLookupKey`. */
  threadLinkedRecords: (threadKey: string) =>
    ['connected-email', 'thread-linked-records', threadKey] as const,
  config: () => [...emailKeys.all, 'config'] as const,
  /** Elliot's reading of one thread (`GET /elliot/readings`). */
  aiSuggestionRoot: (accountId?: string) => [...emailKeys.all, 'ai-suggestion', accountId] as const,
  aiSuggestion: (accountId?: string, conversationKey?: string) =>
    [...emailKeys.aiSuggestionRoot(accountId), conversationKey] as const,
  accounts: () => [...emailKeys.all, 'accounts'] as const,
  folders: (accountId?: string) => [...emailKeys.all, 'folders', accountId] as const,
  tags: (accountId?: string) => [...emailKeys.all, 'tags', accountId] as const,
  signatures: (accountId?: string) => [...emailKeys.all, 'signatures', accountId] as const,
  messagesRoot: (accountId?: string) => [...emailKeys.all, 'messages', accountId] as const,
  messages: (
    accountId?: string,
    folder?: string,
    size?: number,
    search?: string,
    projectId?: string,
    classification?: 'other',
    unread?: boolean,
    flagged?: boolean,
    hasAttachments?: boolean,
    status?: EmailThreadStatusFilter,
    tagId?: string,
    tagIds?: readonly string[]
  ) =>
    [
      ...emailKeys.messagesRoot(accountId),
      folder,
      size,
      search,
      projectId ?? null,
      classification ?? null,
      unread ?? null,
      flagged ?? null,
      hasAttachments ?? null,
      status ?? null,
      tagId ?? null,
      // Sorted, so the same tags picked in another order are one cache entry.
      tagIds?.length ? [...tagIds].sort().join(',') : null,
    ] as const,
  messageRoot: (accountId?: string) => [...emailKeys.all, 'message', accountId] as const,
  message: (accountId?: string, messageId?: string | null) =>
    [...emailKeys.messageRoot(accountId), messageId] as const,
  messageBody: (accountId?: string, messageId?: string | null) =>
    [...emailKeys.all, 'message-body', accountId, messageId] as const,
  conversationRoot: (accountId?: string) => [...emailKeys.all, 'conversation', accountId] as const,
  // One entry per conversation, not per thread (elli-ui#1264). Outlook can file
  // unrelated mail under one thread id, and the API splits it back apart by
  // `conversationKey`, answering each with only its own messages. Keyed by the
  // thread alone, two of those conversations shared an entry, and opening the
  // second showed the first one's messages.
  conversation: (accountId?: string, threadId?: string | null, conversationKey?: string | null) =>
    [
      ...emailKeys.conversationRoot(accountId),
      threadId,
      conversationScope(threadId, conversationKey),
    ] as const,
  // Keyed by folder: the same mailbox answers different counts per folder, so
  // one key would serve the Inbox numbers inside Sent (elli-ui#1117).
  referenceProjectsRoot: (accountId?: string) =>
    [...emailKeys.all, 'reference-projects', accountId] as const,
  referenceProjects: (accountId?: string, folder?: { key?: string; id?: string }) =>
    [
      ...emailKeys.referenceProjectsRoot(accountId),
      folder?.key ?? null,
      folder?.id ?? null,
    ] as const,
  pinnedThreadsRoot: (accountId?: string) =>
    [...emailKeys.all, 'pinned-threads', accountId] as const,
  pinnedThreads: (accountId?: string, folderId?: string | null) =>
    [...emailKeys.pinnedThreadsRoot(accountId), folderId ?? null] as const,
};

/**
 * The part of a conversation's identity beyond its thread: the `conversationKey`
 * when there is one, or `null` when the row is the whole thread.
 *
 * A `conversationKey` equal to the `threadId` is the same as none. Some callers
 * fill a missing key in with the thread id, and without this they would land in
 * a different cache entry from the reading pane, and ask the API for a
 * narrower answer than it gave the pane, for the same conversation.
 */
export function conversationScope(
  threadId?: string | null,
  conversationKey?: string | null
): string | null {
  return conversationKey && conversationKey !== threadId ? conversationKey : null;
}
