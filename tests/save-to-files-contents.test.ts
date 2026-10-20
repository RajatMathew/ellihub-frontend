import { describe, expect, test } from 'bun:test';

import { splitFolderContents } from '../src/modules/files/save-to-files/folder-contents';
import { resolveSaveNames } from '../src/modules/files/save-to-files/save-names';

type Child = Parameters<typeof splitFolderContents>[0] extends readonly (infer T)[] | undefined
  ? T
  : never;

const folder = (name: string, upload = true): Child =>
  ({ type: 'FOLDER', name, displayName: name, capabilities: { upload } }) as Child;
const file = (name: string): Child => ({ type: 'FILE', name, displayName: name }) as Child;

/**
 * elli-ui#1066: the picker listed sub-folders and silently dropped everything
 * else, so a folder full of files reported itself as having nothing in it.
 */
describe('what the folder picker shows for a folder', () => {
  test('lists the files that are already in the folder', () => {
    // The regression: this used to come back empty and the panel said
    // "No subfolders in Temp." over a folder holding two drawings.
    const { folders, files } = splitFolderContents([file('Finish-Schedule.png'), file('Site.jpg')]);

    expect(folders).toHaveLength(0);
    expect(files.map((item) => item.name)).toEqual(['Finish-Schedule.png', 'Site.jpg']);
  });

  test('keeps folders and files apart, in the order they arrived', () => {
    const { folders, files } = splitFolderContents([
      file('Invoice.pdf'),
      folder('Projects'),
      file('Scope.docx'),
      folder('Vendors'),
    ]);

    expect(folders.map((item) => item.name)).toEqual(['Projects', 'Vendors']);
    expect(files.map((item) => item.name)).toEqual(['Invoice.pdf', 'Scope.docx']);
  });

  test('a folder you cannot save into is browsable, not offered', () => {
    const { folders, restrictedFolders } = splitFolderContents([
      folder('Projects'),
      folder('Payroll', false),
    ]);

    expect(folders.map((item) => item.name)).toEqual(['Projects']);
    expect(restrictedFolders.map((item) => item.name)).toEqual(['Payroll']);
  });

  test('a folder with no capabilities at all is treated as writable', () => {
    // A missing flag means the API said nothing, not that it said no.
    const bare = { type: 'FOLDER', name: 'Temp', displayName: 'Temp' } as Child;

    expect(splitFolderContents([bare]).folders).toHaveLength(1);
  });

  test('the filter narrows files as well as folders', () => {
    // One box above one list: filtering to "site" and still seeing every file
    // is the box lying about what it does.
    const { folders, files } = splitFolderContents(
      [folder('Site Photos'), folder('Vendors'), file('Site-Access.jpg'), file('Invoice.pdf')],
      'site'
    );

    expect(folders.map((item) => item.name)).toEqual(['Site Photos']);
    expect(files.map((item) => item.name)).toEqual(['Site-Access.jpg']);
  });

  test('an absent children list is empty, not a crash', () => {
    expect(splitFolderContents(undefined)).toEqual({
      folders: [],
      restrictedFolders: [],
      files: [],
    });
  });
});

/**
 * elli-ui#1063: a selection of attachments could not be renamed on the way in,
 * so five files were filed as `image003.png` and renamed one at a time after.
 */
describe('the names a multi-file save writes under', () => {
  // What `getSourceDefaultName` hands over: the file name, extension dropped.
  const defaults = ['image003', 'Scan_2026_09_18'];

  test('each file takes its own name, positionally', () => {
    expect(resolveSaveNames(defaults, ['Site access', 'Signed contract'])).toEqual([
      'Site access',
      'Signed contract',
    ]);
  });

  test('renaming the second leaves the first alone', () => {
    // The shape of the old bug in reverse: one name field could not describe
    // two files, so neither of them could be renamed.
    expect(resolveSaveNames(defaults, ['', 'Signed contract'])).toEqual([
      'image003',
      'Signed contract',
    ]);
  });

  test('no names at all keeps every file as it came', () => {
    expect(resolveSaveNames(defaults)).toEqual(['image003', 'Scan_2026_09_18']);
  });

  test('a name of only spaces falls back rather than saving a nameless file', () => {
    expect(resolveSaveNames(defaults, ['   ', '  '])).toEqual(['image003', 'Scan_2026_09_18']);
  });

  test('surrounding space is never part of the name', () => {
    expect(resolveSaveNames(defaults, ['  Site access  ', 'x'])).toEqual(['Site access', 'x']);
  });

  test('more names than files does not invent a file', () => {
    expect(resolveSaveNames([defaults[0]!], ['a', 'b', 'c'])).toEqual(['a']);
  });
});
