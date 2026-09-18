import { describe, expect, test } from 'bun:test';

import { assigneeOptions } from '../src/modules/tasks/lib/task-assignees';

const people = [
  { id: 'a', name: 'Alejandra C.', email: 'a@x.com', status: 'ACTIVE' as const },
  { id: 'j', name: 'Juan M.', email: 'j@x.com', status: 'ON_LEAVE' as const },
  { id: 'l', name: 'Lucas C.', email: 'l@x.com', status: 'ACTIVE' as const },
];

// The pickers used to page the HR list with a server search; this list is
// small and comes whole, so the search is done here. #964.
describe('the assignee picker options', () => {
  test('every person is listed, by the order they came', () => {
    expect(assigneeOptions(people).map((o) => o.value)).toEqual(['a', 'j', 'l']);
  });

  test('the search narrows by name, case-insensitively', () => {
    expect(assigneeOptions(people, 'c.').map((o) => o.label)).toEqual(['Alejandra C.', 'Lucas C.']);
    expect(assigneeOptions(people, 'JUAN').map((o) => o.label)).toEqual(['Juan M.']);
  });

  test('someone on leave is marked, not hidden', () => {
    const juan = assigneeOptions(people).find((o) => o.value === 'j');
    expect(juan).toMatchObject({ badge: 'On leave' });
    expect(juan?.disabled).toBeUndefined();
  });

  test('the selected one stays listed when the search would hide it', () => {
    const selected = { value: 'j', label: 'Juan M.' };
    const shown = assigneeOptions(people, 'lucas', [selected]).map((o) => o.value);
    expect(shown).toEqual(['j', 'l']);
  });

  test('the selected one is not listed twice when the search keeps it', () => {
    const selected = { value: 'j', label: 'Juan M.' };
    expect(assigneeOptions(people, 'juan', [selected]).map((o) => o.value)).toEqual(['j']);
  });
});
