/**
 * PO retainage is hidden in the client, not retired: the API still stores it,
 * shows it in the activity log and sends it to the PDF. Its update writes
 * whatever arrives - 0 when nothing does - so the form has to carry the
 * stored value through an edit untouched.
 */

/** The PO's stored retainage as the form holds it; none stored is none sent. */
export function getStoredRetainagePercent(value: string | null | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
