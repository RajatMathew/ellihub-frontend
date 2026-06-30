import { useCallback, useEffect } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  DEFAULT_PAGE_SIZE,
  isSortField,
  SEARCH_DEBOUNCE_MS,
  type SortField,
} from '@/modules/files/constants/files.constants';

export type FilesViewMode = 'list' | 'grid';
export type FilesSearchMode = 'global' | 'folder';

export function useFilesListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: DEFAULT_PAGE_SIZE,
    defaultSortBy: 'updatedAt',
    defaultSortOrder: 'desc',
    searchDebounceMs: SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is SortField => Boolean(value && isSortField(value)),
  });

  const { searchParams, setSearchInput, updateParams } = listParams;

  const viewMode: FilesViewMode = searchParams.get('view') === 'grid' ? 'grid' : 'list';
  const searchMode: FilesSearchMode =
    searchParams.get('searchMode') === 'folder' ? 'folder' : 'global';
  const folderId = searchParams.get('folderId') ?? undefined;
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;

  useEffect(() => {
    if (!searchParams.has('folderPath')) return;

    updateParams({ folderPath: undefined });
  }, [searchParams, updateParams]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    updateParams({
      search: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: undefined,
    });
  }, [setSearchInput, updateParams]);

  return {
    ...listParams,
    folderId,
    searchMode,
    viewMode,
    dateFrom,
    dateTo,
    clearFilters,
  };
}
