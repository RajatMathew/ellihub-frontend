import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Upload from anywhere (elli-ui#1333): drag files over any page and drop them
 * on the island that appears. These are the rules behind it, pure so they are
 * tested without a drag.
 */

/**
 * Where Save to Files starts after a drop, as the island names it. A page that
 * browses inside a subtree — a project's Files tab — says so with `rootFolderId`,
 * since the whole Files tree opens only for administrators.
 */
export type DropDestination = {
  folderId: string;
  label: string;
  rootFolderId?: string;
  rootLabel?: string;
};

/** A drag of files from the computer — not a row dragged inside the app. */
export function isFileDrag(types: readonly string[] | DOMStringList | undefined): boolean {
  return Array.from(types ?? []).includes('Files');
}

/** "Drop to save to Files", "Drop 3 files to save to Files" — a drag says how many, never which. */
export function dropPrompt(count: number): string {
  return count > 1 ? `Drop ${count} files to save to Files` : 'Drop to save to Files';
}

/**
 * The folder the page in front of the reader offers, when it offers one — the
 * folder open in Files, or a project's Files tab. The last page to offer wins;
 * leaving it takes its offer back, and Save to Files starts at the top of Files.
 */
let offered: { token: symbol; destination: DropDestination } | null = null;
const listeners = new Set<() => void>();

export function offerDropDestination(token: symbol, destination: DropDestination | null) {
  if (destination) offered = { token, destination };
  else if (offered?.token === token) offered = null;
  else return;
  listeners.forEach((listener) => listener());
}

/** The folder on offer right now, if any. */
export function currentDropDestination(): DropDestination | null {
  return offered?.destination ?? null;
}

export function useOfferedDropDestination(): DropDestination | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    currentDropDestination,
    () => null
  );
}

/**
 * Offers a page's folder to the island while the page is on screen, and takes
 * the offer back when it goes or when it has none to make.
 */
export function useOfferDropDestination(destination: DropDestination | null) {
  const [token] = useState(() => Symbol('drop-destination'));
  const folderId = destination?.folderId;
  const label = destination?.label;
  const rootFolderId = destination?.rootFolderId;
  const rootLabel = destination?.rootLabel;
  useEffect(() => {
    offerDropDestination(
      token,
      folderId && label ? { folderId, label, rootFolderId, rootLabel } : null
    );
    return () => offerDropDestination(token, null);
  }, [folderId, label, rootFolderId, rootLabel, token]);
}
