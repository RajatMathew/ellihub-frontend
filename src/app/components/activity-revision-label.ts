/**
 * The description without the " - rev N" the server appends.
 *
 * Its own module rather than a second export from `activity-revision-badge`:
 * that file exports a component, and Fast Refresh stops working for a file
 * that also exports something else.
 */
export function stripActivityRevisionSuffix(description: string, revision?: number | null) {
  if (!revision) return description;

  return description.replace(new RegExp(`\\s+-\\s+rev\\s+${revision}\\s*$`, 'i'), '').trim();
}
