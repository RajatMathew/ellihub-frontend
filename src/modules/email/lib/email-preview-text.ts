/**
 * The one-line preview under a subject in the mailbox list.
 *
 * Providers build `preview` by flattening the message to plain text, which
 * turns every horizontal rule in the original into the characters that drew
 * it. Newsletters rule off their masthead, and Outlook puts a rule above the
 * quoted chain when you reply, so the row rendered as
 *
 *     Daily September 15, 2026 ____________
 *
 * where Outlook's own list shows just `Daily September 15, 2026`. It is the
 * single most common piece of noise in the list: 909 of 17988 cached messages
 * carry an underscore run, 47 an asterisk run, 41 a hyphen run.
 *
 * A rule is only stripped when it stands on its own. Runs that sit inside text
 * are load-bearing — one real message previews as `IP:112.***.***.163`, where
 * the asterisks are a masked address rather than a line — so the boundary check
 * is what separates decoration from content.
 */

/**
 * A run of three or more rule characters, bounded by whitespace or by the ends
 * of the string. The leading boundary is captured rather than looked behind so
 * this stays a plain ES2018 regex.
 */
const STANDALONE_RULE = /(^|\s)[_\-=~*]{3,}(?=\s|$)/g;

/** `preview` with its horizontal rules removed and its whitespace flattened. */
export function cleanEmailPreview(preview: string | null | undefined): string {
  if (!preview) return '';

  return (
    preview
      .replace(STANDALONE_RULE, '$1')
      // The preview is rendered as one truncated line, so the CR/LFs the
      // provider left in it are only ever whitespace; collapsing them
      // also closes the gap a removed rule leaves behind.
      .replace(/\s+/g, ' ')
      .trim()
  );
}
