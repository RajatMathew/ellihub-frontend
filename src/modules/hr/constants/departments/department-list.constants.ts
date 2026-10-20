export const DEPARTMENT_DEFAULT_PAGE_SIZE = 10;

export const DEPARTMENT_SORT_FIELDS = ['name', 'employeeCount', 'createdAt'] as const;

export type DepartmentSortByField = (typeof DEPARTMENT_SORT_FIELDS)[number];
