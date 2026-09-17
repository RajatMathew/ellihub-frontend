export type MailShortcutAction =
  | 'previousConversation'
  | 'nextConversation'
  | 'jumpToSearch'
  | 'toggleAgent';

type KeyEvent = {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
};

/**
 * What a keypress means to the mailbox page — navigation, search and the agent.
 *
 * Pulled out of the handler so the mapping can be tested without a DOM. The
 * conversation-level keys (R, E, F, A, D) live with the reading pane, which is
 * the thing that can act on them.
 *
 * Returns null for anything the page does not claim, which the caller must
 * treat as "leave it alone" — swallowing an unclaimed key is how a mail client
 * breaks browser find, or eats a character someone meant to type.
 */
export function resolveMailShortcut(event: KeyEvent): MailShortcutAction | null {
  if (event.altKey) return null;

  // Shift + E and not E: plain `E` expands and collapses the thread, which the
  // reading pane owns, and Elliot has a button of its own beside the shortcut.
  if (event.shiftKey) {
    if (event.metaKey || event.ctrlKey) return null;
    return event.key.toLowerCase() === 'e' ? 'toggleAgent' : null;
  }

  // A modifier means the browser or the OS is being addressed, not the mailbox.
  if (event.metaKey || event.ctrlKey) return null;

  if (event.key === '/') return 'jumpToSearch';

  const key = event.key.toLowerCase();
  if (event.key === 'ArrowUp' || key === 'k') return 'previousConversation';
  if (event.key === 'ArrowDown' || key === 'j') return 'nextConversation';

  return null;
}
