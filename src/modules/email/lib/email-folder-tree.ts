/**
 * Ordering a mailbox's folders the way a mailbox is shaped (elli-ui#1229).
 *
 * The API answers with a flat list. That was fine while it only ever held the
 * handful of folders sitting at the top of the mailbox; now that it carries the
 * whole tree, a flat render is actively misleading — a mailbox with
 * `Projects/2026/Archive` and `Archive` shows two rows both reading "Archive"
 * and no way to tell which is which.
 *
 * So: parents first, each followed by its own children, and a depth for the
 * caller to indent by.
 */

/** The shape both folder menus share; matches `emailFolderSchema`. */
export interface EmailTreeFolder {
  id: string;
  /**
   * The provider's id. `parentId` points at *this*, not at `id` — the server
   * stores the provider's own `parentFolderId` verbatim. Matching on `id`
   * would find nothing and flatten the whole tree back out.
   */
  providerId: string;
  name: string;
  parentId?: string | null;
}

export interface EmailFolderTreeEntry<T extends EmailTreeFolder> {
  folder: T;
  /** 0 for a folder at the top of the mailbox, 1 for its children, and so on. */
  depth: number;
}

const byName = <T extends EmailTreeFolder>(left: T, right: T) =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

/**
 * Flatten `folders` into display order: every folder, parents immediately
 * followed by their descendants, siblings by name.
 *
 * A folder whose parent is not in the list is treated as a root. That is the
 * normal case rather than an error — Graph reports a top-level folder's parent
 * as the mailbox's hidden root, which is never itself listed — and it is also
 * what keeps a partial list (one level failed to load) rendering everything it
 * does have instead of dropping the orphans.
 */
export function buildEmailFolderTree<T extends EmailTreeFolder>(
  folders: T[]
): EmailFolderTreeEntry<T>[] {
  const childrenByParent = new Map<string, T[]>();
  const roots: T[] = [];
  const known = new Set(folders.map((folder) => folder.providerId));

  for (const folder of folders) {
    const parentId = folder.parentId;
    if (!parentId || !known.has(parentId) || parentId === folder.providerId) {
      roots.push(folder);
      continue;
    }
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(folder);
    childrenByParent.set(parentId, siblings);
  }

  const ordered: EmailFolderTreeEntry<T>[] = [];
  // A cycle in provider data would otherwise recurse forever. `visited` also
  // means a folder listed twice is rendered once.
  const visited = new Set<string>();

  const walk = (folder: T, depth: number) => {
    if (visited.has(folder.providerId)) return;
    visited.add(folder.providerId);
    ordered.push({ folder, depth });
    for (const child of (childrenByParent.get(folder.providerId) ?? []).sort(byName)) {
      walk(child, depth + 1);
    }
  };

  for (const root of [...roots].sort(byName)) walk(root, 0);

  // Anything left is inside a cycle and has no reachable root. Better shown
  // flat than not at all — this list is the only way into those folders.
  for (const folder of folders) {
    if (!visited.has(folder.providerId)) {
      visited.add(folder.providerId);
      ordered.push({ folder, depth: 0 });
    }
  }

  return ordered;
}

/**
 * Indentation for a depth, as a class rather than a style: arbitrary pixel
 * values are an ESLint error in `src/modules/**`, and Tailwind cannot build a
 * class name from a variable.
 *
 * Capped deliberately. Past the third level the indent stops growing rather
 * than pushing a folder's name off the edge of a 16rem menu; the nesting is
 * still readable from the order.
 */
const FOLDER_DEPTH_INDENT = ['', 'ps-6', 'ps-9', 'ps-12'] as const;

export function emailFolderIndentClass(depth: number): string {
  return FOLDER_DEPTH_INDENT[Math.min(Math.max(depth, 0), FOLDER_DEPTH_INDENT.length - 1)]!;
}
