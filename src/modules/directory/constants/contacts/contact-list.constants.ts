export const CONTACTS_DEFAULT_PAGE_SIZE = 10;

export const CONTACTS_SORT_BY_OPTIONS = ['fullName', 'createdAt', 'updatedAt'] as const;

export type ContactsSortByField = (typeof CONTACTS_SORT_BY_OPTIONS)[number];
