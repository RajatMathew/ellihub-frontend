import { describe, expect, test } from 'bun:test';

import { loadInlineEmailImageData } from '../src/modules/email/lib/email-attachments';

/**
 * Inline images in a signature loaded slowly, one of them never loaded at all,
 * and then the whole set waited for its slowest member.
 *
 * Three faults over time, all measured against the "Invoice # 1177782" thread
 * on `procurement@ellicorp.com`, whose signature carries five inline images:
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
 *   - The loader then resolved one `Map` at the end, so nothing was drawn until
 *     every image had arrived. On an account the provider was rate-limiting
 *     that meant a signature of empty boxes for over a minute, and then all of
 *     it at once. Images are handed over one at a time now, and the number in
 *     flight is capped across the whole page rather than per open message.
 *
 * `fetch` is stubbed per test, and each test uses its own URLs because the
 * cache is module-level and deliberately outlives a single caller. A test that
 * parks a request must answer it before it ends, or it holds one of the shared
 * slots for the rest of the file.
 */

const PNG = new Uint8Array([137, 80, 78, 71]);

/** Bun has no `FileReader`; the loader uses one to turn a blob into a data URI. */
class TestFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: unknown = null;

  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
      this.onload?.();
    });
  }
}

function stubFetch(handler: (url: string) => Promise<Response>) {
  const originalFetch = globalThis.fetch;
  const hadReader = 'FileReader' in globalThis;
  globalThis.fetch = ((input: RequestInfo | URL) =>
    handler(String(input))) as typeof globalThis.fetch;
  if (!hadReader) (globalThis as { FileReader?: unknown }).FileReader = TestFileReader;
  return () => {
    globalThis.fetch = originalFetch;
    if (!hadReader) delete (globalThis as { FileReader?: unknown }).FileReader;
  };
}

const ok = () => new Response(PNG, { status: 200, headers: { 'Content-Type': 'image/png' } });

/** Collects what the loader hands over, in the order it hands it over. */
function collector() {
  const delivered: Array<[string, string]> = [];
  const collect = (contentId: string, dataUrl: string) => {
    delivered.push([contentId, dataUrl]);
  };
  return {
    collect,
    ids: () => delivered.map(([contentId]) => contentId),
    get: (contentId: string) => delivered.find(([id]) => id === contentId)?.[1],
    get size() {
      return delivered.length;
    },
  };
}

