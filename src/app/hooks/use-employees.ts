import { useQuery } from '@tanstack/react-query';

import { employeesApi, type ListEmployeesParams } from '@app/api/employees.api';

const employeeKeys = {
  all: ['employees'] as const,
  list: () => [...employeeKeys.all, 'list'] as const,
};

export const useEmployeesQuery = (params?: ListEmployeesParams) =>
  useQuery({
    queryKey: [...employeeKeys.list(), params],
    queryFn: () => employeesApi.list(params),
  });
