import { employeesApi } from '@/modules/hr/api/employees.api';
import { employeesKeys } from '@/modules/hr/constants/employees.keys';
import type { ListEmployeesParams } from '@/modules/hr/schemas/employee.schema';
import { useQuery } from '@tanstack/react-query';

type EmployeeLookupParams = Partial<ListEmployeesParams>;
type UseEmployeesQueryOptions = {
  enabled?: boolean;
};

const DEFAULT_EMPLOYEE_LOOKUP_PARAMS: ListEmployeesParams = {
  page: 1,
  size: 25,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useEmployeesQuery = (
  params?: EmployeeLookupParams,
  options?: UseEmployeesQueryOptions
) => {
  const normalizedParams: ListEmployeesParams = {
    ...DEFAULT_EMPLOYEE_LOOKUP_PARAMS,
    ...params,
  };

  return useQuery({
    queryKey: employeesKeys.list(normalizedParams),
    queryFn: () => employeesApi.list(normalizedParams),
    enabled: options?.enabled ?? true,
  });
};
