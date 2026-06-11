import { useMemo } from 'react';

import type { ResourceListParamPatch } from '@/app/hooks/use-resource-list-params';
import { useFilesColumns } from '@/modules/files/components/files-columns';
import { DEFAULT_PAGE_SIZE, isSortField } from '@/modules/files/constants/files.constants';
import type { SortField } from '@/modules/files/constants/files.constants';
import type { SectionedFiles } from '@/modules/files/hooks/use-files-display-data';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';

interface UseFilesTableParams {
  sectionedData: SectionedFiles;
  totalCount: number;
  page: number;
  size: number;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  showLocation?: boolean;
  locationRootId?: string;
  locationRootLabel?: string;
  updateParams: (patch: ResourceListParamPatch) => void;
  onPreview: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onExportFolder: (item: FileItem) => void;
  onPinPrimeContract?: (item: FileItem) => void;
  canPinPrimeContract?: (item: FileItem) => boolean;
  onSetPrimeContractPrimary?: (item: FileItem, isPrimary: boolean) => void;
  canSetPrimeContractPrimary?: (item: FileItem) => boolean;
  canMutate?: boolean;
}

export function useFilesTable({
  sectionedData,
  totalCount,
  page,
  size,
  sortBy,
  sortOrder,
  showLocation,
  locationRootId,
  locationRootLabel,
  updateParams,
  onPreview,
  onRename,
  onDelete,
  onExportFolder,
  onPinPrimeContract,
  canPinPrimeContract,
  onSetPrimeContractPrimary,
  canSetPrimeContractPrimary,
  canMutate = true,
}: UseFilesTableParams) {
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );
  const columns = useFilesColumns({
    showLocation,
    locationRootId,
    locationRootLabel,
    onPreview,
    onRename,
    onDelete,
    onExportFolder,
    onPinPrimeContract,
    canPinPrimeContract,
    onSetPrimeContractPrimary,
    canSetPrimeContractPrimary,
    canMutate,
  });
  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: sectionedData.data,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const previous = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const patches: ResourceListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }

      if (next.pageSize !== size) {
        patches.size = next.pageSize === DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }

      updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const column = next[0];

      if (!column) {
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
        return;
      }

      const nextSortBy = isSortField(column.id) ? column.id : 'updatedAt';
      const nextSortOrder = column.desc ? 'desc' : 'asc';

      updateParams({
        sortBy: nextSortBy === 'updatedAt' ? undefined : nextSortBy,
        sortOrder: nextSortOrder === 'desc' ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  return { table, columns };
}
