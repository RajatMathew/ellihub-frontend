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
 * server's answer to the last request — one page, nothing further to fetch, and
 * a count of what is actually here. The count matters: the header reads
 * `totalItems`, so passing the server's total through would print a number
 * larger than the cards underneath it.
 */
export function mergeTaskPages(pages: TaskPaginatedResponse[]): TaskPaginatedResponse {
  const data = pages.flatMap((page) => page.data);

  return {
    data,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: data.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}
