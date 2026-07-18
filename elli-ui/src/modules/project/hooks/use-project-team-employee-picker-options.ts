import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useInfiniteSelectOptions } from '@/app/hooks/use-infinite-select-options';
import {
  toEmployeePickerOption,
  type EmployeePickerOption,
} from '@/modules/hr/hooks/use-employee-picker-options';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import { projectApi } from '@/modules/project/api/project.api';
import { projectKeys } from '@/modules/project/constants/project.keys';

type UseProjectTeamEmployeePickerOptionsParams = {
  projectId: string;
  search: string;
  selectedOptions?: InfiniteSearchSelectOption[];
  enabled?: boolean;
  pageSize?: number;
};

function toProjectTeamEmployeePickerOption(employee: Employee): EmployeePickerOption {
  const option = toEmployeePickerOption(employee);

  return {
    ...option,
    badge: employee.authRole === 'pm' ? 'PM' : 'Member',
  };
}

export function useProjectTeamEmployeePickerOptions({
  projectId,
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
}: UseProjectTeamEmployeePickerOptionsParams) {
  return useInfiniteSelectOptions({
    queryKey: [...projectKeys.employeeOptions(projectId), 'infinite', search, pageSize],
    queryFn: async (page) => {
      const response = await projectApi.listProjectEmployeeOptions(projectId, {
        page,
        size: pageSize,
        search: search || undefined,
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
    mapItemToOption: toProjectTeamEmployeePickerOption,
    selectedOptions,
    enabled: !!projectId && enabled,
  });
}
