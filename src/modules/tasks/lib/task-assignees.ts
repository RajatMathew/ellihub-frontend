import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';

import type { TaskAssigneeOption } from '../schemas/task.schema';

/**
 * The assignee list as picker options: filtered by the search, with whatever
 * the control already holds kept in the list even when the search would hide
 * it, so the control can always show its value.
 *
 * Type-only imports through the alias are fine for the bun test that runs
 * this: they are erased before bun resolves anything.
 */
export function assigneeOptions(
  people: readonly TaskAssigneeOption[],
  search = '',
  selectedOptions: readonly InfiniteSearchSelectOption[] = []
): InfiniteSearchSelectOption[] {
  const needle = search.trim().toLowerCase();
  const fromServer = people
    .filter((person) => !needle || person.name.toLowerCase().includes(needle))
    .map(toAssigneeOption);
  const known = new Set(fromServer.map((option) => option.value));
  const kept = selectedOptions.filter((option) => !known.has(option.value));
  return [...kept, ...fromServer];
}

export function toAssigneeOption(person: TaskAssigneeOption): InfiniteSearchSelectOption {
  return {
    value: person.id,
    label: person.name,
    description: person.email,
    badge: person.status === 'ON_LEAVE' ? 'On leave' : undefined,
  };
}
