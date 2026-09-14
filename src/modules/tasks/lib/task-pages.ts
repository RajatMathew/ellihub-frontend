import type { TaskPaginatedResponse } from '@/modules/tasks/schemas/task.schema';

/**
 * Collapse the pages the board fetched into the single list it works from.
 *
 * The board groups and orders client-side, so it has to hold every task at
 * once: with one page it was sorting whichever rows happened to arrive, and
 * cards past the page simply were not on the board. A card pushed off the page
 * by an edit looked like it had been deleted.
 *
 * The pagination it reports back describes the merged list rather than the
 * server's answer to the last request: one page, and a count of what is
 * actually here, because the header reads `totalItems` and the server's total
 * would print a number larger than the cards underneath it.
 *
 * Except when the walk stopped short. If the last page fetched still said
 * there was more, that is passed through as `hasNextPage` and the server's
 * total is kept, so a board past the cap can say it is showing a subset
 * rather than claiming the subset is everything.
 */
export function mergeTaskPages(pages: TaskPaginatedResponse[]): TaskPaginatedResponse {
  const data = pages.flatMap((page) => page.data);
  const last = pages.at(-1);
  const truncated = last?.pagination.hasNextPage ?? false;

  return {
    data,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: truncated ? (last?.pagination.totalItems ?? data.length) : data.length,
      hasNextPage: truncated,
      hasPreviousPage: false,
    },
  };
}
