import { beforeEach, describe, expect, test } from 'bun:test';

import { closeRowSwipe, openRowSwipe } from '../src/modules/email/lib/email-row-swipe-registry';

/**
 * elli-ui#1073: only one email row's swipe drawer stays open at a time, the
 * way Mail and Gmail behave. The registry is a module-level singleton, so
 * each test opens and closes the rows it used rather than relying on order.
 */
describe('email row swipe registry', () => {
  let closedA = false;
  let closedB = false;

  beforeEach(() => {
    closedA = false;
    closedB = false;
  });

  test('opening a second row closes the first', () => {
    openRowSwipe('row-a', () => {
      closedA = true;
    });
    expect(closedA).toBe(false);

    openRowSwipe('row-b', () => {
      closedB = true;
    });
    expect(closedA).toBe(true);
    expect(closedB).toBe(false);

    closeRowSwipe('row-b');
  });

  test('re-opening the same row does not call its own close', () => {
    openRowSwipe('row-a', () => {
      closedA = true;
    });
    openRowSwipe('row-a', () => {
      closedA = true;
    });
    expect(closedA).toBe(false);

    closeRowSwipe('row-a');
  });

  test('closing a row that is not the current one is a no-op', () => {
    openRowSwipe('row-a', () => {
      closedA = true;
    });
    closeRowSwipe('row-b');
    expect(closedA).toBe(false);

    closeRowSwipe('row-a');
  });

  test('closing the current row lets the next open call proceed without firing a stale close', () => {
    openRowSwipe('row-a', () => {
      closedA = true;
    });
    closeRowSwipe('row-a');

    openRowSwipe('row-b', () => {
      closedB = true;
    });
    expect(closedA).toBe(false);
    expect(closedB).toBe(false);

    closeRowSwipe('row-b');
  });
});
