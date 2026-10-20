import { addDaysToDateOnly, toDateOnly, todayDateOnly } from '@/app/lib/dates';

/** From this width the panel pushes the mailbox aside instead of floating over it. */
export const PUSH_CONTENT_WIDTH = 520;
/** From this width the mailbox hides its list to make room. */
export const HIDE_EMAIL_LIST_WIDTH = 640;

/**
 * What the mailbox does around the panel. Full screen covers the whole mail
 * workspace, so nothing is pushed and the list behind it is not worth drawing.
 */
export function agentLayoutFlags({
  open,
  width,
  fullscreen,
}: {
  open: boolean;
  width: number;
  fullscreen: boolean;
}): { pushesContent: boolean; hidesEmailList: boolean } {
  if (!open) return { pushesContent: false, hidesEmailList: false };
  return {
    pushesContent: !fullscreen && width >= PUSH_CONTENT_WIDTH,
    hidesEmailList: fullscreen || width >= HIDE_EMAIL_LIST_WIDTH,
  };
}

export type ConversationDayGroup<T> = {
  label: 'Today' | 'Yesterday' | 'Earlier';
  items: T[];
};

/**
 * Chats in the rail, newest first, under the day they were last touched.
 * `updatedAt` is a moment, so the day is the viewer's own — a chat from
 * 11 PM last night is "Yesterday" in New York even though it is today in UTC.
 */
export function groupConversationsByDay<T extends { updatedAt: string }>(
  items: T[],
  now: Date = new Date()
): ConversationDayGroup<T>[] {
  const today = todayDateOnly(undefined, now);
  const yesterday = addDaysToDateOnly(today, -1);
  const groups: ConversationDayGroup<T>[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];
  const sorted = [...items].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
  for (const item of sorted) {
    const day = toDateOnly(new Date(item.updatedAt));
    const group = day === today ? groups[0] : day === yesterday ? groups[1] : groups[2];
    group.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

/** A mail in the chat's context, as the rail's actions name it. */
export type ContextThread = { id: string; messageId: string; subject: string; senderName: string };

/**
 * An action's prompt, with `{email}` filled in. With one thread in context
 * "this email" is enough; with several, the prompt names the one the user
 * picked by subject and message id, so Elliot has nothing to guess.
 */
export function fillEmailPrompt(template: string, thread?: ContextThread): string {
  const email = thread
    ? `the email "${thread.subject || '(no subject)'}" from ${thread.senderName} (message ${thread.messageId})`
    : 'this email';
  return template.replace('{email}', email);
}

/**
 * A typed request meant for every thread in context, spelled out so Elliot
 * acts on each one (mailbox actions take several message ids in one
 * proposal) instead of picking the first it sees.
 */
export function fillAllEmailsPrompt(raw: string, threads: ContextThread[]): string {
  const list = threads
    .map(
      (thread) =>
        `"${thread.subject || '(no subject)'}" from ${thread.senderName} (message ${thread.messageId})`
    )
    .join('; ');
  return `${raw} — do this for each of these ${threads.length} emails, not just one: ${list}.`;
}

/**
 * Chats whose title or summary holds every word of the query, ignoring case —
 * the chat-history menu's search (elli-ui#1414). A blank query keeps them all.
 */
export function searchConversations<T extends { title: string; summary?: string | null }>(
  items: readonly T[],
  query: string
): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((item) => {
    const text = `${item.title} ${item.summary ?? ''}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
