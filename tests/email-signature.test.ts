import { describe, expect, test } from 'bun:test';

import { sanitizeEmailHtml } from '../src/modules/email/lib/email-html-sanitize';
import {
  applySignaturePreference,
  findEmailSignatureId,
  getSignatureSeed,
  isEmptyEmailBody,
  linkSignatureImages,
  withEmailSignature,
  withoutEmailSignature,
} from '../src/modules/email/lib/email-signature';
import type { EmailSignatures } from '../src/modules/email/schemas/email-signature.schema';

/** Shaped like what elli-core renders: styled paragraphs and a public image. */
const signature = (name: string) =>
  `<div style="margin-top:20px;font-family:Aptos, Arial, sans-serif;">` +
  `<p style="color:#0a2f41;font-size:16px;margin:0 0 8px;">Thank you,</p>` +
  `<p style="color:#0a2f41;font-size:16px;margin:0 0 8px;">${name}</p>` +
  `<p><img src="https://api.example.com/api/v1/mail/signature-assets/elli-logo.png" alt="Elli" width="135" height="41" style="display:inline-block;vertical-align:middle;border:0;"></p>` +
  `</div>`;

const signatures: EmailSignatures = {
  signatures: [
    {
      id: 'sig-default',
      name: 'Default',
      description: null,
      isCompanyDefault: true,
      html: signature('Elli Admin'),
    },
    {
      id: 'sig-short',
      name: 'Short',
      description: null,
      isCompanyDefault: false,
      html: signature('EA'),
    },
  ],
  preference: { templateId: null, insertOnNew: true, insertOnReply: true },
  defaultSignatureId: 'sig-default',
};

const roundTrip = (html: string) => {
  const editor = document.createElement('div');
  editor.innerHTML = html;
  return editor.innerHTML;
};

describe('a new message', () => {
  test('opens with an empty line above the default signature, where the caret starts', () => {
    const seed = getSignatureSeed(signatures, 'new');

    expect(seed.startsWith('<div><br></div><div class="elli-signature">')).toBe(true);
    expect(seed).toContain('Elli Admin');
  });

  test('opens empty when this mailbox adds no signature to new mail', () => {
    const seed = getSignatureSeed(
      { ...signatures, preference: { ...signatures.preference, insertOnNew: false } },
      'new'
    );

    expect(seed).toBe('');
    // …while replies still get one.
    expect(
      getSignatureSeed(
        { ...signatures, preference: { ...signatures.preference, insertOnNew: false } },
        'reply'
      )
    ).not.toBe('');
  });

  test('opens empty with no signatures loaded, or none to add', () => {
    expect(getSignatureSeed(undefined, 'new')).toBe('');
    expect(getSignatureSeed({ ...signatures, defaultSignatureId: null }, 'reply')).toBe('');
  });

  test('is serialized the way the editor reads it back, so it still reads as untouched', () => {
    const seed = getSignatureSeed(signatures, 'new');

    expect(roundTrip(seed)).toBe(seed);
  });
});

describe('the signature in a body', () => {
  test('is swapped in place, keeping what the user wrote', () => {
    const body = withEmailSignature(
      '<div>Hi Mia,</div><div>Plans attached.</div>',
      signature('Elli Admin')
    );

    const swapped = withEmailSignature(body, signature('EA'));

    expect(swapped).toContain('<div>Hi Mia,</div><div>Plans attached.</div>');
    expect(swapped).toContain('EA');
    expect(swapped).not.toContain('Elli Admin');
    expect(swapped.match(/elli-signature/g)).toHaveLength(1);
  });

  test('is added at the end when there is none', () => {
    const body = withEmailSignature('<div>Hi Mia,</div>', signature('EA'));

    expect(body.indexOf('Hi Mia')).toBeLessThan(body.indexOf('elli-signature'));
  });

  test('is removed without touching the rest', () => {
    const body = withEmailSignature('<div>Hi Mia,</div>', signature('EA'));

    expect(withoutEmailSignature(body)).toBe('<div>Hi Mia,</div>');
  });

  test('leaves a signature inside a quoted message alone', () => {
    const quoted = `<blockquote><div class="elli-signature"><p>Someone else</p></div></blockquote>`;
    const body = `<div>FYI</div>${quoted}`;

    expect(withoutEmailSignature(body)).toBe(body);
    expect(withEmailSignature(body, signature('EA'))).toContain('Someone else');
  });

  test('is run through the composer sanitizer, like anything else put in the body', () => {
    const body = withEmailSignature('', '<p onclick="steal()">EA</p><script>steal()</script>');

    expect(body).not.toContain('onclick');
    expect(body).not.toContain('<script');
  });
});

