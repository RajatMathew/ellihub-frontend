export const PTO_DEFAULT_PAGE_SIZE = 10;
export const PTO_SEARCH_DEBOUNCE_MS = 300;

export const PTO_SORT_FIELDS = ['startDate', 'updatedAt', 'status', 'employee.name'] as const;

export type PTOSortByField = (typeof PTO_SORT_FIELDS)[number];

export function isPTOSortByField(value: string): value is PTOSortByField {
  return PTO_SORT_FIELDS.includes(value as PTOSortByField);
}
