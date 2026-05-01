import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';
import {
  CONTACTS_DEFAULT_PAGE_SIZE,
  CONTACTS_SEARCH_DEBOUNCE_MS,
  isContactsSortByField,
  type ContactsSortByField,
} from '@/modules/directory/constants/contacts/contact-list.constants';

export type ContactListParamPatch = Record<string, string | undefined>;

export function useContactListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), CONTACTS_DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: ContactsSortByField = isContactsSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as ContactsSortByField)
    : 'fullName';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const roleFilter = searchParams.get('professionalRoleId') ?? undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: ContactListParamPatch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (!value) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const updateSearchParam = useDebouncedCallback((value: string) => {
    updateParams({ search: value || undefined, page: undefined });
  }, CONTACTS_SEARCH_DEBOUNCE_MS);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      updateSearchParam(value);
    },
    [updateSearchParam],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({
      search: undefined,
      professionalRoleId: undefined,
      page: undefined,
    });
  }, [updateParams]);

  return {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    roleFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  };
}
