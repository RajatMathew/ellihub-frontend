export const CONTACTS_DEFAULT_PAGE_SIZE = 10;
export const CONTACTS_SEARCH_DEBOUNCE_MS = 300;

export const CONTACTS_SORT_BY_OPTIONS = ['fullName', 'createdAt', 'updatedAt'] as const;

export type ContactsSortByField = (typeof CONTACTS_SORT_BY_OPTIONS)[number];

export function isContactsSortByField(value: string | null): value is ContactsSortByField {
  return CONTACTS_SORT_BY_OPTIONS.includes(value as ContactsSortByField);
}
