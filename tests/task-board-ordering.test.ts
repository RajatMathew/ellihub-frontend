import { describe, expect, test } from 'bun:test';

import {
  arrivalIndex,
  boardArrangementSignature,
  dropBoardOrder,
  dropMovesTask,
  dropNeighbours,
  groupTasksByColumn,
  resolveDropIndex,
} from '../src/modules/tasks/lib/task-board';
import type { Task } from '../src/modules/tasks/schemas/task.schema';

// A Wednesday, so "this week" still has room after tomorrow.
const NOW = new Date('2026-09-02T09:00:00.000Z');
const TODAY = '2026-09-02T16:00:00.000Z';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Chase the certificate',
    description: null,
    priority: 'P3',
    status: 'OPEN',
    court: 'OURS',
    dueAt: TODAY,
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    boardOrder: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

/** The ids of a column, in the order the board would render them. */
function order(tasks: Task[], column: 'DUE_TODAY' | 'PENDING' = 'DUE_TODAY') {
  return groupTasksByColumn(tasks, NOW)[column].map((t) => t.id);
}

describe('the order cards sit in within a column', () => {
  test('two tasks of the same priority stack oldest first', () => {
    const first = task({ id: 'first', createdAt: '2026-09-01T09:00:00.000Z' });
    const second = task({ id: 'second', createdAt: '2026-09-01T09:05:00.000Z' });

    // Handed to the board newest-first, to prove the sort and not the input decides.
    expect(order([second, first])).toEqual(['first', 'second']);
  });

  test('priority outranks creation time', () => {
    const oldLow = task({ id: 'old-p3', priority: 'P3', createdAt: '2026-09-01T09:00:00.000Z' });
    const newHigh = task({ id: 'new-p1', priority: 'P1', createdAt: '2026-09-01T09:05:00.000Z' });

    expect(order([oldLow, newHigh])).toEqual(['new-p1', 'old-p3']);
  });

  test('a nearer due date does not jump a card ahead of an older one', () => {
    // Both land in Pending, where real due dates differ. Creation time still decides:
    // the board has one ordering rule, not one per column.
    const older = task({
      id: 'older',
      dueAt: '2026-10-30T09:00:00.000Z',
      createdAt: '2026-09-01T09:00:00.000Z',
    });
    const newer = task({
      id: 'newer',
      dueAt: '2026-09-10T09:00:00.000Z',
      createdAt: '2026-09-01T09:05:00.000Z',
    });

    expect(order([newer, older], 'PENDING')).toEqual(['older', 'newer']);
  });

  test('a hand-placed card sits where it was put, not where its age would put it', () => {
    const first = task({ id: 'first', createdAt: '2026-09-01T09:00:00.000Z' });
    const second = task({ id: 'second', createdAt: '2026-09-01T09:05:00.000Z' });
    const third = task({ id: 'third', createdAt: '2026-09-01T09:10:00.000Z' });

    // Dropped above `first`, which by age it would follow.
    const placed = task({
      id: 'placed',
      createdAt: '2026-09-01T09:20:00.000Z',
      boardOrder: new Date('2026-09-01T08:00:00.000Z').getTime(),
    });

    expect(order([first, second, third, placed])).toEqual(['placed', 'first', 'second', 'third']);
  });

  test('a hand-placed card still cannot outrank a higher priority', () => {
    const urgent = task({ id: 'urgent', priority: 'P1', createdAt: '2026-09-01T09:00:00.000Z' });
    const placed = task({
      id: 'placed',
      priority: 'P3',
      createdAt: '2026-09-01T09:05:00.000Z',
      boardOrder: 0,
    });

    expect(order([placed, urgent])).toEqual(['urgent', 'placed']);
  });
});

