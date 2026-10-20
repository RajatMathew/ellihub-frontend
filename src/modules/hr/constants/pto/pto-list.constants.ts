export const PTO_DEFAULT_PAGE_SIZE = 10;

export const PTO_SORT_FIELDS = ['startDate', 'updatedAt', 'status', 'employee.name'] as const;

export type PTOSortByField = (typeof PTO_SORT_FIELDS)[number];
