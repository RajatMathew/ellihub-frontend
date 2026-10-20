import { describe, expect, test } from 'bun:test';

import {
  mergeOptionCache,
  type SearchSelectOption,
} from '../src/app/lib/search-select-option-cache';

const vendor = (value: string, label: string): SearchSelectOption => ({ value, label });

describe('search select option cache', () => {
  test('returns the same map when nothing is new, so a render-time merge settles', () => {
    const cache = mergeOptionCache(new Map(), [[vendor('v1', 'Acme')]]);

    // A parent that re-creates its arrays every render passes equal contents in
    // new arrays; that must not look like an update, or the select would set
    // state on every render and never stop.
    expect(mergeOptionCache(cache, [[vendor('v1', 'Acme')], []])).toBe(cache);
  });

  test('keeps a selected value labelled after a new search replaces the options', () => {
    const firstPage = mergeOptionCache(new Map(), [[vendor('v1', 'Acme'), vendor('v2', 'Brick')]]);
    const afterSearch = mergeOptionCache(firstPage, [[vendor('v9', 'Zenith')]]);

    expect(afterSearch.get('v1')?.label).toBe('Acme');
    expect(afterSearch.get('v9')?.label).toBe('Zenith');
    expect(firstPage.has('v9')).toBe(false);
  });

  test('replaces an option whose label changed', () => {
    const cache = mergeOptionCache(new Map(), [[vendor('v1', 'Acme')]]);
    const renamed = mergeOptionCache(cache, [[vendor('v1', 'Acme Corp')]]);

    expect(renamed).not.toBe(cache);
    expect(renamed.get('v1')?.label).toBe('Acme Corp');
  });

  test('lets a later list win, as the selected option overrode the page before', () => {
    const cache = mergeOptionCache(new Map(), [
      [vendor('v1', 'From the page')],
      [vendor('v1', 'From the selection')],
    ]);

    expect(cache.get('v1')?.label).toBe('From the selection');
  });

  test('settles when the page and the selection disagree about the same value', () => {
    // An opened task seeds the picker with `{ value, label }`; once the assignee
    // list lands the same person arrives again with an email as description.
    // Each merge used to write one, then the other, and hand back a new map
    // every render — the select set state forever (React #301).
    const fromPage: SearchSelectOption = { ...vendor('v1', 'Acme'), description: 'a@acme.test' };
    const lists = [[fromPage], [vendor('v1', 'Acme')]];
    const cache = mergeOptionCache(new Map(), lists);

    expect(mergeOptionCache(cache, lists)).toBe(cache);
    expect(cache.get('v1')?.description).toBeUndefined();
  });
});
