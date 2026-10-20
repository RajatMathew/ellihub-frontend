import { highlightParts, SEARCH_HIGHLIGHT_CLASS } from '@/app/lib/search-highlight';

/**
 * `text` with every word of a search marked in yellow, as the mail list marks
 * its matches. Plain text in, React nodes out — never HTML.
 */
export function SearchHighlight({ text, words }: { text: string; words: readonly string[] }) {
  if (words.length === 0) return text;
  const parts = highlightParts(text, words);
  if (!parts.some((part) => part.match)) return text;
  return parts.map((part, index) =>
    part.match ? (
      <mark key={index} className={SEARCH_HIGHLIGHT_CLASS}>
        {part.text}
      </mark>
    ) : (
      part.text
    )
  );
}
