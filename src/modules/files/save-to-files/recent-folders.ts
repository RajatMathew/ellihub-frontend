import { z } from 'zod';

/**
 * Remembers the last destinations a user saved to, per picker scope, so the
 * common case (same project folder over and over) is one tap away.
 */

const STORAGE_KEY = 'files:recent-destinations';
const MAX_RECENT_FOLDERS = 5;

const recentFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const recentFolderStoreSchema = z.record(z.string(), z.array(recentFolderSchema));

export type RecentFolder = z.infer<typeof recentFolderSchema>;

type RecentFolderStore = z.infer<typeof recentFolderStoreSchema>;

/** Recents are kept per root so a project picker never suggests global folders. */
export function getRecentFoldersScope(rootFolderId?: string): string {
  return rootFolderId ?? '__root__';
}

function readStore(): RecentFolderStore {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return {};

    const result = recentFolderStoreSchema.safeParse(JSON.parse(raw));

    return result.success ? result.data : {};
  } catch (error) {
    console.error('[recent-folders] Failed to read recent destinations:', error);
    return {};
  }
}

function writeStore(store: RecentFolderStore): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('[recent-folders] Failed to persist recent destinations:', error);
  }
}

export function readRecentFolders(scope: string): RecentFolder[] {
  return readStore()[scope] ?? [];
}

export function pushRecentFolder(scope: string, folder: RecentFolder): RecentFolder[] {
  const store = readStore();
  const next = [folder, ...(store[scope] ?? []).filter((entry) => entry.id !== folder.id)].slice(
    0,
    MAX_RECENT_FOLDERS
  );

  writeStore({ ...store, [scope]: next });

  return next;
}
