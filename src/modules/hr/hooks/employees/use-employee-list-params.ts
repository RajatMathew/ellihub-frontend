import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  EMPLOYEE_LIST_DEFAULT_PAGE_SIZE,
  EMPLOYEE_LIST_SEARCH_DEBOUNCE_MS,
} from '@/modules/hr/constants/employees/employee-list.constants';
import type { ListEmployeesParams } from '@/modules/hr/schemas/employee.schema';

export function useEmployeeListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: EMPLOYEE_LIST_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    searchDebounceMs: EMPLOYEE_LIST_SEARCH_DEBOUNCE_MS,
  });

  const params: ListEmployeesParams = {
    page: listParams.page,
    size: listParams.size,
    sortBy: listParams.sortBy,
    sortOrder: listParams.sortOrder,
    search: listParams.searchQuery || undefined,
  };

  return {
    ...listParams,
    params,
  };
}
