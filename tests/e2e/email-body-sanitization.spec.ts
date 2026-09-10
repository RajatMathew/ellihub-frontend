import { expect, test, type Page } from '@playwright/test';

/**
 * Sanitization and frame-isolation tests for the email body renderer.
 *
 * These live in Playwright rather than in the `bun test` suite on purpose:
 * DOMPurify needs a real browser DOM, and under happy-dom it silently
 * under-sanitizes — a `<script>` tag survives `sanitize()` there. A unit test of
 * this behaviour would pass while asserting something untrue, which is worse
 * than having no test at all.
 *
 * The page under test is built from the same module the app renders with, so a
 * regression in either the sanitizer configuration or the sandbox flags fails
 * here.
 */

const HARNESS_PATH = '/__email-body-harness';

/**
 * Serves a page that imports the real renderer helpers and exposes them, so the
 * assertions run against shipped code rather than a copy of it.
 */
async function openHarness(page: Page) {
  // Served from the dev server's own origin so the module specifier below
  // resolves through Vite; a stand-alone origin cannot load `/src/...`.
  await page.route(`**${HARNESS_PATH}`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body><div id="host"></div>
<script type="module">
  import { sanitizeEmailHtml, buildEmailFrameDocument, EMAIL_FRAME_SANDBOX }
    from '/src/modules/email/lib/email-html-document.ts';
  window.__email = { sanitizeEmailHtml, buildEmailFrameDocument, EMAIL_FRAME_SANDBOX };
  window.__ready = true;
</script></body></html>`,
    })
  );
  await page.goto(HARNESS_PATH);
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
}

type Harness = {
  sanitizeEmailHtml: (html: string) => string;
  buildEmailFrameDocument: (input: { bodyHtml: string; apiOrigin?: string | null }) => string;
  EMAIL_FRAME_SANDBOX: string;
};

declare global {
  interface Window {
    __email: Harness;
  }
}

test.describe('email body sanitization', () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page);
  });

  test('strips script, event handlers and javascript: urls', async ({ page }) => {
    const results = await page.evaluate(() => {
      const { sanitizeEmailHtml } = window.__email;
      return {
        script: sanitizeEmailHtml('<p>a</p><script>alert(1)</script>'),
        onerror: sanitizeEmailHtml('<img src=x onerror=alert(1)>'),
        jsHref: sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>'),
        svg: sanitizeEmailHtml('<svg><style><img src=x onerror=alert(1)></style></svg>'),
        math: sanitizeEmailHtml('<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>'),
      };
    });

    expect(results.script).not.toContain('script');
    expect(results.onerror).not.toContain('onerror');
    expect(results.jsHref).not.toContain('javascript:');
    expect(results.svg).not.toContain('onerror');
    expect(results.math).not.toContain('onerror');
  });

  /**
   * A `<form>` with inputs renders as a credential prompt inside the message.
   * DOMPurify's html profile permits it, so this is our own addition — and the
   * reason the stock configuration was not adopted unchanged.
   */
  test('strips form controls, which stock DOMPurify would keep', async ({ page }) => {
    const result = await page.evaluate(() =>
      window.__email.sanitizeEmailHtml(
        '<form action="https://evil.test"><input name="password"><button>Sign in</button></form>'
      )
    );

    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
    expect(result).not.toContain('<button');
  });

  test('strips frame, meta refresh and base tags', async ({ page }) => {
    const results = await page.evaluate(() => {
      const { sanitizeEmailHtml } = window.__email;
      return {
        iframe: sanitizeEmailHtml('<iframe src="https://evil.test"></iframe>'),
        meta: sanitizeEmailHtml('<meta http-equiv="refresh" content="0;url=https://evil.test">'),
        base: sanitizeEmailHtml('<base href="https://evil.test/">'),
      };
    });

    expect(results.iframe).toBe('');
    expect(results.meta).toBe('');
    expect(results.base).toBe('');
  });

  /**
   * Fidelity matters as much as safety here: 93% of the bodies in our own cache
   * carry a `<style>` block, and stripping them — as the reference
   * implementation this was modelled on does — would flatten almost every
   * message we receive.
   */
  test('keeps the markup real mail is built from', async ({ page }) => {
    const result = await page.evaluate(() =>
      window.__email.sanitizeEmailHtml(
        '<style>.x{color:red}</style>' +
          '<div class="WordSection1"><p class="MsoNormal" style="color:#1f497d">Hi</p></div>' +
          '<table><tr><td width="50" bgcolor="#eee">cell</td></tr></table>' +
          '<font face="Calibri" color="#000000">f</font>' +
          '<div id="divRplyFwdMsg">header</div>' +
          '<blockquote type="cite">q</blockquote>' +
          '<img src="cid:image001@x" width="10">'
      )
    );

    expect(result).toContain('<style>');
    expect(result).toContain('class="WordSection1"');
    expect(result).toContain('style="color:#1f497d"');
    expect(result).toContain('<table>');
    expect(result).toContain('bgcolor="#eee"');
    expect(result).toContain('face="Calibri"');
    expect(result).toContain('id="divRplyFwdMsg"');
    expect(result).toContain('<blockquote');
    expect(result).toContain('cid:image001@x');
  });
});

test.describe('email body frame isolation', () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page);
  });

  /**
   * `allow-scripts` together with `allow-same-origin` dissolves the sandbox —
   * the frame could then reach the parent document, its cookies and the API,
   * which is the entire reason a message is rendered in a frame rather than a
   * shadow root.
   */
  test('never combines allow-scripts with allow-same-origin', async ({ page }) => {
    const sandbox = await page.evaluate(() => window.__email.EMAIL_FRAME_SANDBOX);

    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  test('locks the frame down with a content security policy', async ({ page }) => {
    const document = await page.evaluate(() =>
      window.__email.buildEmailFrameDocument({
        bodyHtml: '<p>x</p>',
        apiOrigin: 'https://api.test',
      })
    );

    expect(document).toContain("default-src 'none'");
    expect(document).toContain("form-action 'none'");
    expect(document).toContain("object-src 'none'");
    expect(document).toContain("base-uri 'none'");
    expect(document).toContain('https://api.test');
  });

  test('a script that survives sanitization cannot reach the parent', async ({ page }) => {
    // Injected past the sanitizer deliberately: this asserts what the sandbox
    // guarantees when the layer in front of it fails, which is the property the
    // whole design rests on.
    const reachedParent = await page.evaluate(async () => {
      const { buildEmailFrameDocument, EMAIL_FRAME_SANDBOX } = window.__email;
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', EMAIL_FRAME_SANDBOX);
      frame.srcdoc = buildEmailFrameDocument({
        bodyHtml: `<script>
          try { parent.document.title = 'pwned'; } catch (error) { /* expected */ }
        </script>`,
      });
      document.body.append(frame);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return document.title === 'pwned';
    });

    expect(reachedParent).toBe(false);
  });

  /**
   * The short-content case, which the tall-content test above cannot catch: an
   * iframe defaults to 150px, and measuring the root element's scrollHeight
   * returns that floor rather than the content height. Every message shorter
   * than 150px was framed in empty space until this was measured.
   */
  test('reports a height below the iframe default for a short body', async ({ page }) => {
    const height = await page.evaluate(async () => {
      const { buildEmailFrameDocument, EMAIL_FRAME_SANDBOX } = window.__email;
      return new Promise<number>((resolve) => {
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', EMAIL_FRAME_SANDBOX);
        window.addEventListener('message', (event) => {
          const data = event.data as Record<string, unknown>;
          if (data && data.__elliEmailHeight === true) resolve(Number(data.height));
        });
        frame.srcdoc = buildEmailFrameDocument({ bodyHtml: '<div>Test body.</div>' });
        document.body.append(frame);
        setTimeout(() => resolve(0), 3000);
      });
    });

    expect(height).toBeGreaterThan(0);
    expect(height).toBeLessThan(60);
  });

  test('reports its height so the frame can be sized', async ({ page }) => {
    const height = await page.evaluate(async () => {
      const { buildEmailFrameDocument, EMAIL_FRAME_SANDBOX } = window.__email;
      return new Promise<number>((resolve) => {
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', EMAIL_FRAME_SANDBOX);
        window.addEventListener('message', (event) => {
          const data = event.data as Record<string, unknown>;
          if (data && data.__elliEmailHeight === true) resolve(Number(data.height));
        });
        frame.srcdoc = buildEmailFrameDocument({
          bodyHtml: '<div style="height:400px">tall</div>',
        });
        document.body.append(frame);
        setTimeout(() => resolve(0), 3000);
      });
    });

    expect(height).toBeGreaterThan(300);
  });
});
