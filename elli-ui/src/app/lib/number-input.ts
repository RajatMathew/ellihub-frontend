export function numberInputValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '';

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric === 0) return '';

  return value as string | number | readonly string[];
}

export function parseNumberInputValue(value: string) {
  if (value === '') return 0;

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function parseNonNegativeNumberInputValue(value: string) {
  return Math.max(0, parseNumberInputValue(value));
}
