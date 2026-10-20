import { describe, expect, test } from 'bun:test';

import { ErrorBoundary } from '../src/app/components/error/error-boundary';

/**
 * The boundary's reset rule, exercised through the static method that owns it.
 *
 * The suite has no component renderer, but this is the part that regressed and
 * it is pure: `getDerivedStateFromProps` decides, from the incoming `resetKey`
 * and the current state, whether a caught error should be dropped. Rendering
 * would add nothing to what is asserted here.
 *
 * The bug it pins: with no reset the boundary latched. Something threw on one
 * page, and the fallback stayed on screen for every page the user visited
 * afterwards, because navigating re-rendered the children without clearing
 * `hasError`.
 */

const derive = (resetKey: string | undefined, state: Parameters<typeof deriveState>[1]) =>
  deriveState({ children: null, resetKey }, state);

// Typed alias so the test reads as a call rather than a cast.
const deriveState = ErrorBoundary.getDerivedStateFromProps.bind(ErrorBoundary) as (
  props: { children: null; resetKey?: string },
  state: { hasError: boolean; error: Error | null; resetKey?: string }
) => { hasError: boolean; error: Error | null; resetKey?: string } | null;

const caught = (resetKey?: string) => ({
  hasError: true,
  error: new Error('boom'),
  resetKey,
});

describe('a caught error is cleared when the location changes', () => {
  test('navigating away drops the error', () => {
    const next = derive('/app/invoices', caught('/app/projects'));

    expect(next).toEqual({ hasError: false, error: null, resetKey: '/app/invoices' });
  });

  test('the new key is recorded, so the next render is stable', () => {
    const next = derive('/app/invoices', caught('/app/projects'));
    const after = derive('/app/invoices', next!);

    expect(after).toBeNull();
  });
});

describe('an error is kept while the user is still on the page that threw', () => {
  test('the same key leaves state untouched', () => {
    expect(derive('/app/projects', caught('/app/projects'))).toBeNull();
  });

  test('a boundary with no key never resets on its own', () => {
    expect(derive(undefined, caught(undefined))).toBeNull();
  });
});

describe('a healthy boundary', () => {
  test('records a key change without inventing an error', () => {
    const next = derive('/app/invoices', {
      hasError: false,
      error: null,
      resetKey: '/app/projects',
    });

    expect(next).toEqual({ hasError: false, error: null, resetKey: '/app/invoices' });
  });
});
