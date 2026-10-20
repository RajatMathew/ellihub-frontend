import { describe, expect, test } from 'bun:test';

import { getFilesSearchAncestorId } from '../src/modules/files/lib/file-search-scope';

/**
 * What a Files search covers. From inside a project folder, "All" searched the
 * whole drive — vendor folders answered a project search — and "This folder"
 * only the items directly inside, missing everything in a subfolder.
 */

const DRIVE_ROOT = 'drive-root';
const PROJECT = 'project-folder';
const SCHEDULE = 'schedule-folder';

describe('a Files search on the Files page', () => {
  const onDrive = { explorerRootId: undefined, driveRootId: DRIVE_ROOT };

  test('"This folder" covers the open folder and everything inside it', () => {
    expect(
      getFilesSearchAncestorId({ ...onDrive, searchMode: 'folder', currentFolderId: PROJECT })
    ).toBe(PROJECT);
  });

  test('"All files" covers the whole drive, wherever the user is', () => {
    expect(
      getFilesSearchAncestorId({ ...onDrive, searchMode: 'global', currentFolderId: PROJECT })
    ).toBeUndefined();
  });

  test('at the top of the drive, "This folder" is the whole drive too', () => {
    expect(
      getFilesSearchAncestorId({ ...onDrive, searchMode: 'folder', currentFolderId: DRIVE_ROOT })
    ).toBeUndefined();
  });
});

describe("a Files search on a project's Files tab", () => {
  const onProject = { explorerRootId: PROJECT, driveRootId: undefined };

  test('"All files" covers the whole project, never the drive', () => {
    expect(
      getFilesSearchAncestorId({ ...onProject, searchMode: 'global', currentFolderId: SCHEDULE })
    ).toBe(PROJECT);
  });

  test('"This folder" covers the open subfolder and everything inside it', () => {
    expect(
      getFilesSearchAncestorId({ ...onProject, searchMode: 'folder', currentFolderId: SCHEDULE })
    ).toBe(SCHEDULE);
  });
});
