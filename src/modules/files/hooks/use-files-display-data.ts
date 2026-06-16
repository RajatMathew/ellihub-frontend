import { useMemo } from 'react';

import type { SortField } from '@/modules/files/constants/files.constants';
import type { FileItem } from '@/modules/files/schemas/file.schema';

interface UseFilesDisplayDataParams {
  items: FileItem[];
  page: number;
  size: number;
  searchQuery: string;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

export interface SectionedFiles {
  protectedItems: FileItem[];
  sharedItems: FileItem[];
  data: FileItem[];
}

function getFileName(file: FileItem) {
  return file.displayName || file.name || '';
}

function getTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

export function sectionFileItems(items: FileItem[]): SectionedFiles {
  const protectedItems = items.filter((file) => !file.isDeletable);
  const sharedItems = items.filter((file) => file.isDeletable);

  return { protectedItems, sharedItems, data: [...protectedItems, ...sharedItems] };
}

export function useFilesDisplayData({
  items,
  page,
  size,
  searchQuery,
  sortBy,
  sortOrder,
  dateFrom,
  dateTo,
}: UseFilesDisplayDataParams) {
  const filteredData = useMemo(() => {
    let result = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((file) => getFileName(file).toLowerCase().includes(query));
    }

    if (dateFrom || dateTo) {
      const fromTimestamp = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
      const toTimestamp = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Infinity;

      result = result.filter((file) => {
        const timestamp = getTime(file.createdAt);
        return timestamp >= fromTimestamp && timestamp <= toTimestamp;
      });
    }

    return [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = getFileName(a).localeCompare(getFileName(b));
          break;
        case 'size':
          comparison = (a.size ?? 0) - (b.size ?? 0);
          break;
        case 'createdAt':
          comparison = getTime(a.createdAt) - getTime(b.createdAt);
          break;
        case 'updatedAt':
        default:
          comparison = getTime(a.updatedAt) - getTime(b.updatedAt);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [dateFrom, dateTo, items, searchQuery, sortBy, sortOrder]);

  const listData = filteredData.slice((page - 1) * size, page * size);
  const sectionedData = useMemo<SectionedFiles>(() => {
    return sectionFileItems(listData);
  }, [listData]);

  return {
    filteredData,
    listData,
    sectionedData,
    totalCount: filteredData.length,
    hasActiveFilters: !!searchQuery || !!dateFrom || !!dateTo,
  };
}
