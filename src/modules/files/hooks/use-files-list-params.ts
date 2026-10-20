import { useEffect } from 'react';

import { f, useListState } from '@/app/components/data-table';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import {
  DATE_PRESETS,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  SORT_OPTIONS,
} from '@/modules/files/constants/files.constants';
import { LayoutGrid, List } from 'lucide-react';

export type FilesViewMode = 'list' | 'grid';
export type FilesSearchMode = 'global' | 'folder';

/**
 * Files uses the data-table kit for URL state and for its header, not for its
 * body.
 *
 * The body still renders itself — it swaps between a sectioned table and a card
 * grid, rows navigate on click, and the error state sits outside the grid — so
 * this stops short of `DataTable`. The header, which used to be a bespoke
 * component with its own copy of every control's class string, now comes from
 * the same schema every other list uses.
 *
 * Three of its controls are not filters: the view toggle, the sort select and
 * the search scope. They are declared `persistent` (or owned by the search),
 * so `clearFilters` cannot switch the user back to list view or reset the sort.
 */
const FILES_FILTERS = [
  f.search({
    debounceMs: SEARCH_DEBOUNCE_MS,
    placeholder: 'Search files...',
    // Search where you are: the open folder and everything inside it. See
    // `getFilesSearchAncestorId` for what each scope covers.
    scope: {
      defaultValue: 'folder',
      key: 'searchMode',
      options: [
        { label: 'This folder', value: 'folder' },
        { label: 'All files', value: 'global' },
      ],
      placeholders: {
        folder: 'Search this folder and its subfolders',
        global: 'Search all files',
      },
    },
  }),
  f.dateRangePopover({
    key: 'dateFrom',
    label: 'Uploaded',
    placeholder: 'Date range',
    presets: DATE_PRESETS,
    toKey: 'dateTo',
  }),
  f.sortSelect({
    options: [
      { label: 'Newest', value: 'createdAt' },
      { label: 'Name', value: 'name' },
      { label: 'Size', value: 'size' },
      { label: 'Last Updated', value: 'updatedAt' },
    ],
    placeholder: 'Sort by',
  }),
  f.toggleGroup({
    defaultValue: 'list',
    iconOnly: true,
    key: 'view',
    options: [
      { icon: List, label: 'List view', value: 'list' },
      { icon: LayoutGrid, label: 'Grid view', value: 'grid' },
    ],
    persistent: true,
  }),
];

export function useFilesListParams() {
  const state = useListState({
    filters: FILES_FILTERS,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: { by: 'updatedAt', fields: SORT_OPTIONS, order: 'desc' },
  });

  // The current folder is navigation, not a filter: it is set by the breadcrumbs
  // and by clicking a folder row, and clearing filters must not leave it.
  const { searchParams, updateParams } = useUrlParamPatch();
  const folderId = searchParams.get('folderId') ?? undefined;

  useEffect(() => {
    if (!searchParams.has('folderPath')) return;

    updateParams({ folderPath: undefined });
  }, [searchParams, updateParams]);

  return {
    ...state,
    // Read from `rawValues`: a range owns two URL keys but `FilterValues` maps
    // only the definition's primary `key`, so `dateTo` is not on the typed side.
    dateFrom: state.rawValues.dateFrom,
    dateTo: state.rawValues.dateTo,
    folderId,
    searchMode: (state.rawValues.searchMode === 'global' ? 'global' : 'folder') as FilesSearchMode,
    searchQuery: state.values.search ?? '',
    updateParams,
    viewMode: (state.rawValues.view === 'grid' ? 'grid' : 'list') as FilesViewMode,
  };
}
