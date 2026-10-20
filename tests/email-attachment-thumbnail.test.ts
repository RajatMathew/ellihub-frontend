import { describe, expect, test } from 'bun:test';

import {
  createLruCache,
  createTaskLimiter,
  getAttachmentThumbnailKind,
  MAX_THUMBNAIL_BYTES,
} from '../src/modules/email/lib/email-attachment-thumbnail';

const KB = 1024;

describe('getAttachmentThumbnailKind', () => {
  test('a PDF the provider calls octet-stream still gets its first page drawn', () => {
    expect(
      getAttachmentThumbnailKind({
        name: 'MATERIAL REQUEST FORM.pdf',
        mimeType: 'application/octet-stream',
        sizeBytes: 33 * KB,
      })
    ).toBe('pdf');
  });

  test('photos, Word documents and workbooks each get their own renderer', () => {
    expect(getAttachmentThumbnailKind({ name: 'site.JPG', sizeBytes: 900 * KB })).toBe('image');
    expect(getAttachmentThumbnailKind({ name: 'Scope.docx', sizeBytes: 40 * KB })).toBe('docx');
    expect(getAttachmentThumbnailKind({ name: 'Takeoff.xlsx', sizeBytes: 40 * KB })).toBe(
      'workbook'
    );
  });

  test('a file over its cap keeps the badge, so opening the mail does not pull it', () => {
    expect(
      getAttachmentThumbnailKind({ name: 'drawings.pdf', sizeBytes: MAX_THUMBNAIL_BYTES.pdf + 1 })
    ).toBeNull();
    expect(
      getAttachmentThumbnailKind({ name: 'drawings.pdf', sizeBytes: MAX_THUMBNAIL_BYTES.pdf })
    ).toBe('pdf');
  });

  test('a workbook is capped lower than a PDF: its whole grid is laid out', () => {
    expect(
      getAttachmentThumbnailKind({ name: 'budget.xlsx', sizeBytes: MAX_THUMBNAIL_BYTES.pdf })
    ).toBeNull();
  });

  test('a file with no size is not assumed to be small', () => {
    expect(getAttachmentThumbnailKind({ name: 'scan.pdf' })).toBeNull();
    expect(getAttachmentThumbnailKind({ name: 'scan.pdf', sizeBytes: 0 })).toBeNull();
  });

  test('formats a browser cannot draw, or must not, get no thumbnail', () => {
    expect(getAttachmentThumbnailKind({ name: 'IMG_0042.HEIC', sizeBytes: KB })).toBeNull();
    expect(
      getAttachmentThumbnailKind({ name: 'logo.svg', mimeType: 'image/svg+xml', sizeBytes: KB })
    ).toBeNull();
    expect(getAttachmentThumbnailKind({ name: 'archive.zip', sizeBytes: KB })).toBeNull();
    expect(getAttachmentThumbnailKind({ name: 'legacy.doc', sizeBytes: KB })).toBeNull();
    expect(getAttachmentThumbnailKind({ name: 'export.csv', sizeBytes: KB })).toBeNull();
  });

  test('a page the server calls HTML stays HTML, whatever its name says', () => {
    expect(
      getAttachmentThumbnailKind({ name: 'invoice.pdf', mimeType: 'text/html', sizeBytes: KB })
    ).toBeNull();
  });
});

describe('createTaskLimiter', () => {
  test('never runs more than the limit at once, and runs every task', async () => {
    const run = createTaskLimiter(2);
    let active = 0;
    let peak = 0;
    const releases: Array<() => void> = [];

    const results = Array.from({ length: 5 }, (_, index) =>
      run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => releases.push(resolve));
        active -= 1;
        return index;
      })
    );

    // Release whatever is running until everything has finished.
    while (releases.length > 0 || active > 0) {
      await Promise.resolve();
      releases.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(await Promise.all(results)).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  test('a failed task frees its slot for the next one', async () => {
    const run = createTaskLimiter(1);
    const failed = run(() => Promise.reject(new Error('provider 502')));
    const next = run(() => Promise.resolve('drawn'));

    await expect(failed).rejects.toThrow('provider 502');
    expect(await next).toBe('drawn');
  });
});

describe('createLruCache', () => {
  test('evicts the least recently used entry and hands it back to be freed', () => {
    const evicted: string[] = [];
    const cache = createLruCache<string>(2, (value) => evicted.push(value));

    cache.set('a', 'blob:a');
    cache.set('b', 'blob:b');
    cache.get('a'); // a is now newer than b
    cache.set('c', 'blob:c');

    expect(evicted).toEqual(['blob:b']);
    expect(cache.get('a')).toBe('blob:a');
    expect(cache.get('b')).toBeUndefined();
  });

  test('replacing an entry frees the old value', () => {
    const evicted: string[] = [];
    const cache = createLruCache<string>(4, (value) => evicted.push(value));

    cache.set('a', 'blob:old');
    cache.set('a', 'blob:new');

    expect(evicted).toEqual(['blob:old']);
    expect(cache.size).toBe(1);
  });
});
