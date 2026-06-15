export const RFQ_DEFAULT_PAGE_SIZE = 25;
export const RFQ_SEARCH_DEBOUNCE_MS = 300;

export const RFQ_SORT_BY_OPTIONS = [
  'rfqNumber',
  'title',
  'bidDeadline',
  'estimatedBudget',
  'createdAt',
] as const;

export type RFQSortByField = (typeof RFQ_SORT_BY_OPTIONS)[number];

export function isRFQSortByField(value: string | null): value is RFQSortByField {
  return RFQ_SORT_BY_OPTIONS.includes(value as RFQSortByField);
}
