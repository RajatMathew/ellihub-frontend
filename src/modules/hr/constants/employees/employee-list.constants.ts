export const EMPLOYEE_LIST_DEFAULT_PAGE_SIZE = 25;

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const EMPLOYEE_SORT_BY_OPTIONS = [
  'name',
  'department.name',
  'email',
  'phoneNumber',
  'status',
  'startDate',
] as const;

export type EmployeeSortByField = (typeof EMPLOYEE_SORT_BY_OPTIONS)[number];
