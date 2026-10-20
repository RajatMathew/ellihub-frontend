import { describe, expect, test } from 'bun:test';

import { DOCX_MIME_TYPE, isDocxPreviewable } from '../src/modules/files/lib/file-preview-docx';

describe('isDocxPreviewable', () => {
  test('a .docx attachment sent as octet-stream still previews', () => {
    expect(
      isDocxPreviewable({ name: 'Parking Space.docx', mimeType: 'application/octet-stream' })
    ).toBe(true);
  });

  test('the docx MIME type previews without an extension in the name', () => {
    expect(isDocxPreviewable({ name: 'Parking Space', mimeType: DOCX_MIME_TYPE })).toBe(true);
  });

  test('the display name counts when the stored name has no extension', () => {
    expect(isDocxPreviewable({ name: 'abc123', displayName: 'Scope.DOCX' })).toBe(true);
  });

  test('legacy .doc, .rtf and .pptx are not handed to the docx renderer', () => {
    expect(isDocxPreviewable({ name: 'Old.doc', mimeType: 'application/msword' })).toBe(false);
    expect(isDocxPreviewable({ name: 'Letter.rtf', mimeType: 'application/rtf' })).toBe(false);
    expect(isDocxPreviewable({ name: 'Deck.pptx' })).toBe(false);
    expect(isDocxPreviewable({ name: 'notes.docx.zip' })).toBe(false);
  });
});
