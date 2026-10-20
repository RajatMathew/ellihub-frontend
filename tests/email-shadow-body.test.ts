import { afterEach, describe, expect, test } from 'bun:test';

import { linkifyTextNodes } from '../src/modules/email/lib/email-body-transforms';
import type { ResourceLifetime } from '../src/modules/email/lib/email-renderer/browser';
import { prepareEmailBody } from '../src/modules/email/lib/email-renderer/core';
import {
  activateEmailBody,
  EMAIL_SHADOW_BODY_CSS,
  markPreparedEmailHtml,
  prepareRawEmailHtml,
  prepareShadowEmailBody,
  shouldAdaptEmailColors,
} from '../src/modules/email/lib/email-shadow-body';

const ZOHO_BASE = 'https://zmdownload-accl.zoho.com';
const ZOHO_PATH = '/mail/ImageDisplay?na=1&amp;nmsgId=2&amp;cid=3';

/** The exact pre-mount steps `EmailShadowBody` runs. */
function pipeline(html: string, inlineImageBaseUrl?: string | null) {
  const { body, visibleContentIds } = prepareShadowEmailBody(html, inlineImageBaseUrl);
  return { html: body.html, visibleContentIds };
}

describe('prepareEmailBody fullContentOnly (clean once, not three times)', () => {
  const SAMPLES: Record<string, string> = {
    plain: '<p>Hi team</p>',
    outlook: `<html><head><style>p.MsoNormal{margin:0}@media (prefers-color-scheme: dark){p{color:#fff}}</style></head>
<body><div class="WordSection1"><p class="MsoNormal"><span style="font-size:11pt;color:#1F497D">Please see attached.</span></p>
<table style="border:0"><tr><td><img src="cid:logo@x" style="width:80px"></td><td style="padding:4px">Elli NY Design</td></tr></table></div></body></html>`,
    gmailSignature:
      '<div>Thanks</div><div class="gmail_signature_prefix">-- </div><div class="gmail_signature">Bob</div><br><br>',
    macroQuote: '<p>New reply</p><div class="macro_quote"><p>Earlier message</p></div>',
    trailingBreaks: '<p>Short</p><br><br><div><br></div>',
    hostile: '<p onclick="x()">Hi</p><script>alert(1)</script><form><input></form>',
  };

  for (const [name, html] of Object.entries(SAMPLES)) {
    test(`same html and hasTable as the full Macro path: ${name}`, () => {
      const macro = prepareEmailBody({ html }, { showQuotedContent: true });
      const fast = prepareEmailBody({ html }, { showQuotedContent: true, fullContentOnly: true });
      expect(fast.html).toBe(macro.html);
      expect(fast.hasTable).toBe(macro.hasTable);
      expect(fast.kind).toBe('html');
    });
  }

  test('only applies together with showQuotedContent', () => {
    const html = SAMPLES.gmailSignature;
    expect(prepareEmailBody({ html }, { fullContentOnly: true })).toEqual(
      prepareEmailBody({ html })
    );
  });
});

describe('prepareRawEmailHtml', () => {
  test('returns a body with nothing to resolve untouched', () => {
    const html = '<p>Plain <b>message</b></p>';
    expect(prepareRawEmailHtml(html, ZOHO_BASE)).toBe(html);
  });

  test('rewrites a Zoho inline image to its download URL', () => {
    const out = prepareRawEmailHtml(`<img src="${ZOHO_PATH}">`, ZOHO_BASE);
    expect(out).toContain('src="https://zmdownload-accl.zoho.com/zm/ImageDisplay');
    expect(out).toContain('referrerpolicy="no-referrer"');
  });

  test('copies a cid held only in data-originalsrc into src', () => {
    const out = prepareRawEmailHtml('<img data-originalsrc="cid:logo@x">', null);
    expect(out).toContain('src="cid:logo@x"');
  });
});

