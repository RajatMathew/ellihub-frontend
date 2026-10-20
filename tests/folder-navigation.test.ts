import { describe, expect, test } from 'bun:test';

import { folderHref, getParentFolder } from '../src/modules/files/lib/folder-navigation';

const path = [
  { id: 'f-projects', name: 'Projects' },
  { id: 'f-langone', name: 'NYU Langone' },
  { id: 'f-rfq', name: 'RFQ' },
];

describe('Back in Files', () => {
  test('goes one level up, named for where it lands', () => {
    expect(getParentFolder(path, 'Files')).toEqual({ folderId: 'f-langone', name: 'NYU Langone' });
  });

  test("goes to the explorer's top folder from a folder just below it", () => {
    expect(getParentFolder(path.slice(0, 1), 'Files')).toEqual({
      folderId: undefined,
      name: 'Files',
    });
    // A project's files are rooted at the project's folder, named for the project.
    expect(getParentFolder(path.slice(0, 1), 'PS 101 Renovation')).toEqual({
      folderId: undefined,
      name: 'PS 101 Renovation',
    });
  });

  test('is not offered at the top folder', () => {
    expect(getParentFolder([], 'Files')).toBeNull();
  });
});

describe("a folder's URL", () => {
  const here = {
    pathname: '/app/files',
    search: '?folderId=f-rfq&view=grid&sortBy=name&page=3&search=bid',
  };

  test('keeps how the files are viewed, and ends the search', () => {
    expect(folderHref(here, 'f-langone')).toBe(
      '/app/files?folderId=f-langone&view=grid&sortBy=name'
    );
  });

  test("opens the explorer's top folder without a folderId", () => {
    expect(folderHref(here, undefined)).toBe('/app/files?view=grid&sortBy=name');
    expect(folderHref({ pathname: '/app/files', search: '?folderId=x' }, undefined)).toBe(
      '/app/files'
    );
  });
});
