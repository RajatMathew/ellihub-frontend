/**
 * Elliot chat titles in the client (elli-ui#1370): what the header calls the
 * open chat, and how the chats list learns a new name before it is next
 * fetched.
 */

export type TitledConversation = {
  id: string;
  title: string;
  summary: string | null;
  updatedAt: string;
};

/** The longest name a chat can be given — the server's limit. */
export const MAX_CHAT_TITLE_CHARS = 60;

/**
 * The header's name for the open chat: the newest one this session has seen
 * for it (streamed, renamed), else the chats list's, else "New chat". Never
 * "Elliot" — the header already shows whose panel this is.
 */
export function chatHeaderTitle(input: {
  conversationId: string | null;
  liveTitles: Readonly<Record<string, string>>;
  history: readonly Pick<TitledConversation, 'id' | 'title'>[];
}): string {
  const { conversationId, liveTitles, history } = input;
  if (!conversationId) return 'New chat';
  return (
    liveTitles[conversationId] ??
    history.find((item) => item.id === conversationId)?.title ??
    'New chat'
  );
}

/**
 * The chats list with one chat's new name in it. A chat the list does not
 * have yet — one started in this session — goes to the top, where the next
 * fetch would put it anyway.
 */
export function withConversationTitle<T extends TitledConversation>(
  history: readonly T[],
  update: { id: string; title: string },
  now: Date = new Date()
): T[] {
  if (history.some((item) => item.id === update.id)) {
    return history.map((item) => (item.id === update.id ? { ...item, title: update.title } : item));
  }
  return [
    { id: update.id, title: update.title, summary: null, updatedAt: now.toISOString() } as T,
    ...history,
  ];
}

/**
 * The live names once a reply has finished, with the stand-in names held
 * during it filled in — only for chats that got no better name meanwhile
 * (generated, or renamed by the reader). Returns `live` itself when nothing
 * changes, so settling a reply does not re-render the panel for nothing.
 */
export function withProvisionalTitles(
  live: Readonly<Record<string, string>>,
  provisional: Readonly<Record<string, string>>
): Record<string, string> {
  const missing = Object.entries(provisional).filter(([id]) => !live[id]);
  return missing.length === 0 ? live : { ...live, ...Object.fromEntries(missing) };
}

/** What a rename sends, or null when there is nothing to save. */
export function renamedTitle(draft: string, current: string): string | null {
  const title = draft.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_TITLE_CHARS);
  return title && title !== current ? title : null;
}
