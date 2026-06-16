export const DEPARTMENT_DEFAULT_PAGE_SIZE = 10;
export const DEPARTMENT_SEARCH_DEBOUNCE_MS = 300;

export const DEPARTMENT_SORT_FIELDS = ['name', 'employeeCount', 'createdAt'] as const;

export type DepartmentSortByField = (typeof DEPARTMENT_SORT_FIELDS)[number];

export function isDepartmentSortByField(value: string): value is DepartmentSortByField {
  return DEPARTMENT_SORT_FIELDS.includes(value as DepartmentSortByField);
}
