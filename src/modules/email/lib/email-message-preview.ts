/**
 * The one line a collapsed message card shows.
 *
 * Lifted out of `email-thread-message-card` so the fallback below is testable:
 * it only exists because a large conversation stops sending bodies, and a
 * regression here is silent — the card simply reads "No message content" for
 * every message, which is what a 71-message thread looked like the moment the
 * budget landed.
 */

/**
 * @param body   The message's body, empty when the server deferred it.
 * @param fallback The provider's own snippet, sent in place of a deferred body.
 */
export function getMessagePreview(body: string[], fallback?: string): string {
  const preview = body
    .join(' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return preview || fallback?.trim() || 'No message content';
}
