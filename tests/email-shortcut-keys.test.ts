import { describe, expect, test } from 'bun:test';

import { resolveMailShortcut } from '../src/modules/email/lib/email-shortcut-keys';

/**
 * The mailbox's page-level shortcuts (elli-ui#921).
 *
 * The redesign's shortcut panel lists what the mailbox answers to, and a panel
 * that lists a key nothing handles is worse than no panel — so these pin the
 * three that were added (J/K, `/`, and Elliot moving to Shift+E) and, just as
 * importantly, the keys the page must NOT claim.
 */
describe('resolveMailShortcut', () => {
  test('J and K move between conversations like the arrows', () => {
    expect(resolveMailShortcut({ key: 'ArrowUp' })).toBe('previousConversation');
    expect(resolveMailShortcut({ key: 'k' })).toBe('previousConversation');
    expect(resolveMailShortcut({ key: 'K' })).toBe('previousConversation');
    expect(resolveMailShortcut({ key: 'ArrowDown' })).toBe('nextConversation');
    expect(resolveMailShortcut({ key: 'j' })).toBe('nextConversation');
  });

  test('slash jumps to search', () => {
    expect(resolveMailShortcut({ key: '/' })).toBe('jumpToSearch');
  });

  test('Elliot is Shift+E, leaving plain E to the thread', () => {
    // Plain `E` expands and collapses every message — the reading pane's key.
    // If the page claimed it too, one press would do both.
    expect(resolveMailShortcut({ key: 'e' })).toBeNull();
    expect(resolveMailShortcut({ key: 'E', shiftKey: true })).toBe('toggleAgent');
  });

  test('a held modifier hands the key back to the browser', () => {
    // ⌘K is the browser's, ⌘/ is not ours, and ⌥ combinations produce
    // characters someone may be trying to type.
    expect(resolveMailShortcut({ key: 'k', metaKey: true })).toBeNull();
    expect(resolveMailShortcut({ key: '/', ctrlKey: true })).toBeNull();
    expect(resolveMailShortcut({ key: 'j', altKey: true })).toBeNull();
    expect(resolveMailShortcut({ key: 'e', shiftKey: true, metaKey: true })).toBeNull();
  });

  test('claims nothing it has no handler for', () => {
    // Swallowing an unclaimed key is how a mail client breaks browser find.
    for (const key of ['a', 'r', 'd', 'f', 'g', 'Enter', 'Escape', 'Tab', '?']) {
      expect(resolveMailShortcut({ key })).toBeNull();
    }
  });

  test('Shift plus anything else is not a page shortcut', () => {
    // Shift is how capitals are typed; only the one pair is spoken for.
    expect(resolveMailShortcut({ key: 'J', shiftKey: true })).toBeNull();
    expect(resolveMailShortcut({ key: '?', shiftKey: true })).toBeNull();
  });
});
