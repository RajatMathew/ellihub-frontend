import type { SearchableSelectOption } from '@/app/components/ui/searchable-select';
import type { Lookup } from '@/modules/lookup/schemas/lookup.schema';

type SelectOption = Pick<SearchableSelectOption, 'value' | 'label'>;

export function normalizeProjectSelectText(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]+/g, ' ');
}

export function normalizeProjectSelectValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

function formatLookupLabel(value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';

  if (/^[A-Z0-9_-]+$/.test(trimmed) && /[_-]/.test(trimmed)) {
    return trimmed
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }

  return trimmed;
}

export function ensureSelectedOption<TOption extends SelectOption>(
  options: TOption[],
  selectedOption: TOption | null | undefined
) {
  if (!selectedOption?.value) return options;
  if (options.some((option) => option.value === selectedOption.value)) return options;
  return [selectedOption, ...options];
}

export function ensureCurrentStringOption<TOption extends SelectOption>(
  options: TOption[],
  value: string | null | undefined
) {
  const currentValue = value?.trim();
  if (!currentValue) return options;

  if (options.some((option) => option.value === currentValue)) return options;

  const normalizedValue = normalizeProjectSelectText(currentValue);
  const normalizedMatch = options.find(
    (option) =>
      normalizeProjectSelectText(option.value) === normalizedValue ||
      normalizeProjectSelectText(option.label) === normalizedValue
  );

  return [
    {
      value: currentValue,
      label: normalizedMatch?.label ?? formatLookupLabel(currentValue),
    } as TOption,
    ...options,
  ];
}

export function buildProjectContractTypeOptions(contractTypes: Lookup[] | undefined) {
  const seen = new Set<string>();
  const options: SelectOption[] = [];

  for (const type of contractTypes ?? []) {
    const value = type.label || type.name || type.id;
    if (!value) continue;

    const normalizedValue = normalizeProjectSelectText(value);
    if (seen.has(normalizedValue)) continue;

    seen.add(normalizedValue);
    options.push({
      value,
      label: formatLookupLabel(type.name || type.label || type.id),
    });
  }

  return options;
}
