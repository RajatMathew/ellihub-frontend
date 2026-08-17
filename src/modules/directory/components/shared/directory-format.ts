/** Renders a stored timestamp as a plain calendar date, or a dash when unset. */
export function formatDirectoryDate(value: string | null | undefined) {
  if (!value) return '-';

  return new Date(value).toISOString().split('T')[0];
}
