/**
 * Whether an open message's header stays pinned while its body scrolls
 * (elli-ui#1184), as the display settings store it (elli-ui#1298).
 *
 * Pinned is the default, so only an explicit `'false'` turns it off — an
 * absent key, or a value something else wrote there, keeps the header the
 * reader already had.
 */
export function parseStickyMessageHeader(stored: string | null): boolean {
  return stored !== 'false';
}