describe('ordering around Macro’s sanitizer', () => {
  // The sanitizer strips every data-* attribute. Resolving after it would find
  // nothing — this pins the pre-pass running first.
  test('a Zoho image in data-originalsrc survives sanitizing', () => {
    const html = `<p>Hi</p><img data-originalsrc="${ZOHO_PATH}" alt="zoho">`;
    expect(prepareEmailBody({ html }).html).not.toContain('ImageDisplay');
    expect(pipeline(html, ZOHO_BASE).html).toContain('zmdownload-accl.zoho.com/zm/ImageDisplay');
  });

  test('a cid image in data-originalsrc survives sanitizing', () => {
    const html = '<p>Hi</p><img data-originalsrc="cid:logo@x">';
    expect(prepareEmailBody({ html }).html).not.toContain('logo@x');
    expect(pipeline(html).visibleContentIds).toEqual(['logo@x']);
  });

  test('scripts and handlers are still removed', () => {
    const { html } = pipeline('<p onclick="x()">Hi</p><script>alert(1)</script>');
    expect(html).not.toMatch(/<script|onclick/);
    expect(html).toContain('Hi');
  });

  // Macro deletes a Gmail signature unless told not to; ours collapses it instead.
  test('keeps the signature for our quote handling rather than deleting it', () => {
    const { html } = pipeline('<p>Thanks</p><div class="gmail_signature">Bob, Site lead</div>');
    expect(html).toContain('Bob, Site lead');
  });
});

describe('markPreparedEmailHtml', () => {
  const THREAD = `<p>Latest reply, see https://elli.app/docs.</p><img src="cid:logo@x">
<div class="gmail_quote"><div class="gmail_attr">On Mon, Bob wrote:</div>
<blockquote class="gmail_quote"><p>older</p><img src="cid:quoted@x"></blockquote></div>`;

  test('leaves cid images sourceless and marked until their data arrives', () => {
    const { html } = markPreparedEmailHtml('<img src="cid:logo@x">');
    expect(html).toContain('data-inline-cid="logo@x"');
    expect(html).not.toContain('src=');
  });

  test('reports only the images outside the collapsed quote as visible', () => {
    expect(markPreparedEmailHtml(THREAD).visibleContentIds).toEqual(['logo@x']);
  });

  test('collapses the quote behind our toggle and linkifies bare URLs', () => {
    const { html } = markPreparedEmailHtml(THREAD);
    expect(html).toContain('data-elli-quote-toggle');
    expect(html).toContain('data-elli-quoted-content');
    expect(html).toContain('href="https://elli.app/docs"');
  });

  // Outlook writes a forwarded header's addresses as plain text (elli-ui#1296).
  test('links the bare addresses in a forwarded header', () => {
    const { html } = markPreparedEmailHtml(
      '<p><b>From:</b> Shalini &lt;shalini@ellicorp.com&gt;<br><b>Cc:</b> Tomasz &lt;tomasz@ellicorp.com&gt;; Cari &lt;cari@ellicorp.com&gt;</p>'
    );
    expect(html).toContain('href="mailto:shalini@ellicorp.com"');
    expect(html).toContain('href="mailto:tomasz@ellicorp.com"');
    expect(html).toContain('href="mailto:cari@ellicorp.com"');
  });

  // The iframe renderer's prepareEmailBody calls this same function directly.
  test('the shared linkify gives an address the same link attributes as a URL', () => {
    const document = new DOMParser().parseFromString(
      '<body><p>To: Joseph &lt;joseph.gray@tecticonismstudio.com&gt;</p></body>',
      'text/html'
    );
    linkifyTextNodes(document);
    const link = document.querySelector('a');
    expect(link?.getAttribute('href')).toBe('mailto:joseph.gray@tecticonismstudio.com');
    expect(link?.textContent).toBe('joseph.gray@tecticonismstudio.com');
    expect(link?.target).toBe('_blank');
  });

  test('keeps a URL that contains an address as one web link', () => {
    const { html } = markPreparedEmailHtml('<p>https://x.test/a?u=foo@bar.com</p>');
    expect(html).toContain('href="https://x.test/a?u=foo@bar.com"');
    expect(html).not.toContain('mailto:');
  });
});

