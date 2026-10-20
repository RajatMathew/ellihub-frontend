import { useSyncExternalStore } from 'react';

import { toastUndoable } from '@/app/components/toast-undoable';
import { toast } from 'sonner';

/**
 * How long a sent message is held before it actually goes, so it can still be
 * taken back. Gmail's default window.
 */
const UNDO_SEND_WINDOW_MS = 10_000;

/**
 * Every send still inside its window, at module scope rather than in a
 * component, so leaving the mailbox for another section inside the window still
 * sends. The send closures are mutations, and TanStack runs a mutation to
 * completion after the component that started it has gone.
 *
 * `keys` are what the send is for — a draft's ids — so a draft already on its
 * way cannot be sent a second time (see `useHeldEmailSends`).
 */
const pending = new Map<symbol, { timer: number; keys: readonly string[] }>();
/** A new set after every change, so React can tell it changed. */
let heldKeys: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

/**
 * Closing the tab is the one exit that loses a held message — nothing survives
 * the page — so while one is held the browser asks first, the way Gmail does.
 */
function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
}

function changed() {
  heldKeys = new Set([...pending.values()].flatMap((entry) => entry.keys));
  if (pending.size > 0) window.addEventListener('beforeunload', warnBeforeUnload);
  else window.removeEventListener('beforeunload', warnBeforeUnload);
  for (const listener of listeners) listener();
}

/** False when the send had already left the window — undone, or gone. */
function release(key: symbol) {
  if (!pending.delete(key)) return false;
  changed();
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The keys of every email still inside its undo-send window. For a new
 * message those are its draft's ids, which is how the composer knows not to
 * offer Send on a draft that is already on its way.
 */
export function useHeldEmailSends(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => heldKeys);
}

/**
 * Holds a message for the undo window instead of sending it, with a countdown
 * toast that offers to take it back.
 *
 * `send` runs when the window closes and owns its own success and error
 * feedback (the send mutations toast both), so the countdown is simply taken
 * down at that point. `onUndo` puts the message back in front of the person;
 * it runs only if the send was really stopped — a click that lands in the same
 * tick the timer fires must not report an undo that did not happen.
 */
export function holdSendWithUndo({
  keys = [],
  send,
  onUndo,
}: {
  keys?: readonly string[];
  send: () => void;
  onUndo: () => void;
}) {
  const key = Symbol('held-send');
  // Reads `toastId` only when the window closes, seconds after the
  // declaration below has run.
  const timer = window.setTimeout(() => {
    if (!release(key)) return;
    toast.dismiss(toastId);
    send();
  }, UNDO_SEND_WINDOW_MS);
  pending.set(key, { timer, keys });
  changed();

  const toastId = toastUndoable({
    icon: 'send',
    title: 'Sending…',
    reversedLabel: 'Sending cancelled.',
    windowSeconds: UNDO_SEND_WINDOW_MS / 1000,
    // The timer above is the window, not sonner's: sonner pauses on hover.
    dismissOnExpiry: false,
    onUndo: () => {
      if (!release(key)) return;
      window.clearTimeout(timer);
      onUndo();
    },
  });
}
