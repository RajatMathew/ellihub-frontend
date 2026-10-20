import { describe, expect, test } from 'bun:test';

import { applyUrlParamPatch } from '../src/app/hooks/use-url-param-patch';

/**
 * A URL patch that changes nothing must not navigate: navigating pushed the
 * same URL again, and Back then had to be pressed twice to leave it.
 */

describe('applying a URL patch', () => {
  test('changes nothing when clearing a key that is already absent', () => {
    expect(applyUrlParamPatch('?folderId=temp', { page: undefined, search: undefined })).toBeNull();
  });

  test('changes nothing when setting a key to the value it already has', () => {
    expect(applyUrlParamPatch('?folderId=temp&view=grid', { view: 'grid' })).toBeNull();
  });

  test('sets and clears keys, keeping the rest', () => {
    expect(
      applyUrlParamPatch('?folderId=root&search=s5&view=grid', {
        folderId: 'temp',
        search: undefined,
      })
    ).toBe('folderId=temp&view=grid');
  });

  test('treats an empty or null value as removing the key', () => {
    expect(applyUrlParamPatch('?a=1&b=2', { a: '', b: null })).toBe('');
  });

  test('accepts a query string with or without its leading ?', () => {
    expect(applyUrlParamPatch('folderId=temp', { folderId: 'temp' })).toBeNull();
    expect(applyUrlParamPatch('', { page: '2' })).toBe('page=2');
  });
});