describe('activateEmailBody', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mount(html: string) {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = html;
    const controller = new AbortController();
    const lifetime: ResourceLifetime = { signal: controller.signal, onDispose: () => {} };
    return { root, controller, lifetime };
  }

  function mockImages(fetched: string[]) {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetched.push(String(input));
      return new Response(new Blob(['x'], { type: 'image/png' }));
    }) as typeof globalThis.fetch;
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  const THREAD = `<p>Reply</p><img src="cid:a1@x"><div class="gmail_quote"><div class="gmail_attr">On Mon, Bob wrote:</div><blockquote class="gmail_quote"><p>old</p><img src="cid:a2@x"></blockquote></div>`;
  const ATTACHMENTS = [
    { name: 'a1.png', inline: true, contentId: '<a1@x>', contentUrl: '/att/shadow-a1' },
    { name: 'a2.png', inline: true, contentId: '<a2@x>', contentUrl: '/att/shadow-a2' },
  ];
  const srcOf = (root: ShadowRoot, contentId: string) =>
    root.querySelector(`[data-inline-cid="${contentId}"]`)?.getAttribute('src');

  // The frame fetched every image and inlined it as a data URL, four at a time;
  // inside the shadow root the browser can load the URL itself, in parallel.
  test('points visible images straight at their URL, and fetches nothing itself', () => {
    const fetched: string[] = [];
    mockImages(fetched);
    const marked = markPreparedEmailHtml(THREAD);
    const { root, lifetime } = mount(marked.html);

    activateEmailBody(root, lifetime, {
      attachments: ATTACHMENTS,
      apiBaseUrl: 'https://api.test',
      visibleContentIds: marked.visibleContentIds,
    });

    expect(srcOf(root, 'a1@x')).toBe('https://api.test/att/shadow-a1');
    expect(root.querySelector<HTMLImageElement>('[data-inline-cid="a1@x"]')!.loading).toBe('lazy');
    expect(fetched).toEqual([]);
  });

  test('leaves quoted images alone until the quote is opened', () => {
    mockImages([]);
    const marked = markPreparedEmailHtml(THREAD);
    const { root, lifetime } = mount(marked.html);
    activateEmailBody(root, lifetime, {
      attachments: ATTACHMENTS,
      apiBaseUrl: 'https://api.test',
      visibleContentIds: marked.visibleContentIds,
    });
    expect(srcOf(root, 'a2@x')).toBeNull();

    const toggle = root.querySelector<HTMLElement>('[data-elli-quote-toggle]')!;
    const quoted = root.querySelector<HTMLElement>('[data-elli-quoted-content]')!;
    toggle.click();
    expect(quoted.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(srcOf(root, 'a2@x')).toBe('https://api.test/att/shadow-a2');

    // Hiding waits for the close animation; `email-quote-animation.test.ts` covers that.
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  // The list-row stand-in carries no attachments; the conversation brings them.
  test('fills in images whose attachment arrives after the body mounted', () => {
    mockImages([]);
    const marked = markPreparedEmailHtml(THREAD);
    const { root, lifetime } = mount(marked.html);
    const images = activateEmailBody(root, lifetime, {
      attachments: [],
      apiBaseUrl: 'https://api.test',
      visibleContentIds: marked.visibleContentIds,
    });
    expect(srcOf(root, 'a1@x')).toBeNull();

    images.setAttachments(ATTACHMENTS);
    expect(srcOf(root, 'a1@x')).toBe('https://api.test/att/shadow-a1');
  });

  test('falls back to an inlined copy when the direct load fails', async () => {
    const fetched: string[] = [];
    mockImages(fetched);
    const marked = markPreparedEmailHtml(THREAD);
    const { root, lifetime } = mount(marked.html);
    activateEmailBody(root, lifetime, {
      attachments: [
        { name: 'a1.png', inline: true, contentId: '<a1@x>', contentUrl: '/att/shadow-fallback' },
      ],
      apiBaseUrl: 'https://api.test',
      visibleContentIds: marked.visibleContentIds,
    });

    root.querySelector('[data-inline-cid="a1@x"]')!.dispatchEvent(new Event('error'));
    expect(srcOf(root, 'a1@x')).toBeNull();
    await settle();
    expect(fetched).toEqual(['https://api.test/att/shadow-fallback']);
    expect(srcOf(root, 'a1@x')).toStartWith('data:image/');
  });

  test('stops reacting to the toggle once the lifetime ends', () => {
    mockImages([]);
    const marked = markPreparedEmailHtml(
      `<p>Reply</p><div class="gmail_quote"><div class="gmail_attr">On Mon, Bob wrote:</div><blockquote class="gmail_quote"><p>old</p></blockquote></div>`
    );
    const { root, controller, lifetime } = mount(marked.html);
    activateEmailBody(root, lifetime, {
      attachments: [],
      apiBaseUrl: '',
      visibleContentIds: [],
    });

    controller.abort();
    root.querySelector<HTMLElement>('[data-elli-quote-toggle]')!.click();
    expect(root.querySelector<HTMLElement>('[data-elli-quoted-content]')!.hidden).toBe(true);
  });
});

describe('EMAIL_SHADOW_BODY_CSS', () => {
  // processEmailColors strips light background-colors so a personal message
  // sits on the card; a background-color fill would vanish in the light theme.
  test('paints the quote toggle with a background-image', () => {
    const toggleRule = EMAIL_SHADOW_BODY_CSS.match(/\[data-elli-quote-toggle\] \{[^}]*\}/)?.[0];
    expect(toggleRule).toContain('linear-gradient(');
    expect(toggleRule).not.toMatch(/background(-color)?:\s*#/);
  });

  test('keeps chrome light on the white panel whatever the app theme', () => {
    expect(EMAIL_SHADOW_BODY_CSS).toContain(':host([data-elli-fixed-light])');
  });
});

describe('which messages follow the theme', () => {
  test('the rule: no table, or part of a conversation', () => {
    expect(shouldAdaptEmailColors({ hasTable: false, hasQuotedContent: false })).toBe(true);
    expect(shouldAdaptEmailColors({ hasTable: true, hasQuotedContent: true })).toBe(true);
    expect(shouldAdaptEmailColors({ hasTable: true, hasQuotedContent: false })).toBe(false);
  });

  // The case that kept almost every business mail on white: an Outlook reply
  // whose signature is a table.
  test('an Outlook forward with a table signature and quoted history is adapted', () => {
    const html = `<div class="WordSection1"><p class="MsoNormal">Cari, please see attached.</p>
<table><tr><td><img src="cid:logo@x"></td><td>Mahavir, Senior PM</td></tr></table>
<div style="border:none;border-top:solid #E1E1E1 1.0pt;padding:3.0pt 0in 0in 0in"><p class="MsoNormal"><b>From:</b> Bob<br><b>Sent:</b> Monday<br><b>Subject:</b> Creedmoor</p></div>
<p class="MsoNormal">Earlier message</p></div>`;
    const prepared = prepareShadowEmailBody(html);
    expect(prepared.body.hasTable).toBe(true);
    expect(prepared.adaptColors).toBe(true);
  });

  test('a designed newsletter stays on white', () => {
    const html =
      '<table width="600" bgcolor="#ffffff"><tr><td><h1>Weekly deals</h1><p>Save 20% on fasteners</p></td></tr></table>';
    const prepared = prepareShadowEmailBody(html);
    expect(prepared.body.hasTable).toBe(true);
    expect(prepared.adaptColors).toBe(false);
  });

  test('a plain reply with no table is adapted', () => {
    expect(prepareShadowEmailBody('<p>Thanks, received.</p>').adaptColors).toBe(true);
  });
});
