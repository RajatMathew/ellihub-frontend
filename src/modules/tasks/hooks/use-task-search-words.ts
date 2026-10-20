import { createContext, useContext } from 'react';

/**
 * The words the board is searched for, so a card can mark them (elli-ui#1422).
 * A context rather than a prop: the card sits four components under the view
 * that owns the search, none of which otherwise care about it. Empty when no
 * search is active, which is also what a card outside the board gets.
 */
export const TaskSearchWordsContext = createContext<readonly string[]>([]);

export function useTaskSearchWords(): readonly string[] {
  return useContext(TaskSearchWordsContext);
}