describe('whether the user has written anything', () => {
  test('ignores the signature', () => {
    expect(isEmptyEmailBody(getSignatureSeed(signatures, 'reply'))).toBe(true);
  });

  test('sees what was typed above it', () => {
    const body = withEmailSignature('<div>Approved.</div>', signature('EA'));

    expect(isEmptyEmailBody(body)).toBe(false);
  });

  test('still counts an image the user pasted', () => {
    expect(isEmptyEmailBody('<img src="https://example.com/photo.png">')).toBe(false);
  });
});

describe('which signature a body holds', () => {
  test('is the template it was added from', () => {
    const body = getSignatureSeed(signatures, 'new');

    expect(findEmailSignatureId(body, signatures.signatures)).toBe('sig-default');
    expect(
      findEmailSignatureId(withEmailSignature(body, signature('EA')), signatures.signatures)
    ).toBe('sig-short');
  });

  test('survives a draft round-trip that rewrites its markup', () => {
    // What Outlook did to the probe draft: attributes reordered, styles
    // re-spaced. Reopening a draft runs it through the sanitizer again.
    const stored = getSignatureSeed(signatures, 'new')
      .replace(
        /<img src="([^"]+)" alt="Elli" width="135" height="41"/,
        '<img alt="Elli" width="135" height="41" src="$1"'
      )
      .replace(/;(?=\S)/g, '; ');

    expect(findEmailSignatureId(sanitizeEmailHtml(stored), signatures.signatures)).toBe(
      'sig-default'
    );
  });

  test('is "edited" once the user changes it, and none when there is no block', () => {
    const edited = getSignatureSeed(signatures, 'new').replace('Elli Admin', 'Elli A.');

    expect(findEmailSignatureId(edited, signatures.signatures)).toBe('edited');
    expect(findEmailSignatureId('<div>Hi</div>', signatures.signatures)).toBeNull();
  });
});

describe('a changed preference, shown before the server answers', () => {
  test('moves the default to the chosen signature', () => {
    const next = applySignaturePreference(signatures, {
      templateId: 'sig-short',
      insertOnNew: true,
      insertOnReply: false,
    });

    expect(next.defaultSignatureId).toBe('sig-short');
    expect(next.preference.insertOnReply).toBe(false);
    expect(next.signatures).toBe(signatures.signatures);
  });

  test('falls back to the company default for a template no longer offered, as the server does', () => {
    expect(
      applySignaturePreference(signatures, { ...signatures.preference, templateId: 'sig-gone' })
        .defaultSignatureId
    ).toBe('sig-default');
  });
});

describe('a draft whose send stopped after its images were attached', () => {
  const API = 'https://api.example.com';

  test('opens with its signature images linked again, so the editor can show them', () => {
    const stored =
      '<div class="elli-signature"><img src="cid:elli-signature-elli-logo.png" alt="Elli">' +
      "<img alt='NYCSCA' src='cid:elli-signature-nycsca.png@01DB2F'></div>";

    expect(linkSignatureImages(stored, API)).toBe(
      `<div class="elli-signature"><img src="${API}/api/v1/mail/signature-assets/elli-logo.png" alt="Elli">` +
        `<img alt='NYCSCA' src='${API}/api/v1/mail/signature-assets/nycsca.png'></div>`
    );
  });

  test('leaves every other inline image alone', () => {
    const html = '<img src="cid:image001.png@01DB2F"><img src="cid:elli-logo">';

    expect(linkSignatureImages(html, API)).toBe(html);
  });
});
