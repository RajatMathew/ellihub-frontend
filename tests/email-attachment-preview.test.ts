import { describe, expect, test } from 'bun:test';

import {
  canPreviewAttachmentInline,
  getAttachmentPreviewKind,
  inlineContentIdImages,
  looksLikeEmailMessage,
  parseAttachedEmail,
  resolveAttachmentMimeType,
  shouldSniffForEmail,
  sniffEmailMessage,
  toPreviewBlob,
} from '../src/modules/email/lib/email-attachment-preview';

const attachment = (name: string, mimeType?: string | null) => ({ name, mimeType });

describe('resolveAttachmentMimeType', () => {
  test('a provider that says octet-stream is not believed', () => {
    // The bug: the PDF in elli-ui#1047 arrives as octet-stream, the iframe
    // cannot render it, and the browser saves it under the blob UUID.
    expect(
      resolveAttachmentMimeType(attachment('Invoice 1733-5721.pdf'), 'application/octet-stream')
    ).toBe('application/pdf');
  });

  test('a server type that says something wins over the extension', () => {
    // Renaming a page to .pdf must not make it a PDF.
    expect(resolveAttachmentMimeType(attachment('not-really.pdf'), 'text/html')).toBe('text/html');
  });

  test('parameters and case do not change the answer', () => {
    expect(resolveAttachmentMimeType(attachment('notes.txt'), 'TEXT/PLAIN; charset=utf-8')).toBe(
      'text/plain'
    );
  });

  test('an unknown extension with no server type resolves to nothing', () => {
    expect(resolveAttachmentMimeType(attachment('elevation.dwg'))).toBe('');
    expect(resolveAttachmentMimeType(attachment('Payment for March'))).toBe('');
  });
});

describe('canPreviewAttachmentInline', () => {
  test('formats a browser renders are allowed', () => {
    for (const type of ['application/pdf', 'image/png', 'video/mp4', 'audio/mpeg', 'text/plain']) {
      expect(canPreviewAttachmentInline(type)).toBe(true);
    }
  });

  test('anything that can execute is refused', () => {
    // These are the reason this is an allow-list. A blob: URL is same-origin
    // to the frame, so rendering them would run their script.
    for (const type of [
      'text/html',
      'image/svg+xml',
      'application/xhtml+xml',
      'text/xml',
      'message/rfc822',
    ]) {
      expect(canPreviewAttachmentInline(type)).toBe(false);
    }
  });

  test('an unknown or empty type is refused', () => {
    expect(canPreviewAttachmentInline('application/octet-stream')).toBe(false);
    expect(canPreviewAttachmentInline('')).toBe(false);
  });
});

describe('getAttachmentPreviewKind', () => {
  test('the mislabelled PDF previews instead of downloading', () => {
    expect(
      getAttachmentPreviewKind(attachment('Invoice 1733-5721.pdf'), 'application/octet-stream')
    ).toBe('pdf');
  });

  test('each renderable family gets its own element', () => {
    expect(getAttachmentPreviewKind(attachment('site.png'), 'image/png')).toBe('image');
    expect(getAttachmentPreviewKind(attachment('clip.mp4'), 'video/mp4')).toBe('video');
    expect(getAttachmentPreviewKind(attachment('voicemail.mp3'), 'audio/mpeg')).toBe('audio');
    expect(getAttachmentPreviewKind(attachment('notes.txt'), 'text/plain')).toBe('text');
  });

  test('anything unrenderable is generic, so the card shows a placeholder', () => {
    // `generic` is what keeps these away from an iframe entirely.
    expect(getAttachmentPreviewKind(attachment('drawing.svg'), 'image/svg+xml')).toBe('generic');
    expect(getAttachmentPreviewKind(attachment('page.html'), 'text/html')).toBe('generic');
    expect(getAttachmentPreviewKind(attachment('Payment'), 'message/rfc822')).toBe('generic');
    expect(getAttachmentPreviewKind(attachment('elevation.dwg'))).toBe('generic');
  });

  test('an svg named .png is still refused', () => {
    // The extension never overrides a server type that said something.
    expect(getAttachmentPreviewKind(attachment('logo.png'), 'image/svg+xml')).toBe('generic');
  });
});

describe('toPreviewBlob', () => {
  test('re-types a blob whose type would not render', () => {
    const blob = new Blob(['%PDF-1.7'], { type: 'application/octet-stream' });
    const preview = toPreviewBlob(blob, 'application/pdf');

    expect(preview.type).toBe('application/pdf');
    expect(preview).not.toBe(blob);
  });

  test('leaves a blob alone when the type already matches', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });

    // Same object: re-wrapping every preview would copy the bytes for nothing.
    expect(toPreviewBlob(blob, 'text/plain; charset=utf-8')).toBe(blob);
    expect(toPreviewBlob(blob, '')).toBe(blob);
  });

  test('keeps the bytes intact', async () => {
    const blob = new Blob(['%PDF-1.7 body'], { type: 'application/octet-stream' });

    expect(await toPreviewBlob(blob, 'application/pdf').text()).toBe('%PDF-1.7 body');
  });
});

