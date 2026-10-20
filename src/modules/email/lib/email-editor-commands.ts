import { isSafeEmailUrl } from './email-html-policy';

/**
 * The formatting the composer's toolbar can apply, and the decisions behind
 * each one that are worth testing without a browser.
 *
 * The commands themselves are `document.execCommand`, which is the only
 * formatting API a contenteditable has in every browser we ship to. Deprecated,
 * but it is what keeps the body arbitrary HTML rather than an editor's private
 * document model — see the note at the top of `email-rich-text-editor.tsx`.
 */

/** Commands `queryCommandState` can report an on/off state for. */
export type EmailEditorToggle =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikeThrough'
  | 'insertUnorderedList'
  | 'insertOrderedList';

export const EMAIL_EDITOR_TOGGLES: readonly EmailEditorToggle[] = [
  'bold',
  'italic',
  'underline',
  'strikeThrough',
  'insertUnorderedList',
  'insertOrderedList',
];

/**
 * What a typed link should become, or null if it must not be linked.
 *
 * Two jobs. A bare `elli.com` is what people actually type, and without a
 * scheme `createLink` writes a relative href that resolves against the app's
 * own origin — the recipient gets a link to our mailbox. And a
 * `javascript:` URL typed into the box would otherwise be written straight
 * into the message, so the same allowlist the sanitizer uses decides here too,
 * before the link is ever created rather than after.
 */
export function toLinkHref(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Only an explicit scheme is taken as written. A protocol-relative `//host`
  // gets one too: the sanitizer refuses those, so linking one would produce a
  // link that is stripped back out on the way to the provider.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme
    ? trimmed
    : `https://${trimmed.startsWith('//') ? trimmed.slice(2) : trimmed}`;

  return isSafeEmailUrl(candidate) ? candidate : null;
}
