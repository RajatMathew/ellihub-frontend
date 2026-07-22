import { format, isValid, parseISO } from 'date-fns';

export function formatEmailDate(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'MMM d, yyyy, h:mm a') : value;
}
