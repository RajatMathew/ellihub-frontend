import { describe, expect, test } from 'bun:test';

import { mountEmailBody } from '../src/modules/email/lib/email-renderer/browser';
import { prepareEmailBody } from '../src/modules/email/lib/email-renderer/core';
import { prepareCss } from '../src/modules/email/lib/email-renderer/core/css';
import { FALLBACK_EMAIL_THEME } from '../src/modules/email/lib/email-theme-colors';

/** Our changes inside the copied Macro package, marked "Elli addition" in the source. */

describe('prepareCss result cache', () => {
  // The same text must not share a result across policies — a cache keyed on
  // the CSS alone would hand a blocked-images reader the allowed URL.
  test('keeps results for different image policies apart', () => {
    const css = 'background:url(https://tracker.test/pixel.gif);color:red';
    const allowed = prepareCss(css, true, { remote: 'allow' });
    const blocked = prepareCss(css, true, { remote: 'block' });

    expect(allowed).toContain('tracker.test');
    expect(blocked).not.toContain('tracker.test');
    expect(blocked).toContain('color:red');
  });

  test('keeps inline and stylesheet parses of the same text apart', () => {
    const css = 'p{color:red}';
    expect(prepareCss(css, false, { remote: 'allow' })).toBe('p{color:red}');
    // As a declaration list this is not valid; it must not reuse the sheet result.
    expect(prepareCss(css, true, { remote: 'allow' })).not.toBe('p{color:red}');
  });

  test('a repeated input gives the identical result', () => {
    const css = 'font-size:11pt;font-family:Calibri,sans-serif;color:#1F497D';
    const first = prepareCss(css, true, { remote: 'allow' });
    expect(prepareCss(css, true, { remote: 'allow' })).toBe(first);
  });
});

describe('mountEmailBody refresh batching', () => {
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  test('a burst of image loads costs one layout read, not one per image', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    let layoutReads = 0;
    Object.defineProperty(host, 'clientWidth', {
      get: () => {
        layoutReads += 1;
        return 600;
      },
    });

    const images = Array.from({ length: 12 }, (_, index) => `<img alt="logo ${index}">`).join('');
    const renderer = mountEmailBody(host, prepareEmailBody({ html: `<p>Hi</p>${images}` }), {
      theme: FALLBACK_EMAIL_THEME,
      adaptColors: false,
      normalizeFonts: false,
    });
    await nextFrame();
    layoutReads = 0;

    for (const image of host.shadowRoot!.querySelectorAll('img')) {
      image.dispatchEvent(new Event('load'));
    }
    expect(layoutReads).toBe(0);
    await nextFrame();
    expect(layoutReads).toBe(1);

    renderer.dispose();
  });

  // Guaranteed twice over: the pending frame is cancelled, and `refresh` returns
  // early once the lifetime is aborted. This pins the behaviour, not which one.
  test('does no layout work for a load that lands as the body closes', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    let layoutReads = 0;
    Object.defineProperty(host, 'clientWidth', {
      get: () => {
        layoutReads += 1;
        return 600;
      },
    });
    const renderer = mountEmailBody(host, prepareEmailBody({ html: '<p>Hi</p><img alt="x">' }), {
      theme: FALLBACK_EMAIL_THEME,
      adaptColors: false,
      normalizeFonts: false,
    });
    await nextFrame();
    layoutReads = 0;

    host.shadowRoot!.querySelector('img')!.dispatchEvent(new Event('load'));
    renderer.dispose();
    await nextFrame();
    expect(layoutReads).toBe(0);
  });
});
