/**
 * Threads the user added to the chat go to Elliot with their full message, not
 * just the list row's preview — otherwise "create an RFQ from this email" on
 * an added thread has nothing to read. The bodies arrive separately, so a
 * thread still loading says so rather than looking like it has no body.
 */
export type ThreadBodyState =
  | { status: 'loading' }
  | { status: 'loaded'; body: string[] }
  | { status: 'error' };

export function withThreadBodies<T extends { messageId: string }>(
  threads: T[],
  bodies: ReadonlyMap<string, ThreadBodyState>
): Array<T & { body?: string[]; bodyStatus?: 'loading' | 'unavailable' }> {
  return threads.map((thread) => {
    const state = bodies.get(thread.messageId);
    if (!state) return thread;
    if (state.status === 'loaded') return { ...thread, body: compactBody(state.body) };
    return { ...thread, bodyStatus: state.status === 'loading' ? 'loading' : 'unavailable' };
  });
}

/** How much of one message Elliot gets. Enough for any quote; small enough that four threads fit. */
export const MAX_THREAD_BODY_CHARS = 6_000;

/**
 * A message body as Elliot should read it: text, not markup. Marketing mail
 * is mostly HTML and tracking links; sent whole, four threads overflow the
 * server's context budget and the last ones are cut off entirely.
 */
export function compactBody(body: readonly string[], max = MAX_THREAD_BODY_CHARS): string[] {
  const text = body
    .join('\n')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  if (!text) return [];
  return [text.length > max ? `${text.slice(0, max)}\n[message trimmed]` : text];
}
