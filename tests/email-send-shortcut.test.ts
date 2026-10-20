import {
  formattingShortcutLabel,
  isApplePlatform,
  isSendShortcut,
  modifierKeyLabel,
  sendShortcutLabel,
} from '@/modules/email/lib/email-send-shortcut';
import { describe, expect, test } from 'bun:test';

describe('isApplePlatform', () => {
  test('recognises the platform strings a Mac browser reports', () => {
    expect(isApplePlatform('MacIntel')).toBe(true);
    expect(isApplePlatform('macOS')).toBe(true);
    expect(isApplePlatform('iPhone')).toBe(true);
    expect(isApplePlatform('iPad')).toBe(true);
  });

  test('is false for Windows and Linux', () => {
    expect(isApplePlatform('Win32')).toBe(false);
    expect(isApplePlatform('Windows')).toBe(false);
    expect(isApplePlatform('Linux x86_64')).toBe(false);
  });

  test('falls back to not-Apple when the platform is unknown', () => {
    // `navigator.platform` is deprecated and `userAgentData` is not everywhere,
    // so an absent value has to mean something. Ctrl is the safer guess: it is
    // the label that is merely unidiomatic on a Mac rather than a key the
    // reader does not have.
    expect(isApplePlatform(undefined)).toBe(false);
    expect(isApplePlatform(null)).toBe(false);
    expect(isApplePlatform('')).toBe(false);
  });
});

describe('modifierKeyLabel', () => {
  test('prints the modifier the reader is actually holding', () => {
    // The shortcut list used to print ⌘ to everyone, naming a key a Windows
    // reader does not have (elli-ui#1199).
    expect(modifierKeyLabel(true)).toBe('⌘');
    expect(modifierKeyLabel(false)).toBe('Ctrl');
  });
});

describe('sendShortcutLabel', () => {
  test('spells the keys out for assistive technology', () => {
    // A screen reader says nothing useful for ↵ and "command" for ⌘, so the
    // accessible name cannot reuse the glyphs the chips show.
    expect(sendShortcutLabel(true)).toBe('Command + Enter');
    expect(sendShortcutLabel(false)).toBe('Ctrl + Enter');
  });
});

describe('isSendShortcut', () => {
  const press = (over: Partial<Parameters<typeof isSendShortcut>[0]>) =>
    isSendShortcut({ key: 'Enter', metaKey: false, ctrlKey: false, ...over });

  test('both modifiers send, on every platform', () => {
    // The mini composer and the full-screen one must agree, and a Mac user who
    // learnt Ctrl+Enter on Windows should not be caught out (elli-ui#1199).
    expect(press({ metaKey: true })).toBe(true);
    expect(press({ ctrlKey: true })).toBe(true);
  });

  test('a bare Enter keeps inserting a new line', () => {
    expect(press({})).toBe(false);
  });

  test('Shift+Enter is a line break, not a send', () => {
    expect(press({ metaKey: true, shiftKey: true })).toBe(false);
    expect(press({ ctrlKey: true, shiftKey: true })).toBe(false);
  });

  test('Alt held is not a send either', () => {
    expect(press({ metaKey: true, altKey: true })).toBe(false);
  });

  test('a modifier with any other key is not a send', () => {
    expect(press({ key: 'a', metaKey: true })).toBe(false);
    expect(press({ key: 'NumpadEnter', ctrlKey: true })).toBe(false);
  });
});

describe('formattingShortcutLabel (elli-ui#1337)', () => {
  test('prints the Mac glyphs, Shift before Command as macOS menus do', () => {
    expect(formattingShortcutLabel('b', true)).toBe('⌘B');
    expect(formattingShortcutLabel('z', true, { shift: true })).toBe('⇧⌘Z');
  });

  test('spells the keys out elsewhere', () => {
    expect(formattingShortcutLabel('b', false)).toBe('Ctrl+B');
    expect(formattingShortcutLabel('z', false, { shift: true })).toBe('Ctrl+Shift+Z');
  });
});
