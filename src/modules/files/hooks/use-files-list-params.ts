import { useCallback, useEffect } from 'react';

import { f, useListState } from '@/app/components/data-table';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import {
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  SORT_OPTIONS,
} from '@/modules/files/constants/files.constants';

export type FilesViewMode = 'list' | 'grid';
export type FilesSearchMode = 'global' | 'folder';

/**
 * Files uses the data-table kit for URL state only, not for rendering.
 *
 * Its header shares no controls with the filter schema — the date filter is a
 * popover with presets and a range calendar, sorting is a select rather than
 * column headers, the view toggle is not a filter, and search lives in the page
 * toolbar. The body also swaps between a sectioned table and a card grid. Going
 * through `DataTable` would take three render escape hatches and turn every
 * header control into a custom one, so it stops at this layer deliberately.
 *
 * The date bounds and folder are declared hidden: they carry no control of their
 * own here, but they belong in the request and in `clearFilters`.
 */
const FILES_FILTERS = [
  f.search({ debounceMs: SEARCH_DEBOUNCE_MS, placeholder: 'Search files...' }),
  f.hidden({ key: 'dateFrom' }),
  f.hidden({ key: 'dateTo' }),
];

export function useFilesListParams() {
  const state = useListState({
    filters: FILES_FILTERS,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: { by: 'updatedAt', fields: SORT_OPTIONS, order: 'desc' },
  });

  // View mode, search scope and the current folder are navigation state, not
  // filters, so they stay outside the schema and are read straight from the URL.
  const { searchParams, updateParams } = useUrlParamPatch();

  const viewMode: FilesViewMode = searchParams.get('view') === 'grid' ? 'grid' : 'list';
  const searchMode: FilesSearchMode =
    searchParams.get('searchMode') === 'folder' ? 'folder' : 'global';
  const folderId = searchParams.get('folderId') ?? undefined;

  useEffect(() => {
    if (!searchParams.has('folderPath')) return;

    updateParams({ folderPath: undefined });
  }, [searchParams, updateParams]);

  const setDateRange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      updateParams({ dateFrom: from, dateTo: to, page: undefined });
    },
    [updateParams]
  );

  return {
    ...state,
    dateFrom: state.values.dateFrom,
    handleSearchChange: state.setSearchInput,
    updateParams,
    dateTo: state.values.dateTo,
    folderId,
    searchMode,
    searchQuery: state.values.search ?? '',
    setDateRange,
    viewMode,
  };
}
