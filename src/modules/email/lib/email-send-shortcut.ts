/**
 * How the send shortcut is spelled, on the keyboard the reader actually has.
 *
 * The composer has always answered to Cmd/Ctrl + Enter — every surface, both
 * modifiers — but nothing on screen said so, so it was only findable by reading
 * the shortcut list behind the `i` in the reading toolbar (elli-ui#1199).
 *
 * Which modifier to *print* is the only hard part. Both keys work everywhere,
 * deliberately, so a Mac user who learnt Ctrl+Enter on Windows is not caught
 * out; but printing "Ctrl" to someone holding a Mac keyboard reads as wrong,
 * and printing "⌘" to someone on Windows reads as a key they do not have. The
 * label follows the platform; the handler keeps taking either.
 */

/** The platform string, taken as an argument so this stays testable. */
export function isApplePlatform(platform: string | undefined | null): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform ?? '');
}

/**
 * Read once at module scope rather than per render: it cannot change, and
 * `userAgentData` is the non-deprecated spelling where it exists.
 */
function detectApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return isApplePlatform(data?.platform ?? navigator.platform ?? navigator.userAgent);
}

/**
 * The modifier as the shortcut list prints it. One definition, so the list and
 * the composer's tooltip cannot name different keys.
 */
export function modifierKeyLabel(isApple: boolean): string {
  return isApple ? '⌘' : 'Ctrl';
}

/**
 * One string, for a `title` and for the accessible name. Spelled out rather
 * than glyphs: a screen reader says "command" for ⌘ but nothing useful for ↵.
 */
export function sendShortcutLabel(isApple: boolean): string {
  return isApple ? 'Command + Enter' : 'Ctrl + Enter';
}

/** Resolved for this browser, for components that just want to render it. */
export const IS_APPLE_PLATFORM = detectApplePlatform();

/**
 * A formatting shortcut as its tooltip prints it (elli-ui#1337): "⌘B" and
 * "⇧⌘Z" on a Mac, "Ctrl+B" and "Ctrl+Shift+Z" elsewhere — the order and glyphs
 * each platform's own menus use.
 */
export function formattingShortcutLabel(
  key: string,
  isApple: boolean,
  options: { shift?: boolean } = {}
): string {
  const letter = key.toUpperCase();
  if (isApple) return `${options.shift ? '⇧' : ''}⌘${letter}`;
  return ['Ctrl', ...(options.shift ? ['Shift'] : []), letter].join('+');
}

/** The shape both composers' key handlers see — React's synthetic event or a native one. */
export interface SendShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/**
 * Whether this key press means "send".
 *
 * One definition, used by the new-message controller and by the reply
 * composer. It used to be written out separately in each, which is how the two
 * composers come to disagree about a shortcut that is supposed to work in both
 * (elli-ui#1199).
 *
 * Either modifier counts, on every platform: only the printed label follows the
 * keyboard. Shift and Alt are excluded so that Shift+Enter keeps inserting a
 * line break and no accelerator built on top of Cmd+Enter fires a send by
 * accident.
 */
export function isSendShortcut(event: SendShortcutEvent): boolean {
  if (event.key !== 'Enter') return false;
  if (event.shiftKey || event.altKey) return false;
  return event.metaKey || event.ctrlKey;
}
