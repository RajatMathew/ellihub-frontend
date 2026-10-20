import { toDateOnly } from '@/app/lib/dates';

/** An API calendar date as a date input's value (`YYYY-MM-DD`), or '' when there is none. */
export function toDateInputValue(value: unknown): string {
  if (typeof value === 'string' || value instanceof Date) return toDateOnly(value) ?? '';
  return '';
}
