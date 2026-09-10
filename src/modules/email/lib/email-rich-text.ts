import { escapeText, sanitizeEmailHtml } from './email-html-sanitize';

/**
 * The compose editor speaks HTML end to end: what the user pastes is what gets
 * stored on the draft and what the recipient receives. These helpers are the
 * three boundaries of that pipeline — clipboard in, draft out, draft back in.
 */

/** Providers reject a genuinely empty HTML body; this is the neutral stand-in. */
const EMPTY_EMAIL_HTML = '<div><br></div>';

/**
 * Clipboard HTML from Gmail, Outlook, Word or any web page. Structure and
 * presentation are kept; scripts, styles, remote-loading constructs and event
 * handlers are not.
 */
export function normalizePastedEmailHtml(html: string): string {
  return sanitizeEmailHtml(html);
}

/** Clipboard text — or a plain-text draft — rendered as the equivalent HTML. */
export function plainTextToPastedHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) =>
      escapeText(line)
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
        .replace(/(^ +| +$| {2,})/g, (spaces) => '&nbsp;'.repeat(spaces.length))
    )
    .join('<br>');
}

/**
 * Editor content on its way to `saveDraft`/`sendDraft` with `bodyType: 'html'`.
 * Sanitizing again here means a draft can never be persisted with markup the
 * editor would have refused, and bare URLs the user typed become links the way
 * they did when the body was plain text.
 */
export function richTextToEmailHtml(html: string): string {
  const sanitized = sanitizeEmailHtml(html, { linkifyText: true });
  return isEmptyEmailHtml(sanitized) ? EMPTY_EMAIL_HTML : sanitized;
}

/**
 * A saved draft's body on its way back into the editor. Provider bodies are
 * arbitrary HTML — a draft can be created in Outlook and edited here — so it goes
 * through the same allowlist before it is put into a contenteditable.
 */
export function emailDraftBodyToEditorHtml(body: string | readonly string[] | undefined): string {
  const parts = (Array.isArray(body) ? body : [body]).filter(
    (part): part is string => typeof part === 'string' && part.length > 0
  );
  const joined = parts.join('\n');
  if (!joined.trim()) return '';

  const editorHtml = looksLikeHtml(joined)
    ? sanitizeEmailHtml(joined)
    : plainTextToPastedHtml(joined);
  return isEmptyEmailHtml(editorHtml) ? '' : editorHtml;
}

/**
 * A contenteditable is never truly empty — browsers leave `<br>`, `<div><br></div>`
 * or a non-breaking space behind — so "has the user written anything" cannot be a
 * string-length check.
 */
export function isEmptyEmailHtml(html: string): boolean {
  if (!html) return true;
  if (/<(img|table|hr|blockquote|ul|ol)\b/i.test(html)) return false;

  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[\u00a0\u200b-\u200d\ufeff]/g, '');
  return text.trim().length === 0;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
