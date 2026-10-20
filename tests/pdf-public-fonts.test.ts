import { readFileSync } from 'node:fs';
import path from 'node:path';

import { FONT_FILES, FONT_IDS } from '@pdf-slot/core';
import { describe, expect, test } from 'bun:test';

/**
 * The browser's copy of each face and the renderer's copy must be the same
 * file, byte for byte.
 *
 * This is the one place the preview/download guarantee rests on two files
 * agreeing rather than on one number matching another. The overlay measures
 * with what the browser fetched from this app's `public/fonts`; the exported
 * PDF is measured and drawn with the copies inside `@pdf-slot/core` (by way
 * of its embedded module). Every other link in that chain is guarded inside
 * core -- its embedded-fonts test pins the base64 to its own TTFs, and the
 * API's fonts test pins the renderer's bytes to the same -- but nothing else
 * compares the copy the browser draws with.
 *
 * So a face updated in one place and not the other would pass every other
 * test while the editor laid text out in one font and the download printed
 * another. The two would be close enough that nothing would look broken;
 * lines would simply break in different places on screen than on the page,
 * which is the failure this product exists to prevent.
 *
 * Core's copies are read out of `node_modules` on purpose. That is the copy
 * this build actually renders with, so it is the copy worth comparing -- a
 * path into a checkout beside this one would pass while the installed
 * dependency disagreed.
 */
const coreDir = path.resolve(
  import.meta.dir,
  '../node_modules/@pdf-slot/core/src/fonts/files'
);
const webDir = path.resolve(import.meta.dir, '../public/fonts');

describe('the fonts the browser fetches are the fonts the renderer embeds', () => {
  test.each([...FONT_IDS])('%s is byte-identical in both directories', (id) => {
    const file = FONT_FILES[id];
    const served = readFileSync(path.join(webDir, file));
    const embedded = readFileSync(path.join(coreDir, file));
    const hint = `${file} differs between public/fonts and @pdf-slot/core's own copy -- update the one file in core, re-run \`npm run fonts:embed\` there, and copy it into public/fonts`;
    expect(served.byteLength, hint).toBe(embedded.byteLength);
    expect(Buffer.compare(served, embedded), hint).toBe(0);
  });

  test('every id the registry names is actually served to the browser', () => {
    // A registry entry with no file under public/fonts is not a build error:
    // loadFontBytes() would 404 at runtime, in the browser, and the editor
    // would refuse to lay anything out.
    for (const id of FONT_IDS) {
      const file = path.join(webDir, FONT_FILES[id]);
      expect(
        () => readFileSync(file),
        `${FONT_FILES[id]} is missing from apps/web/public/fonts`
      ).not.toThrow();
    }
  });
});
