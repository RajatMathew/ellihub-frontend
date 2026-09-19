import { describe, expect, test } from 'bun:test';

import { filePreviewLoadKey } from '../src/modules/files/lib/file-preview-load';

/**
 * elli-ui#975: clicking an email attachment crashed the page with React's
 * minified error #185, "Maximum update depth exceeded".
 *
 * The preview dialog keyed its load effect on the `file` object. The reading
 * pane builds that object inline in JSX and its `loadFile` reports download
 * progress into state, so every progress tick re-rendered the pane, produced a
 * new object, and re-ran the load — which reported progress again.
 */
describe('file preview load key', () => {
  const attachment = {
    id: 'attachment-1',
    name: 'quote.pdf',
    mimeType: 'application/pdf',
    size: 12_345,
    type: 'FILE' as const,
  };

  test('two equal files from different renders load once', () => {
    // The loop in one line: same attachment, fresh object, as the reading pane
    // produces on every progress tick. Keyed on the object these differ, and
    // the effect refetches; keyed on the file they do not.
    const firstRender = filePreviewLoadKey({
      open: true,
      file: { ...attachment },
      hasLoader: true,
    });
    const secondRender = filePreviewLoadKey({
      open: true,
      file: { ...attachment },
      hasLoader: true,
    });

    expect(firstRender).toBe(secondRender);
    expect(firstRender).toBe('attachment-1');
  });

  test('a different attachment loads again', () => {
    expect(filePreviewLoadKey({ open: true, file: attachment, hasLoader: true })).not.toBe(
      filePreviewLoadKey({
        open: true,
        file: { ...attachment, id: 'attachment-2' },
        hasLoader: true,
      })
    );
  });

  test('nothing is fetched for a dialog that is not showing a loadable file', () => {
    // Each of these guarded the old effect too; they are kept because the
    // effect now has no `open`/`file` of its own to check.
    expect(filePreviewLoadKey({ open: false, file: attachment, hasLoader: true })).toBeNull();
    expect(filePreviewLoadKey({ open: true, file: null, hasLoader: true })).toBeNull();
    expect(filePreviewLoadKey({ open: true, file: undefined, hasLoader: true })).toBeNull();
    // No loader: the dialog reads the file straight off the files endpoint.
    expect(filePreviewLoadKey({ open: true, file: attachment, hasLoader: false })).toBeNull();
  });

  test('a folder has nothing to fetch', () => {
    expect(
      filePreviewLoadKey({
        open: true,
        file: { ...attachment, type: 'FOLDER' },
        hasLoader: true,
      })
    ).toBeNull();
  });

  test('closing the dialog stops the load, and reopening starts it again', () => {
    const openKey = filePreviewLoadKey({ open: true, file: attachment, hasLoader: true });
    expect(filePreviewLoadKey({ open: false, file: attachment, hasLoader: true })).toBeNull();
    expect(filePreviewLoadKey({ open: true, file: attachment, hasLoader: true })).toBe(openKey);
  });
});
