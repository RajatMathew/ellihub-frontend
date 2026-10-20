import { describe, expect, test } from 'bun:test';

import {
  pickerEntries,
  toAttachmentFile,
  type PickerItem,
} from '../src/modules/email/lib/ellihub-file-picker';

// "Select from ElliHub files" in the composer: browse Files, pick, attach.

const item = (overrides: Partial<PickerItem>): PickerItem => ({
  id: 'f1',
  type: 'FILE',
  name: 'invoice.pdf',
  displayName: null,
  mimeType: 'application/pdf',
  size: 1024,
  ...overrides,
});

describe('a folder in the picker', () => {
  test('lists folders first, each group by name', () => {
    const { folders, files } = pickerEntries([
      item({ id: 'b', name: 'b.pdf' }),
      item({ id: 'z', type: 'FOLDER', name: 'Zoning' }),
      item({ id: 'a', name: 'a.pdf' }),
      item({ id: 'c', type: 'FOLDER', name: 'Contracts' }),
    ]);

    expect(folders.map((entry) => entry.id)).toEqual(['c', 'z']);
    expect(files.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  test('narrows to the filter, by the name Files shows', () => {
    const { files } = pickerEntries(
      [item({ id: 'a', name: 'x1', displayName: 'Invoice 42' }), item({ id: 'b', name: 'photo' })],
      'invoice'
    );

    expect(files.map((entry) => entry.id)).toEqual(['a']);
  });

  test('leaves out a file the reader may not download', () => {
    const locked = item({
      id: 'locked',
      capabilities: {
        read: true,
        download: false,
        export: false,
        upload: false,
        createFolder: false,
        update: false,
        delete: false,
      },
    });

    expect(pickerEntries([locked]).files).toEqual([]);
  });
});

describe('a picked file', () => {
  test('attaches under its Files name and stored type', () => {
    const file = toAttachmentFile(
      item({ displayName: 'Invoice 42.pdf' }),
      new Blob(['%PDF'], { type: '' })
    );

    expect(file.name).toBe('Invoice 42.pdf');
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBe(4);
  });
});
