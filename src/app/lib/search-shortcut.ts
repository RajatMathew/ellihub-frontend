/**
 * The `/` key jumps into a page's search box, as on GitHub and in the mailbox.
 *
 * Only a bare `/` counts, and never while the person is typing somewhere else
 * or working in a dialog or menu: there the key belongs to what they are doing.
 */

export interface ShortcutKeyEvent {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  defaultPrevented: boolean;
  isComposing?: boolean;
}

export interface ShortcutTarget {
  matches: (selector: string) => boolean;
  closest: (selector: string) => unknown;
}

const TYPING_TARGETS = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const OVERLAYS = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

export function isSearchShortcut(event: ShortcutKeyEvent, target: ShortcutTarget | null): boolean {
  if (event.key !== '/' || event.defaultPrevented || event.isComposing) return false;
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  if (!target) return true;
  return !target.matches(TYPING_TARGETS) && !target.closest(OVERLAYS);
}
