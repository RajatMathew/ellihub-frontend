import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  isPTOSortByField,
  PTO_DEFAULT_PAGE_SIZE,
  PTO_SEARCH_DEBOUNCE_MS,
  type PTOSortByField,
} from '@/modules/hr/constants/pto/pto-list.constants';

export function usePTOListParams() {
  return useResourceListParams({
    defaultPageSize: PTO_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'startDate',
    defaultSortOrder: 'desc',
    searchDebounceMs: PTO_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is PTOSortByField => Boolean(value && isPTOSortByField(value)),
  });
}
