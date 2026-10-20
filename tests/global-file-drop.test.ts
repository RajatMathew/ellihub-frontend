import { describe, expect, test } from 'bun:test';

import {
  currentDropDestination,
  dropPrompt,
  isFileDrag,
  offerDropDestination,
} from '../src/modules/files/global-drop/global-drop';

// elli-ui#1333: drag files over any page, drop them on the island.

describe('a drag the island answers', () => {
  test('is files from the computer', () => {
    expect(isFileDrag(['Files'])).toBe(true);
  });

  test('is not a row dragged inside the app, or text', () => {
    expect(isFileDrag(['text/plain'])).toBe(false);
    expect(isFileDrag(['application/x-elli-task'])).toBe(false);
    expect(isFileDrag(undefined)).toBe(false);
  });
});

describe('the island', () => {
  test('says how many files, when it is more than one', () => {
    expect(dropPrompt(1)).toBe('Drop to save to Files');
    expect(dropPrompt(3)).toBe('Drop 3 files to save to Files');
  });

  test('a page leaving takes back only its own offer', () => {
    const files = Symbol('files');
    const other = Symbol('other');
    offerDropDestination(files, { folderId: 'f', label: 'Invoices' });
    // A page that never offered cannot clear another's offer.
    offerDropDestination(other, null);
    expect(currentDropDestination()).toEqual({ folderId: 'f', label: 'Invoices' });

    offerDropDestination(files, null);
    expect(currentDropDestination()).toBeNull();
  });
});
