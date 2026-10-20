import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useInfiniteSelectOptions } from '@/app/hooks/use-infinite-select-options';
import { departmentsApi } from '@/modules/hr/api/departments.api';
import type { Department } from '@/modules/hr/schemas/department.schema';

export type DepartmentPickerOption = InfiniteSearchSelectOption;

type UseDepartmentPickerOptionsParams = {
  search: string;
  selectedOptions?: DepartmentPickerOption[];
  enabled?: boolean;
  pageSize?: number;
  queryScope?: string;
};

export function toDepartmentPickerOption(department: Department): DepartmentPickerOption {
  return {
    value: department.id,
    label: department.name,
    description: department.description ?? undefined,
  };
}

/** Departments for a searchable picker, a page at a time, by name. */
export function useDepartmentPickerOptions({
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
}: UseDepartmentPickerOptionsParams) {
  return useInfiniteSelectOptions({
    queryKey: ['departments', queryScope, search, pageSize],
    queryFn: async (page) => {
      const response = await departmentsApi.list({
        search: search || undefined,
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
    mapItemToOption: toDepartmentPickerOption,
    selectedOptions,
    enabled,
  });
}
