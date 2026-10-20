import { TASK_COLUMNS } from '@/modules/tasks/lib/task-board';
import type { Task, TaskBoard, TaskEmailReference } from '@/modules/tasks/schemas/task.schema';

/**
 * Searching the task board (elli-ui#1380). The server is the authority — it
 * sees past each column's cap — but asking it takes a round trip, so the board
 * already on screen is filtered by the same rule while the reader types, and
 * the server's answer replaces it when it lands.
 */

/** The server's own cap: words past the eighth are ignored on both sides. */
const MAX_WORDS = 8;

/** The words of a search, lower-cased; empty for blank text. */
export function searchWords(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
}

/** The fields a search reads. References are optional: an optimistic row may not carry them. */
export type SearchableTask = Pick<Task, 'title' | 'description'> & {
  emailReferences?: ReadonlyArray<Pick<TaskEmailReference, 'subject'>>;
};

/**
 * Every word in the title, the description or the subject of an email the
 * task was raised from (elli-ui#1422) — the server's `boardSearchSql`. Each
 * word may be found in a different place, as there.
 */
export function taskMatchesSearch(task: SearchableTask, words: readonly string[]) {
  if (words.length === 0) return true;
  const title = task.title.toLowerCase();
  const description = (task.description ?? '').toLowerCase();
  const subjects = (task.emailReferences ?? []).map((ref) => (ref.subject ?? '').toLowerCase());
  return words.every(
    (word) =>
      title.includes(word) ||
      description.includes(word) ||
      subjects.some((subject) => subject.includes(word))
  );
}

/**
 * The task's email references with the ones whose subject matches the search
 * first (elli-ui#1422). The card shows only the first source, so a task found
 * by the subject of its second email would otherwise hide why it was found.
 * Stable, and the same array back when nothing needs to move.
 */
export function referencesForSearch<T extends Pick<TaskEmailReference, 'subject'>>(
  references: T[],
  words: readonly string[]
): T[] {
  if (words.length === 0 || references.length < 2) return references;
  const matches = (ref: T) => {
    const subject = (ref.subject ?? '').toLowerCase();
    return words.some((word) => subject.includes(word));
  };
  const first = references.filter(matches);
  if (first.length === 0 || first.length === references.length) return references;
  if (references.slice(0, first.length).every(matches)) return references;
  return [...first, ...references.filter((ref) => !matches(ref))];
}

/**
 * The board narrowed to a search. Every card is checked — an optimistic one
 * added on top of the server's answer must match too — but the totals stay
 * the server's when `exact`, i.e. it answered this very search and so counted
 * past each column's cap. Otherwise a total is what the column now shows.
 */
export function searchBoard(board: TaskBoard, search: string, exact: boolean): TaskBoard {
  const words = searchWords(search);
  if (words.length === 0) return board;
  const columns = { ...board.columns };
  for (const id of TASK_COLUMNS) {
    const tasks = board.columns[id].tasks.filter((task) => taskMatchesSearch(task, words));
    columns[id] = { tasks, total: exact ? board.columns[id].total : tasks.length };
  }
  return { ...board, columns };
}
