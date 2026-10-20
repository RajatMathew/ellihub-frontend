/**
 * Projects a save can be filed under, offered as a row of chips above the
 * folder picker (elli-ui#1067).
 *
 * A thread linked to three projects used to open the picker inside the first
 * one only, with no way across to the other two. Each chip moves the picker's
 * root to that project's folder.
 */
export interface SaveToFilesScope {
  /** The project's id; its folder is looked up when the chip is picked. */
  id: string;
  label: string;
}

/**
 * Which project's name to show over the folders on screen.
 *
 * The root follows a lookup that takes a moment, and until it lands the picker
 * keeps showing the previous project's folder. Naming the folder actually on
 * screen, rather than the chip just clicked, keeps the label and the list in
 * agreement while the next one loads.
 */
export function labelForShownRoot(
  scopes: readonly SaveToFilesScope[],
  shownRootFolderId: string | undefined,
  folderIdOf: (scopeId: string) => string | undefined,
  fallback: string
): string {
  if (!shownRootFolderId) return fallback;

  const shown = scopes.find((scope) => folderIdOf(scope.id) === shownRootFolderId);
  return shown?.label ?? fallback;
}
