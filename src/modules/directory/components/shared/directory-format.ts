import { formatDateOnly } from '@/app/lib/dates';

/** A calendar date (a document's expiry), or a dash when unset. */
export function formatDirectoryDate(value: string | null | undefined) {
  return formatDateOnly(value, undefined, '-');
}
