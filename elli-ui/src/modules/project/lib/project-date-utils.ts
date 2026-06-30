const ISO_DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/;

export function toDateInputValue(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const isoDatePrefix = value.match(ISO_DATE_PREFIX_PATTERN)?.[1];
    if (isoDatePrefix) return isoDatePrefix;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
  }

  return '';
}
