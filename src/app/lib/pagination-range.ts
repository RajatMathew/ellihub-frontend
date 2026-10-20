/**
 * The "from – to of total" a list pager shows, 1-based.
 *
 * With nothing to show the range is 0 – 0: the pager used to say "1 - 0 of 0",
 * counting from a first row that does not exist.
 */
export function getPaginationRange(pageIndex: number, pageSize: number, recordCount: number) {
  if (recordCount <= 0) return { from: 0, to: 0 };

  return {
    from: pageIndex * pageSize + 1,
    to: Math.min((pageIndex + 1) * pageSize, recordCount),
  };
}
