import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useInfiniteSelectOptions } from '@/app/hooks/use-infinite-select-options';
import { gcApi } from '@/modules/directory/api/gc.api';
import type { GCStatus, GeneralContractor } from '@/modules/directory/schemas/gc.schema';

export type GCPickerOption = InfiniteSearchSelectOption;

type UseGCPickerOptionsParams = {
  search: string;
  selectedOptions?: GCPickerOption[];
  enabled?: boolean;
  pageSize?: number;
  queryScope?: string;
  status?: GCStatus;
};

export function toGCPickerOption(gc: GeneralContractor): GCPickerOption {
  return {
    value: gc.id,
    label: gc.name,
    description: gc.email ?? gc.phone ?? undefined,
    badge: gc.status === 'INACTIVE' ? 'Inactive' : undefined,
    disabled: gc.status === 'INACTIVE',
  };
}

export function useGCPickerOptions({
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
  status,
}: UseGCPickerOptionsParams) {
  return useInfiniteSelectOptions({
    queryKey: ['gcs', queryScope, search, status, pageSize],
    queryFn: (page) =>
      gcApi.list({
        search: search || undefined,
        status,
        page,
        limit: pageSize,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    mapItemToOption: toGCPickerOption,
    selectedOptions,
    enabled,
  });
}
