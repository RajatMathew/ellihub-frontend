import { useMemo } from 'react';

import type { SortField } from '@/modules/files/constants/files.constants';
import { getFileItemBytes } from '@/modules/files/lib/file-item-size';
import { sectionFileItems, type SectionedFiles } from '@/modules/files/lib/file-sections';
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

function getFileName(file: FileItem) {
  return file.displayName || file.name || '';
}

function getTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
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
      let comparison: number;

      switch (sortBy) {
        case 'name':
          comparison = getFileName(a).localeCompare(getFileName(b));
          break;
        case 'size':
          // A folder sorts by everything below it.
          comparison = (getFileItemBytes(a) ?? 0) - (getFileItemBytes(b) ?? 0);
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
