import { describe, expect, test } from 'bun:test';

import type { SuggestedAction } from '../src/mock/agent-suggestions';
import { resolveThreadSuggestions, shouldAskLive } from '../src/mock/thread-suggestions-state';

/**
 * elli-ui#1481 — the agent panel's suggestions appeared only after the panel had loaded the
 * thread's body and then asked the model. Suggestions kept for the message now show the moment
 * they arrive, and the model is asked only when nothing is kept.
 */

const createPo = [{ key: 'create_po', reason: 'PO #26851 issued' }] as unknown as SuggestedAction[];
const idleLive = { enabled: false, settled: false, failed: false, items: null };

describe('what the panel shows', () => {
  test('a kept answer shows at once, before the body has loaded', () => {
    expect(
      resolveThreadSuggestions({
        hasThread: true,
        stored: { settled: true, items: createPo },
        live: idleLive,
      })
    ).toEqual({ status: 'ready', items: createPo });
  });

  test('a kept empty answer is "nothing fits", not a wait', () => {
    expect(
      resolveThreadSuggestions({
        hasThread: true,
        stored: { settled: true, items: [] },
        live: idleLive,
      })
    ).toEqual({ status: 'ready', items: [] });
  });

  test('loading while the kept answer is still on its way', () => {
    expect(
      resolveThreadSuggestions({
        hasThread: true,
        stored: { settled: false, items: null },
        live: idleLive,
      })
    ).toEqual({ status: 'loading' });
  });

  test('with nothing kept, the model’s answer once it comes', () => {
    expect(
      resolveThreadSuggestions({
        hasThread: true,
        stored: { settled: true, items: null },
        live: { enabled: true, settled: true, failed: false, items: createPo },
      })
    ).toEqual({ status: 'ready', items: createPo });
  });

  test('a failed model call is no suggestions, not an endless spinner', () => {
    expect(
      resolveThreadSuggestions({
        hasThread: true,
        stored: { settled: true, items: null },
        live: { enabled: true, settled: true, failed: true, items: null },
      })
    ).toEqual({ status: 'ready', items: [] });
  });

  test('no thread in context is idle', () => {
    expect(
      resolveThreadSuggestions({
        hasThread: false,
        stored: { settled: true, items: createPo },
        live: idleLive,
      })
    ).toEqual({ status: 'idle' });
  });
});

describe('when the model is asked', () => {
  test('never when an answer is kept', () => {
    expect(
      shouldAskLive({
        hasThread: true,
        bodyLoaded: true,
        stored: { settled: true, items: createPo },
      })
    ).toBe(false);
  });

  test('not before the kept answer is known, so a kept one is never asked again', () => {
    expect(
      shouldAskLive({ hasThread: true, bodyLoaded: true, stored: { settled: false, items: null } })
    ).toBe(false);
  });

  test('once nothing is kept and the body is ready', () => {
    expect(
      shouldAskLive({ hasThread: true, bodyLoaded: true, stored: { settled: true, items: null } })
    ).toBe(true);
    expect(
      shouldAskLive({ hasThread: true, bodyLoaded: false, stored: { settled: true, items: null } })
    ).toBe(false);
  });
});
