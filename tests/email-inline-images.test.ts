import { describe, expect, test } from 'bun:test';

import { loadInlineEmailImageData } from '../src/modules/email/lib/email-attachments';

/**
 * Inline images in a signature loaded slowly, and one of them never loaded at
 * all.
 *
 * Two separate faults, both measured against the "Invoice # 1177782" thread on
 * `procurement@ellicorp.com`, whose signature carries five inline images:
 *
 *   - Each image is a provider round trip (355-466ms apiece) and they were
 *     fetched one after another, so the signature took 2.35s to finish drawing.
 *   - The shared cache remembered failures. Under StrictMode the first mount
 *     starts a fetch, cleanup aborts it, the abort becomes `null`, and that
 *     `null` is cached for the session — so the remount gives up. Because the
 *     fetches ran in sequence exactly one was in flight when the abort landed,
 *     and it was always the first: the first inline image of every HTML message
 *     rendered permanently broken. Toggling StrictMode alone moved it from 4 of
 *     5 images to 5 of 5.
 *
 * `fetch` is stubbed per test, and each test uses its own URLs because the
 * cache is module-level and deliberately outlives a single caller.
 */

const PNG = new Uint8Array([137, 80, 78, 71]);

function stubFetch(handler: (url: string) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL) =>
    handler(String(input))) as typeof globalThis.fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const ok = () => new Response(PNG, { status: 200, headers: { 'Content-Type': 'image/png' } });

describe('loadInlineEmailImageData', () => {
  test('retries an image whose first attempt failed', () => {
    // The regression: a cached failure is indistinguishable from an image that
    // does not exist, and nothing short of reloading the tab asks again.
    let attempt = 0;
    const restore = stubFetch(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('aborted');
      return ok();
    });

    const sources = new Map([['retry-cid', '/api/v1/attachments/retry']]);

    return loadInlineEmailImageData(sources)
      .then((first) => {
        expect(first.size).toBe(0);
        return loadInlineEmailImageData(sources);
      })
      .then((second) => {
        expect(second.get('retry-cid')).toStartWith('data:');
        expect(attempt).toBe(2);
      })
      .finally(restore);
  });

  test('keeps a success cached, so a remount costs no second request', () => {
    let calls = 0;
    const restore = stubFetch(async () => {
      calls += 1;
      return ok();
    });

    const sources = new Map([['hit-cid', '/api/v1/attachments/hit']]);

    return loadInlineEmailImageData(sources)
      .then(() => loadInlineEmailImageData(sources))
      .then((second) => {
        expect(second.get('hit-cid')).toStartWith('data:');
        expect(calls).toBe(1);
      })
      .finally(restore);
  });

  test('fetches several images at once rather than one after another', async () => {
    // Six sequential round trips were 2.35s. What is pinned here is only that
    // they overlap: a sequential implementation never has two in flight.
    let inFlight = 0;
    let peak = 0;
    const restore = stubFetch(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return ok();
    });

    const sources = new Map(
      Array.from({ length: 6 }, (_, index) => [`par-${index}`, `/api/v1/attachments/par-${index}`])
    );

    try {
      const resolved = await loadInlineEmailImageData(sources);
      expect(resolved.size).toBe(6);
      expect(peak).toBeGreaterThan(1);
    } finally {
      restore();
    }
  });

  test('stops starting work once the caller has navigated away', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const restore = stubFetch(async () => {
      calls += 1;
      return ok();
    });

    try {
      const resolved = await loadInlineEmailImageData(
        new Map([['gone-cid', '/api/v1/attachments/gone']]),
        controller.signal
      );
      expect(resolved.size).toBe(0);
      expect(calls).toBe(0);
    } finally {
      restore();
    }
  });

  test('an empty set asks for nothing', async () => {
    const restore = stubFetch(async () => {
      throw new Error('should not fetch');
    });
    try {
      expect((await loadInlineEmailImageData(new Map())).size).toBe(0);
    } finally {
      restore();
    }
  });
});
