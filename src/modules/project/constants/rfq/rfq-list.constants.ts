export const RFQ_DEFAULT_PAGE_SIZE = 25;

export const RFQ_SORT_BY_OPTIONS = ['rfqNumber', 'title', 'rfqDate', 'createdAt'] as const;

export type RFQSortByField = (typeof RFQ_SORT_BY_OPTIONS)[number];
