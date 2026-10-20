import { describe, expect, test } from 'bun:test';

import { resolveUrlSearchChange } from '../src/app/hooks/use-url-search';

/**
 * A search box keeps what is typed while its own search reaches the URL, and
 * gives way to anything else that changes the URL's search.
 */
describe("the URL's search changing under a search box", () => {
  test("keeps the person's typing when it is the box's own search arriving", () => {
    // "nyu " was typed; the URL holds it trimmed. Adopting that would eat the
    // space, and the next word would run on: "nyulangone".
    expect(resolveUrlSearchChange('nyu', { synced: '', committed: 'nyu' })).toEqual({
      kind: 'own',
    });
  });

  test('gives way to Back, Forward or a link', () => {
    expect(resolveUrlSearchChange('', { synced: 'nyu', committed: 'nyu' })).toEqual({
      kind: 'external',
      input: '',
    });
    expect(resolveUrlSearchChange('nyu', { synced: '', committed: '' })).toEqual({
      kind: 'external',
      input: 'nyu',
    });
  });

  test('is nothing when the URL has not moved', () => {
    expect(resolveUrlSearchChange('nyu', { synced: 'nyu', committed: 'nyu' })).toEqual({
      kind: 'unchanged',
    });
  });
});
