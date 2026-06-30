import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useInfiniteSelectOptions } from '@/app/hooks/use-infinite-select-options';
import { employeesApi } from '@/modules/hr/api/employees.api';
import type { Employee, EmployeeAuthRole } from '@/modules/hr/schemas/employee.schema';

export type EmployeePickerOption = InfiniteSearchSelectOption;

type UseEmployeePickerOptionsParams = {
  search: string;
  selectedOptions?: EmployeePickerOption[];
  enabled?: boolean;
  pageSize?: number;
  queryScope?: string;
  authRole?: EmployeeAuthRole | 'unlinked';
};

export function toEmployeePickerOption(employee: Employee): EmployeePickerOption {
  return {
    value: employee.id,
    label: employee.name,
    description: employee.email,
    badge: employee.authRole === 'unlinked' ? 'Unlinked' : undefined,
    disabled: employee.status === 'INACTIVE',
  };
}

export function useEmployeePickerOptions({
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
  authRole,
}: UseEmployeePickerOptionsParams) {
  return useInfiniteSelectOptions({
    queryKey: ['employees', queryScope, search, authRole, pageSize],
    queryFn: async (page) => {
      const response = await employeesApi.list({
        search: search || undefined,
        authRole,
        page,
        size: pageSize,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      return {
        data: response.data,
        pagination: {
          currentPage: response.pagination.currentPage,
          hasNextPage: response.pagination.currentPage < response.pagination.totalPages,
        },
      };
    },
    mapItemToOption: toEmployeePickerOption,
    selectedOptions,
    enabled,
  });
}
