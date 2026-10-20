import { mergeAttributes, parseAttributes } from '@tiptap/core';
import { describe, expect, test } from 'bun:test';

/**
 * Pins @tiptap/core at or above the release that fixed the two advisories open
 * against the 3.28.0 this app shipped. The PDF template editor
 * (pdf-generate-dialog.tsx) is the only consumer, and it feeds the editor HTML
 * rather than JSON and loads no Markdown extension, so neither was reachable
 * there — but both helpers ship in the bundle, and a downgrade should fail here.
 */
describe('@tiptap/core security fixes', () => {
  test('mergeAttributes does not take its prototype from an own __proto__ key', () => {
    // GHSA-cp6q-959q-f8rh, fixed in 3.30.4. ProseMirror renders attributes with
    // for...in, so inherited keys such as onerror reached setAttribute().
    const input = JSON.parse(
      '{"__proto__": {"src": "x-invalid://canary", "onerror": "alert(1)"}}'
    ) as Record<string, unknown>;

    const merged = mergeAttributes(input);

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect('onerror' in merged).toBe(false);
  });

  test('Pandoc-style block attributes parse in linear time', () => {
    // GHSA-j95f-988m-3j2f, fixed in 3.30.5. The advisory measured ~1.4 s for a
    // 20 KB token on 3.29.2 against 0.3 ms for an equal-length control; the
    // bound sits far from both, so this is not a flaky timing test.
    const attack = '__QUOTED_0'.repeat(2048) + '__QUOTED_0__';

    const started = performance.now();
    parseAttributes(attack);

    expect(performance.now() - started).toBeLessThan(200);
  });
});
