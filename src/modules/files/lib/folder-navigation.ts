/**
 * Where a folder lives in the URL, and which folder Back goes to.
 *
 * The header's path links and the explorer's Back link both use this, so the
 * two can never disagree about where a folder is.
 */

interface FolderEntry {
  id: string;
  name: string;
}

/**
 * The URL that opens `folderId` - or the explorer's top folder when it is
 * undefined - keeping how the files are being looked at (view, sort, dates).
 * The search is dropped: leaving for another folder ends it, as opening a
 * folder row does.
 */
export function folderHref(
  location: { pathname: string; search: string },
  folderId: string | undefined
): string {
  const params = new URLSearchParams(location.search);

  if (folderId) params.set('folderId', folderId);
  else params.delete('folderId');
  params.delete('folderPath');
  params.delete('page');
  params.delete('search');

  const query = params.toString();
  return query ? `${location.pathname}?${query}` : location.pathname;
}

/**
 * The folder one level up from the open one, or null at the top. `breadcrumbs`
 * is the open folder's path below the explorer's top folder, the open folder
 * last; the top folder itself goes by `rootLabel` and needs no id.
 */
export function getParentFolder(
  breadcrumbs: readonly FolderEntry[],
  rootLabel: string
): { folderId: string | undefined; name: string } | null {
  if (breadcrumbs.length === 0) return null;
  if (breadcrumbs.length === 1) return { folderId: undefined, name: rootLabel };

  const parent = breadcrumbs[breadcrumbs.length - 2];
  return { folderId: parent.id, name: parent.name };
}
