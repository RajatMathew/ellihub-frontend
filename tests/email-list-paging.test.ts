import { describe, expect, test } from 'bun:test';

import { isMarkerOnScreen, shouldLoadNextPage } from '../src/modules/email/lib/email-list-paging';

/**
 * When the mail list asks for its next page. It used to ask only when the
 * load-more marker crossed into view of the list's own box, which on phones
 * left it stuck on the first page.
 */

const idle = { hasNextPage: true, isLoadingMore: false, loadMoreError: false, hidden: false };

describe('the load-more marker', () => {
  const list = { top: 200, bottom: 800 };
  const viewport = { top: 0, bottom: 844 };

  test('is on screen when it overlaps the list and the viewport', () => {
    expect(isMarkerOnScreen({ top: 700, bottom: 764 }, [list, viewport])).toBe(true);
  });

  test('is not on screen below the end of the list box', () => {
    expect(isMarkerOnScreen({ top: 820, bottom: 884 }, [list, viewport])).toBe(false);
  });

  test('is not on screen below the viewport, even inside a list box taller than it', () => {
    // Where an outer element scrolls instead, the list box is as tall as its
    // content and always "contains" the marker — the viewport is what decides.
    const tallList = { top: 200, bottom: 4000 };

    expect(isMarkerOnScreen({ top: 3900, bottom: 3964 }, [tallList, viewport])).toBe(false);
    expect(isMarkerOnScreen({ top: 780, bottom: 844 }, [tallList, viewport])).toBe(true);
  });

  test('takes up no room before it has rendered', () => {
    expect(isMarkerOnScreen({ top: 500, bottom: 500 }, [list, viewport])).toBe(false);
  });
});

describe('asking for the next page', () => {
  test('happens whenever the marker is on screen and nothing is in flight', () => {
    // Not only when it crosses in: a page that lands without pushing it back
    // off screen must still lead to the next one.
    expect(shouldLoadNextPage(idle, true)).toBe(true);
  });

  test('waits while a page is loading', () => {
    expect(shouldLoadNextPage({ ...idle, isLoadingMore: true }, true)).toBe(false);
  });

  test('stops after a failed page, until the reader asks again', () => {
    expect(shouldLoadNextPage({ ...idle, loadMoreError: true }, true)).toBe(false);
  });

  test('stops at the last page', () => {
    expect(shouldLoadNextPage({ ...idle, hasNextPage: false }, true)).toBe(false);
  });

  test('does not happen behind the reading view on a phone', () => {
    expect(shouldLoadNextPage({ ...idle, hidden: true }, true)).toBe(false);
  });

  test('does not happen with the marker off screen', () => {
    expect(shouldLoadNextPage(idle, false)).toBe(false);
  });
});
