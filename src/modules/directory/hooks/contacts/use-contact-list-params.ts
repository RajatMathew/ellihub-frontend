import { useCallback } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  CONTACTS_DEFAULT_PAGE_SIZE,
  CONTACTS_SEARCH_DEBOUNCE_MS,
  isContactsSortByField,
  type ContactsSortByField,
} from '@/modules/directory/constants/contacts/contact-list.constants';

export type ContactListParamPatch = Record<string, string | undefined>;

export function useContactListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: CONTACTS_DEFAULT_PAGE_SIZE,
    defaultSortBy: 'fullName',
    defaultSortOrder: 'asc',
    searchDebounceMs: CONTACTS_SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is ContactsSortByField =>
      Boolean(value && isContactsSortByField(value)),
  });

  const roleFilter = listParams.searchParams.get('professionalRoleId') ?? undefined;

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      professionalRoleId: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    roleFilter,
    clearFilters,
  };
}