/** Lets the loader's fetch → blob → reader → deliver chain settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('loadInlineEmailImageData', () => {
  test('hands over each image as it resolves, without waiting for the slow one', async () => {
    // The regression. The first image asked for is the one that does not answer
    // until the end; before the fix nothing reached the frame until it did.
    let answerSlow: (() => void) | null = null;
    const restore = stubFetch(async (url) => {
      if (!url.includes('slow')) return ok();
      await new Promise<void>((resolve) => {
        answerSlow = resolve;
      });
      return ok();
    });
    const received = collector();

    try {
      const load = loadInlineEmailImageData(
        new Map([
          ['stream-slow', '/api/v1/attachments/stream-slow'],
          ['stream-quick', '/api/v1/attachments/stream-quick'],
        ]),
        received.collect
      );
      await settle();

      expect(received.ids()).toEqual(['stream-quick']);

      answerSlow?.();
      await load;
      expect(received.ids()).toEqual(['stream-quick', 'stream-slow']);
    } finally {
      answerSlow?.();
      restore();
    }
  });

  test('never has more than four requests in flight at once, across every caller', async () => {
    // Each of these is a live call through to the mail provider, and the
    // provider rate-limits. Two open messages used to get four each.
    let inFlight = 0;
    let peak = 0;
    let started = 0;
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const restore = stubFetch(async () => {
      started += 1;
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await gate;
      inFlight -= 1;
      return ok();
    });

    const five = (prefix: string) =>
      new Map(
        Array.from({ length: 5 }, (_, index) => [
          `${prefix}-${index}`,
          `/api/v1/attachments/${prefix}-${index}`,
        ])
      );

    try {
      const loads = Promise.all([
        loadInlineEmailImageData(five('capA'), () => {}),
        loadInlineEmailImageData(five('capB'), () => {}),
      ]);
      await settle();

      // Two callers, ten images, and still only four requests out.
      expect(started).toBe(4);

      release?.();
      await loads;
      expect(peak).toBeLessThanOrEqual(4);
      expect(started).toBe(10);
    } finally {
      release?.();
      restore();
    }
  });

  test('retries an image whose first attempt failed', async () => {
    // A cached failure is indistinguishable from an image that does not exist,
    // and nothing short of reloading the tab asks again.
    let attempt = 0;
    const restore = stubFetch(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('aborted');
      return ok();
    });
    const sources = new Map([['retry-cid', '/api/v1/attachments/retry']]);

    try {
      const first = collector();
      await loadInlineEmailImageData(sources, first.collect);
      expect(first.size).toBe(0);

      const second = collector();
      await loadInlineEmailImageData(sources, second.collect);
      expect(second.get('retry-cid')).toStartWith('data:');
      expect(attempt).toBe(2);
    } finally {
      restore();
    }
  });

  test('keeps a success cached, so a remount costs no second request', async () => {
    let calls = 0;
    const restore = stubFetch(async () => {
      calls += 1;
      return ok();
    });
    const sources = new Map([['hit-cid', '/api/v1/attachments/hit']]);

    try {
      await loadInlineEmailImageData(sources, () => {});
      const second = collector();
      await loadInlineEmailImageData(sources, second.collect);
      expect(second.get('hit-cid')).toStartWith('data:');
      expect(calls).toBe(1);
    } finally {
      restore();
    }
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
      const received = collector();
      await loadInlineEmailImageData(sources, received.collect);
      expect(received.size).toBe(6);
      expect(peak).toBeGreaterThan(1);
    } finally {
      restore();
    }
  });

  test('a content id and a filename pointing at one attachment share a single fetch', async () => {
    let calls = 0;
    const restore = stubFetch(async () => {
      calls += 1;
      return ok();
    });

    try {
      const received = collector();
      await loadInlineEmailImageData(
        new Map([
          ['logo@cid', '/api/v1/attachments/one-logo'],
          ['logo.png', '/api/v1/attachments/one-logo'],
        ]),
        received.collect
      );
      expect(calls).toBe(1);
      expect(received.ids().sort()).toEqual(['logo.png', 'logo@cid']);
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
      const received = collector();
      await loadInlineEmailImageData(
        new Map([['gone-cid', '/api/v1/attachments/gone']]),
        received.collect,
        controller.signal
      );
      expect(received.size).toBe(0);
      expect(calls).toBe(0);
    } finally {
      restore();
    }
  });

  test('delivers nothing into a frame the reader has already left', async () => {
    // Aborting mid-flight is the ordinary case: the fetch is deliberately left
    // to finish, because it warms the cache a remount reads — but its result
    // must not be posted into a frame that is gone.
    const controller = new AbortController();
    let answer: (() => void) | null = null;
    const restore = stubFetch(async () => {
      await new Promise<void>((resolve) => {
        answer = resolve;
      });
      return ok();
    });

    try {
      const received = collector();
      const load = loadInlineEmailImageData(
        new Map([['late-cid', '/api/v1/attachments/late']]),
        received.collect,
        controller.signal
      );
      await settle();

      controller.abort();
      answer?.();
      await load;
      expect(received.size).toBe(0);
    } finally {
      answer?.();
      restore();
    }
  });

  test('an empty set asks for nothing', async () => {
    const restore = stubFetch(async () => {
      throw new Error('should not fetch');
    });
    try {
      await loadInlineEmailImageData(new Map(), () => {
        throw new Error('should not deliver');
      });
    } finally {
      restore();
    }
  });
});
