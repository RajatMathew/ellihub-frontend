import { isValidElement, type ReactNode } from 'react';

import { describe, expect, test } from 'bun:test';

import { withDropIndicator } from '../src/modules/tasks/lib/drop-indicator';

/**
 * The cards the board hands the column, standing in for the real ones. Only
 * their identity matters here, which is the whole point of these tests.
 */
const cardA = { id: 'a' } as unknown as ReactNode;
const cardB = { id: 'b' } as unknown as ReactNode;
const cardC = { id: 'c' } as unknown as ReactNode;

function asArray(value: ReactNode): ReactNode[] {
  expect(Array.isArray(value)).toBe(true);
  return value as ReactNode[];
}

describe('inserting the drop indicator among the cards', () => {
  // The bug this exists for: React.Children.toArray rewrites every key
  // ('a' -> '.$a') and returns clones, so the instant the indicator appeared
  // every card in the column unmounted and remounted. Mid-drag that pulls the
  // node dnd-kit is dragging out from under it, and the re-registration that
  // follows re-renders and remounts again — "Maximum update depth exceeded",
  // and the error boundary swallowing the board.
  test('the cards either side are the very same elements, not copies', () => {
    const out = asArray(withDropIndicator([cardA, cardB, cardC], 1));

    expect(out[0]).toBe(cardA);
    expect(out[2]).toBe(cardB);
    expect(out[3]).toBe(cardC);
  });

  test('the indicator goes in at the slot, and nothing else is added or lost', () => {
    const out = asArray(withDropIndicator([cardA, cardB], 1));

    expect(out).toHaveLength(3);
    expect(isValidElement(out[1])).toBe(true);
  });

  test('a slot at the end appends rather than dropping a card', () => {
    const out = asArray(withDropIndicator([cardA, cardB], 2));

    expect(out[0]).toBe(cardA);
    expect(out[1]).toBe(cardB);
    expect(isValidElement(out[2])).toBe(true);
  });

  test('no slot leaves the cards exactly as they came in', () => {
    const children = [cardA, cardB];
    expect(withDropIndicator(children, null)).toBe(children);
  });

  test('a slot outside the list leaves the cards alone', () => {
    const children = [cardA, cardB];
    expect(withDropIndicator(children, 9)).toBe(children);
  });
});
