import { describe, expect, test } from 'bun:test';

import {
  canPreviewAttachmentInline,
  getAttachmentPreviewKind,
  resolveAttachmentMimeType,
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
