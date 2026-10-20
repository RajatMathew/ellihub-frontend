/**
 * Search in the "Link email" and "Linked items" pickers of the task and event
 * modals.
 *
 * Typing a term showed the rows of the previous one, labelled "Results", for as
 * long as the request took — the newest inbox mail stayed on screen under
 * "audit". Two things fix it on this side: the heading says "Searching…" while
 * the rows on screen are not yet the answer to what is typed, and those rows
 * are narrowed here, immediately, by the same rule the server applies — every
 * word has to appear in one of the row's fields, in any order. The server's
 * answer then replaces them.
 */

export function pickerSearchWords(term: string): string[] {
  return [...new Set(term.trim().toLowerCase().split(/\s+/).filter(Boolean))];
}

/** Every word of `term` appears in at least one of `fields`. An empty term matches. */
export function matchesPickerSearch(
  fields: ReadonlyArray<string | null | undefined>,
  term: string
): boolean {
  const words = pickerSearchWords(term);
  if (words.length === 0) return true;
  const haystack = fields
    .filter((field): field is string => Boolean(field))
    .map((field) => field.toLowerCase());
  return words.every((word) => haystack.some((field) => field.includes(word)));
}

export type PickerSearchState = 'recent' | 'searching' | 'results';

/**
 * What the rows on screen are.
 *
 * `searching` whenever they do not yet answer the term in the box: the debounce
 * has not caught up, or the query is still showing the previous term's data.
 */
export function pickerSearchState({
  term,
  settledTerm,
  isPlaceholderData,
  isFetching,
}: {
  term: string;
  settledTerm: string;
  isPlaceholderData: boolean;
  isFetching: boolean;
}): PickerSearchState {
  const typed = term.trim();
  if (typed !== settledTerm.trim()) return 'searching';
  if (isPlaceholderData && isFetching) return 'searching';
  return typed ? 'results' : 'recent';
}

/**
 * The rows to show: the server's answer once it is in, and until then the rows
 * already on screen that match what is typed.
 */
export function pickerRowsFor<T>({
  rows,
  state,
  term,
  fieldsOf,
}: {
  rows: readonly T[];
  state: PickerSearchState;
  term: string;
  fieldsOf: (row: T) => ReadonlyArray<string | null | undefined>;
}): T[] {
  if (state !== 'searching') return [...rows];
  return rows.filter((row) => matchesPickerSearch(fieldsOf(row), term));
}