// The shape Graph's `$value` serves for an attached Outlook item: a related
// part with the body and the signature logo it draws, then a real file, then
// another email attached inside this one.
const ATTACHED_ITEM = [
  'From: Mahavir Singh <mahavir@example.com>',
  'To: "ella@example.com" <ella@example.com>',
  'CC: Tomasz Bartosiak <tomasz@example.com>, Steven',
  '\tBonilla <steven@example.com>',
  'Subject: 30100_Casework_RFQ',
  'Date: Mon, 5 Oct 2026 14:59:15 +0000',
  'Content-Type: multipart/mixed; boundary="outer"',
  'MIME-Version: 1.0',
  '',
  '--outer',
  'Content-Type: multipart/related; boundary="related"',
  '',
  '--related',
  'Content-Type: text/html; charset="us-ascii"',
  '',
  '<p>Please see attached drawings.</p><img src="cid:image001.png@01DD54D9">',
  '--related',
  'Content-Type: image/png; name="image001.png"',
  'Content-ID: <image001.png@01DD54D9>',
  'Content-Disposition: inline; filename="image001.png"',
  'Content-Transfer-Encoding: base64',
  '',
  'iVBORw0KGgo=',
  '--related--',
  '',
  '--outer',
  'Content-Type: application/pdf; name="Wall hung Cabinets.pdf"',
  'Content-Disposition: attachment; filename="Wall hung Cabinets.pdf"',
  'Content-Transfer-Encoding: base64',
  '',
  'JVBERi0xLjQK',
  '--outer',
  'Content-Type: message/rfc822',
  'Content-Disposition: attachment; filename="Earlier quote.eml"',
  '',
  'From: Vendor <vendor@example.com>',
  'Subject: Earlier quote',
  '',
  'The nested body.',
  '--outer--',
  '',
].join('\r\n');

describe('attached email', () => {
  test('recognises an untyped Outlook item from its first bytes', async () => {
    expect(await sniffEmailMessage(new Blob([ATTACHED_ITEM]))).toBe(true);
  });

  test('does not mistake a PDF, a note or a CSV for an email', () => {
    expect(looksLikeEmailMessage('%PDF-1.4\n%âãÏÓ\n1 0 obj')).toBe(false);
    expect(looksLikeEmailMessage('From: the site office\n\nBring the drawings.')).toBe(false);
    expect(looksLikeEmailMessage('name,from,subject\nA,B,C')).toBe(false);
  });

  test('only second-guesses a type that says nothing', () => {
    expect(shouldSniffForEmail(null)).toBe(true);
    expect(shouldSniffForEmail('application/octet-stream')).toBe(true);
    expect(shouldSniffForEmail('application/pdf')).toBe(false);
    expect(shouldSniffForEmail('text/plain')).toBe(false);
  });

  test('reads the header Outlook shows, folded addresses included', async () => {
    const email = await parseAttachedEmail(new Blob([ATTACHED_ITEM]));

    expect(email.subject).toBe('30100_Casework_RFQ');
    expect(email.from).toEqual({ name: 'Mahavir Singh', address: 'mahavir@example.com' });
    expect(email.to.map((person) => person.address)).toEqual(['ella@example.com']);
    expect(email.cc.map((person) => person.name)).toEqual(['Tomasz Bartosiak', 'Steven Bonilla']);
    expect(email.date).not.toBeNull();
  });

  test('draws the signature logo in the body instead of listing it as a file', async () => {
    const email = await parseAttachedEmail(new Blob([ATTACHED_ITEM]));

    expect(email.html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
    expect(email.html).not.toContain('cid:');
    expect(email.attachments.map((file) => file.name)).not.toContain('image001.png');
  });

  test('keeps a nested email as its own attachment, not spliced into this body', async () => {
    const email = await parseAttachedEmail(new Blob([ATTACHED_ITEM]));

    expect(email.attachments.map((file) => [file.name, file.mimeType])).toEqual([
      ['Wall hung Cabinets.pdf', 'application/pdf'],
      ['Earlier quote.eml', 'message/rfc822'],
    ]);
    expect(email.html).not.toContain('The nested body.');
    expect(await email.attachments[0]?.blob.text()).toStartWith('%PDF-1.4');
  });

  test('leaves a cid the message cannot satisfy for the renderer to drop', () => {
    const html = '<img src="cid:logo@x"><img src="cid:missing@x">';
    const images = new Map([['logo@x', 'data:image/png;base64,AA==']]);

    expect(inlineContentIdImages(html, images)).toBe(
      '<img src="data:image/png;base64,AA=="><img src="cid:missing@x">'
    );
  });
});
