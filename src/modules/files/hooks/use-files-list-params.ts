import { useCallback, useMemo } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import {
  DEFAULT_PAGE_SIZE,
  isSortField,
  SEARCH_DEBOUNCE_MS,
  type SortField,
} from '@/modules/files/constants/files.constants';

export type FilesViewMode = 'list' | 'grid';
export type FilesSearchMode = 'global' | 'folder';

export interface FolderPathEntry {
  id: string;
  name: string;
}

export function encodeFolderPath(path: FolderPathEntry[]): string | undefined {
  if (path.length === 0) return undefined;

  return path.map((entry) => `${entry.id}:${entry.name}`).join('|');
}

function decodeFolderPath(raw: string | null): FolderPathEntry[] {
  if (!raw) return [];

  return raw.split('|').map((segment) => {
    const colonIndex = segment.indexOf(':');

    if (colonIndex === -1) {
      return { id: segment, name: segment };
    }

    return {
      id: segment.slice(0, colonIndex),
      name: segment.slice(colonIndex + 1),
    };
  });
}

export function useFilesListParams() {
  const listParams = useResourceListParams({
    defaultPageSize: DEFAULT_PAGE_SIZE,
    defaultSortBy: 'updatedAt',
    defaultSortOrder: 'desc',
    searchDebounceMs: SEARCH_DEBOUNCE_MS,
    isSortBy: (value): value is SortField => Boolean(value && isSortField(value)),
  });

  const viewMode: FilesViewMode = listParams.searchParams.get('view') === 'grid' ? 'grid' : 'list';
  const searchMode: FilesSearchMode =
    listParams.searchParams.get('searchMode') === 'folder' ? 'folder' : 'global';
  const folderId = listParams.searchParams.get('folderId') ?? undefined;
  const dateFrom = listParams.searchParams.get('dateFrom') ?? undefined;
  const dateTo = listParams.searchParams.get('dateTo') ?? undefined;
  const folderPath = useMemo(
    () => decodeFolderPath(listParams.searchParams.get('folderPath')),
    [listParams.searchParams]
  );

  const clearFilters = useCallback(() => {
    listParams.setSearchInput('');
    listParams.updateParams({
      search: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: undefined,
    });
  }, [listParams]);

  return {
    ...listParams,
    folderId,
    folderPath,
    searchMode,
    viewMode,
    dateFrom,
    dateTo,
    clearFilters,
  };
}
