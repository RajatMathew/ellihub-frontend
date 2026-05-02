import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  DEPARTMENT_DEFAULT_PAGE_SIZE,
  DEPARTMENT_SEARCH_DEBOUNCE_MS,
  isDepartmentSortByField,
  type DepartmentSortByField,
} from '@/modules/hr/constants/departments/department-list.constants';

export type DepartmentListParamPatch = Record<string, string | undefined>;

export function useDepartmentListParams() {
  return useResourceListParams({
    defaultPageSize: DEPARTMENT_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    searchDebounceMs: DEPARTMENT_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is DepartmentSortByField =>
      Boolean(value && isDepartmentSortByField(value)),
  });
}
