import { isEmptyEmailBody } from './email-signature';

/**
 * Whether the inline reply composer is holding anything worth keeping.
 *
 * Escape closes the composer (elli-ui#1092), and closing it drops the draft —
 * the card holds its body, its files and its recipients in component state and
 * reopening starts blank. On an untouched composer that is exactly what the
 * reader wants; on one they have typed into, a stray Escape would take the
 * work with it, so that case asks first.
 *
 * `seedTo` is what the composer opened with: a reply already knows who it is
 * answering, so the field being filled in is not the reader having typed
 * anything. A forward opens empty and every address in it was typed.
 *
 * Relative imports on purpose: exercised by bun tests, and bun does not
 * resolve the `@/` alias.
 */
export function replyDraftHasContent({
  body,
  attachmentCount,
  to,
  cc,
  bcc,
  seedTo,
}: {
  /** Rich-text HTML, which is never empty-string once the editor has run. */
  body: string;
  attachmentCount: number;
  to: string;
  cc: string;
  bcc: string;
  /** The recipient the composer opened with, if any. */
  seedTo: string;
}): boolean {
  // The signature the composer opened with is not something the reader wrote.
  if (!isEmptyEmailBody(body)) return true;
  if (attachmentCount > 0) return true;
  if (to.trim() !== seedTo.trim()) return true;

  return cc.trim().length > 0 || bcc.trim().length > 0;
}