describe('where a dragged card is allowed to land', () => {
  // P1, P1, P3, P3 — two priority blocks, so there is somewhere illegal to aim.
  const column = [
    task({ id: 'a', priority: 'P1', createdAt: '2026-09-01T09:00:00.000Z' }),
    task({ id: 'b', priority: 'P1', createdAt: '2026-09-01T09:01:00.000Z' }),
    task({ id: 'c', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z' }),
    task({ id: 'd', priority: 'P3', createdAt: '2026-09-01T09:03:00.000Z' }),
  ];

  test('aiming above a higher priority stops at the top of the card own block', () => {
    // 'd' is P3; index 0 is above both P1s. Without 'd' the P3 block starts at 2.
    expect(resolveDropIndex(column, 'd', 0)).toBe(2);
  });

  test('aiming below a lower priority stops at the bottom of the card own block', () => {
    // 'a' is P1; index 3 is past both P3s. Without 'a' the P1 block ends at 1.
    expect(resolveDropIndex(column, 'a', 3)).toBe(1);
  });

  test('a legal slot is left alone', () => {
    // 'd' moving above 'c' is within the P3 block.
    expect(resolveDropIndex(column, 'd', 2)).toBe(2);
  });

  test('the only card of its priority has exactly one legal slot', () => {
    const lone = [
      task({ id: 'a', priority: 'P1' }),
      task({ id: 'solo', priority: 'P2' }),
      task({ id: 'c', priority: 'P3' }),
    ];

    expect(resolveDropIndex(lone, 'solo', 0)).toBe(1);
    expect(resolveDropIndex(lone, 'solo', 2)).toBe(1);
  });
});

describe('the neighbours a drop reports to the server', () => {
  const column = [
    task({ id: 'a', priority: 'P3', createdAt: '2026-09-01T09:00:00.000Z' }),
    task({ id: 'b', priority: 'P3', createdAt: '2026-09-01T09:01:00.000Z' }),
    task({ id: 'c', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z' }),
  ];

  test('a card dropped between two others names both', () => {
    // 'c' inserted at index 1 of [a, b] sits between them.
    expect(dropNeighbours(column, 'c', 1)).toEqual({ previousId: 'a', nextId: 'b' });
  });

  test('a card dropped at the top has no previous', () => {
    expect(dropNeighbours(column, 'c', 0)).toEqual({ previousId: null, nextId: 'a' });
  });

  test('a card dropped at the bottom has no next', () => {
    expect(dropNeighbours(column, 'a', 2)).toEqual({ previousId: 'c', nextId: null });
  });

  test('the only card of its priority has neither', () => {
    const lone = [task({ id: 'solo', priority: 'P2' })];
    expect(dropNeighbours(lone, 'solo', 0)).toEqual({ previousId: null, nextId: null });
  });
});

describe('what counts as a change of arrangement', () => {
  test('a hand-placed card changes the signature, so the board re-seeds', () => {
    const before = [task({ id: 'a' }), task({ id: 'b', boardOrder: null })];
    const after = [task({ id: 'a' }), task({ id: 'b', boardOrder: 1_700_000_000_000 })];

    expect(boardArrangementSignature(after)).not.toBe(boardArrangementSignature(before));
  });
});

// What the card should show the instant it is dropped, before the server has
// answered. It has to be the same number the server will settle on, or the card
// jumps a second time when the response lands.
describe('the position a drop shows immediately', () => {
  const MINUTE = 60_000;
  const at = (iso: string) => new Date(iso).getTime();

  const column = [
    task({ id: 'a', priority: 'P3', createdAt: '2026-09-01T09:00:00.000Z' }),
    task({ id: 'b', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z' }),
    task({ id: 'c', priority: 'P3', createdAt: '2026-09-01T09:04:00.000Z' }),
  ];

  test('between two cards it is halfway between them', () => {
    expect(dropBoardOrder(column, 'c', 1)).toBe(
      (at('2026-09-01T09:00:00.000Z') + at('2026-09-01T09:02:00.000Z')) / 2
    );
  });

  test('at the top it is a step above the card below', () => {
    expect(dropBoardOrder(column, 'c', 0)).toBe(at('2026-09-01T09:00:00.000Z') - MINUTE);
  });

  test('at the bottom it is a step below the card above', () => {
    expect(dropBoardOrder(column, 'a', 2)).toBe(at('2026-09-01T09:04:00.000Z') + MINUTE);
  });

  test('a hand-placed neighbour is measured by where it was put, not its age', () => {
    const placed = [
      task({ id: 'a', priority: 'P3', createdAt: '2026-09-01T09:00:00.000Z', boardOrder: 1000 }),
      task({ id: 'b', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z', boardOrder: 2000 }),
      task({ id: 'c', priority: 'P3', createdAt: '2026-09-01T09:04:00.000Z' }),
    ];

    expect(dropBoardOrder(placed, 'c', 1)).toBe(1500);
  });

  test('the only card of its priority has no position to take', () => {
    const lone = [task({ id: 'solo', priority: 'P2' })];
    expect(dropBoardOrder(lone, 'solo', 0)).toBeNull();
  });
});

// The bug this guards: the neighbours have to come from inside the card's own
// priority block. Clamping only the index is not enough — at the top of the P3s
// the card above is a P1, and naming it as the previous neighbour is a request
// the server rejects outright, so the drop silently did nothing.
describe('neighbours never reach outside the priority block', () => {
  const column = [
    task({ id: 'p1', priority: 'P1', createdAt: '2026-09-01T09:00:00.000Z' }),
    task({ id: 'x', priority: 'P3', createdAt: '2026-09-01T09:01:00.000Z' }),
    task({ id: 'y', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z' }),
    task({ id: 'p1-low', priority: 'P1', createdAt: '2026-09-01T09:03:00.000Z' }),
  ];

  test('at the top of the block there is no previous, not the card of another priority', () => {
    // 'y' to the top of the P3s: without it, others is [p1, x, p1-low] and the
    // P3 block starts at index 1 — so the card above the slot is the P1.
    const index = resolveDropIndex(column, 'y', 0);
    expect(dropNeighbours(column, 'y', index)).toEqual({ previousId: null, nextId: 'x' });
  });

  test('at the bottom of the block there is no next', () => {
    const index = resolveDropIndex(column, 'x', column.length);
    expect(dropNeighbours(column, 'x', index)).toEqual({ previousId: 'y', nextId: null });
  });

  test('the position shown matches, and does not measure a card of another priority', () => {
    const index = resolveDropIndex(column, 'y', 0);
    // A step above 'x', not halfway to the P1 sitting above it.
    expect(dropBoardOrder(column, 'y', index)).toBe(
      new Date('2026-09-01T09:01:00.000Z').getTime() - 60_000
    );
  });
});

// A drop that changes nothing should not promise that it will. Aiming a card at
// a slot it already occupies — which is what the clamp does to a P3 aimed above
// the P1s, when that P3 is already top of its block — draws a line and writes a
// position for a move that is not happening.
describe('a drop that would not move the card', () => {
  const column = [
    task({ id: 'p1', priority: 'P1', createdAt: '2026-09-01T09:00:00.000Z' }),
    task({ id: 'x', priority: 'P3', createdAt: '2026-09-01T09:01:00.000Z' }),
    task({ id: 'y', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z' }),
  ];

  test('a card clamped back to its own slot is recognised as staying put', () => {
    // 'x' is already top of the P3 block, so aiming it above the P1 resolves to
    // exactly where it is.
    const index = resolveDropIndex(column, 'x', 0);
    expect(dropMovesTask(column, 'x', index)).toBe(false);
  });

  test('a card aimed at a different slot does move', () => {
    const index = resolveDropIndex(column, 'x', 2);
    expect(dropMovesTask(column, 'x', index)).toBe(true);
  });

  test('the last card of a block dropped at the end stays put', () => {
    const index = resolveDropIndex(column, 'y', column.length);
    expect(dropMovesTask(column, 'y', index)).toBe(false);
  });
});

// Dragging a card into another column does not let you choose where it sits:
// the drop changes its due date, which clears any hand-placed position, so it
// takes its slot by priority and then by age. The indicator has to point at
// that slot rather than at the cursor, or it promises a place the card will not
// take.
describe('where a card arriving from another column lands', () => {
  const target = [
    task({ id: 'p1', priority: 'P1', createdAt: '2026-09-01T09:00:00.000Z' }),
    task({ id: 'p3-old', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z' }),
    task({ id: 'p3-new', priority: 'P3', createdAt: '2026-09-01T09:06:00.000Z' }),
  ];

  test('it slots in among its own priority, by age', () => {
    const arriving = task({ id: 'x', priority: 'P3', createdAt: '2026-09-01T09:04:00.000Z' });
    expect(arrivalIndex(target, arriving)).toBe(2);
  });

  test('a higher priority goes above everything below it', () => {
    const arriving = task({ id: 'x', priority: 'P1', createdAt: '2026-09-01T09:30:00.000Z' });
    expect(arrivalIndex(target, arriving)).toBe(1);
  });

  test('the oldest of its priority goes to the top of that block', () => {
    const arriving = task({ id: 'x', priority: 'P3', createdAt: '2026-09-01T09:01:00.000Z' });
    expect(arrivalIndex(target, arriving)).toBe(1);
  });

  test('an empty column takes it at the top', () => {
    expect(arrivalIndex([], task({ id: 'x' }))).toBe(0);
  });

  // A neighbour that someone placed by hand is measured by where it was put,
  // the same as anywhere else on the board.
  test('a hand-placed card in the target column is measured by its position', () => {
    const placed = [
      task({
        id: 'moved-to-bottom',
        priority: 'P3',
        createdAt: '2026-09-01T09:00:00.000Z',
        boardOrder: new Date('2026-09-01T23:00:00.000Z').getTime(),
      }),
    ];
    const arriving = task({ id: 'x', priority: 'P3', createdAt: '2026-09-01T10:00:00.000Z' });

    expect(arrivalIndex(placed, arriving)).toBe(0);
  });

  // While the drag is in flight the board may already have moved the card into
  // the column it is hovering. It must not be counted against itself.
  test('the arriving card is not counted if it is already listed', () => {
    const arriving = task({ id: 'x', priority: 'P3', createdAt: '2026-09-01T09:04:00.000Z' });
    expect(arrivalIndex([...target, arriving], arriving)).toBe(2);
  });
});

// Dragging a card into another column places it, the same as dragging within
// one: the slot follows the cursor, clamped to the card's own priority block.
// The card is not in the target column's list yet, so the clamp has to work for
// a card that is arriving rather than moving.
describe('choosing a slot in a column the card is arriving in', () => {
  const target = [
    task({ id: 'p1', priority: 'P1', createdAt: '2026-09-01T09:00:00.000Z' }),
    task({ id: 'p3-a', priority: 'P3', createdAt: '2026-09-01T09:02:00.000Z' }),
    task({ id: 'p3-b', priority: 'P3', createdAt: '2026-09-01T09:04:00.000Z' }),
  ];
  const arriving = task({ id: 'x', priority: 'P3', createdAt: '2026-09-01T09:06:00.000Z' });

  test('aiming above the P1 stops at the top of the P3 block', () => {
    expect(resolveDropIndex([...target, arriving], 'x', 0)).toBe(1);
  });

  test('a slot between the two P3s is kept', () => {
    expect(resolveDropIndex([...target, arriving], 'x', 2)).toBe(2);
  });

  test('the neighbours named are the two P3s it landed between', () => {
    const column = [...target, arriving];
    const index = resolveDropIndex(column, 'x', 2);
    expect(dropNeighbours(column, 'x', index)).toEqual({ previousId: 'p3-a', nextId: 'p3-b' });
  });

  test('the position shown is halfway between them', () => {
    const column = [...target, arriving];
    const index = resolveDropIndex(column, 'x', 2);
    expect(dropBoardOrder(column, 'x', index)).toBe(
      (new Date('2026-09-01T09:02:00.000Z').getTime() +
        new Date('2026-09-01T09:04:00.000Z').getTime()) /
        2
    );
  });
});
