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

/**
 * Where the quoted original starts inside a preview.
 *
 * The provider flattens the *whole* message, quote included, so a one-line
 * reply previews as its own words followed by the entire header block of what
 * it answers — 774 of 21353 cached messages (3.6%) carry a `From:`/`Sent:`/`To:`
 * run, and Outlook's own list shows none of it.
 *
 * Both patterns are far narrower than the HTML detector's equivalents, because
 * a flattened preview has lost every structural signal that one relies on —
 * no elements to classify, no line breaks to anchor to. What is left is word
 * order, so word order is what these demand.
 */

/**
 * A reply header block: `From:` then `Sent:`/`Date:` then `To:`/`Cc:`, **in that
 * order**.
 *
 * The ordering is the whole guard, and it is load-bearing. 3258 of the 3570
 * previews holding both `Sent:` and `Subject:` are read receipts — `Your
 * message To: Andy Ligas Subject: RE: Q593 Payments Sent: … was read` — where
 * the labels are not a quote but the entire content of the message. A rule
 * counting labels would blank every one of them. Receipts write To before
 * Subject before Sent and never write From, so requiring From→Sent→To matches
 * 0 of them.
 *
 * Localised labels are deliberately absent: `Von:`/`Gesendet:`, `De:`/`Enviado:`
 * and the French forms occur 0 times each in the corpus, and each alternation
 * is another way to clip an English message by accident.
 */
// The provider truncates `preview` to a fixed length, so the run can end on
// its last label with nothing after it — hence `(?=\s|$)` rather than `\s`,
// which missed two real messages that stopped exactly at `wrote:`.
const REPLY_HEADER_RUN = /\bfrom:\s.{0,200}?\b(?:sent|date):\s.{0,200}?\b(?:to|cc):(?=\s|$)/i;

/**
 * An attribution line, `On <date>, <sender> wrote:`.
 *
 * Requiring a weekday, month or digit straight after `On` is not decoration.
 * Without it the earliest match wins and ordinary prose supplies one: a real
 * preview reads `I clicked on it, it says "invalid link". On Wed, Sep 9 …
 * wrote:`, where `on it, it says…` reaches `wrote:` inside the window and
 * truncates the message to `I clicked`. A date token cannot be written by
 * accident in that position.
 */
const ATTRIBUTION_RUN =
  /\bon\s+(?:(?:mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s|\d{1,2}[\s/-])[\s\S]{0,200}?\bwrote:(?=\s|$)/i;

/**
 * Index the quoted original begins at, or `-1`.
 *
 * Earliest wins, so a message quoting a thread that itself quotes another is
 * cut at the outermost boundary rather than somewhere inside the history.
 */
function quoteStartIndex(text: string): number {
  const indexes = [REPLY_HEADER_RUN, ATTRIBUTION_RUN]
    .map((pattern) => text.search(pattern))
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

/**
 * `preview` with its horizontal rules removed, its quoted original dropped and
 * its whitespace flattened.
 */
export function cleanEmailPreview(preview: string | null | undefined): string {
  if (!preview) return '';

  const flattened = preview
    .replace(STANDALONE_RULE, '$1')
    // The preview is rendered as one truncated line, so the CR/LFs the
    // provider left in it are only ever whitespace; collapsing them
    // also closes the gap a removed rule leaves behind.
    .replace(/\s+/g, ' ')
    .trim();

  const quoteStart = quoteStartIndex(flattened);
  if (quoteStart < 0) return flattened;

  const written = flattened.slice(0, quoteStart).trim();

  // Nothing of the sender's above the quote: a bare forward, whose preview is
  // the only thing the row has to show. Returning '' would render an empty
  // line, which is worse than the header — the same call `markQuotedEmailContent`
  // makes when it refuses to collapse a body with no reply above the quote.
  return written || flattened;
}
