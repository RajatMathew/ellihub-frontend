import { describe, expect, test } from 'bun:test';

import { isSearchShortcut, type ShortcutTarget } from '../src/app/lib/search-shortcut';

const key = (overrides: Partial<Parameters<typeof isSearchShortcut>[0]> = {}) => ({
  key: '/',
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  defaultPrevented: false,
  ...overrides,
});

/** A stand-in element: what it is, and what it sits inside. */
const target = (self: string[], ancestors: string[] = []): ShortcutTarget => ({
  matches: (selector) => self.some((tag) => selector.split(', ').includes(tag)),
  closest: (selector) =>
    [...self, ...ancestors].some((tag) => selector.split(', ').includes(tag)) || null,
});

describe('the / shortcut', () => {
  test('jumps into the search from anywhere on the page', () => {
    expect(isSearchShortcut(key(), target(['div']))).toBe(true);
    expect(isSearchShortcut(key(), null)).toBe(true);
  });

  test('is only a bare /', () => {
    expect(isSearchShortcut(key({ key: '?' }), null)).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true }), null)).toBe(false);
    expect(isSearchShortcut(key({ metaKey: true }), null)).toBe(false);
    expect(isSearchShortcut(key({ altKey: true }), null)).toBe(false);
    expect(isSearchShortcut(key({ defaultPrevented: true }), null)).toBe(false);
    expect(isSearchShortcut(key({ isComposing: true }), null)).toBe(false);
  });

  test('leaves the key alone while typing elsewhere', () => {
    expect(isSearchShortcut(key(), target(['input']))).toBe(false);
    expect(isSearchShortcut(key(), target(['textarea']))).toBe(false);
    expect(isSearchShortcut(key(), target(['[contenteditable="true"]']))).toBe(false);
  });

  test('leaves the key alone inside a dialog or a menu', () => {
    expect(isSearchShortcut(key(), target(['button'], ['[role="dialog"]']))).toBe(false);
    expect(isSearchShortcut(key(), target(['div'], ['[role="menu"]']))).toBe(false);
  });
});
