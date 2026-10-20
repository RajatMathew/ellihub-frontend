/**
 * Highlighting the words of a search inside a piece of text — the yellow
 * `<mark>` the mail list draws on a search (`email-row-card`), shared so the
 * task board draws the same one (elli-ui#1422).
 *
 * Kept apart from the component so the splitting is a plain function: it is
 * the part with edge cases (overlaps, case, regex metacharacters), and the
 * part a test can reach.
 */

/** The look of a highlighted match. One definition, so mail and tasks agree. */
export const SEARCH_HIGHLIGHT_CLASS = 'rounded-xs bg-warning-soft text-warning-soft-foreground';

export interface HighlightPart {
  text: string;
  match: boolean;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * `text` cut into runs that do and do not match any of `words`, in order.
 * Case-insensitive, every occurrence of every word; overlapping or adjacent
 * matches merge into one run. Positions are taken from the original text, so
 * the runs always join back into it exactly.
 */
export function highlightParts(text: string, words: readonly string[]): HighlightPart[] {
  const marked = new Array<boolean>(text.length).fill(false);
  let any = false;
  for (const word of words) {
    if (!word) continue;
    for (const found of text.matchAll(new RegExp(escapeRegExp(word), 'gi'))) {
      const start = found.index ?? 0;
      for (let i = start; i < start + found[0].length; i++) marked[i] = true;
      any = true;
    }
  }
  if (!any) return text ? [{ text, match: false }] : [];

  const parts: HighlightPart[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marked[i] !== marked[start]) {
      parts.push({ text: text.slice(start, i), match: marked[start] });
      start = i;
    }
  }
  return parts;
}
