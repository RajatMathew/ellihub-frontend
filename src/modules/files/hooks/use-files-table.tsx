import { useListTable, type ListQueryStatus } from '@/app/components/data-table';
import { useFilesColumns } from '@/modules/files/components/files-columns';
import type { SectionedFiles } from '@/modules/files/hooks/use-files-display-data';
import type { useFilesListParams } from '@/modules/files/hooks/use-files-list-params';
import type { FileItem } from '@/modules/files/schemas/file.schema';

interface UseFilesTableParams {
  sectionedData: SectionedFiles;
  totalCount: number;
  /** Files drives the kit's state layer but renders the body itself. */
  state: ReturnType<typeof useFilesListParams>;
  query: ListQueryStatus;
  showLocation?: boolean;
  locationRootId?: string;
  locationRootLabel?: string;
  onPreview: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onExportFolder: (item: FileItem) => void;
  onPinPrimeContract?: (item: FileItem) => void;
  canPinPrimeContract?: (item: FileItem) => boolean;
  onSetPrimeContractPrimary?: (item: FileItem, isPrimary: boolean) => void;
  canSetPrimeContractPrimary?: (item: FileItem) => boolean;
  canRename?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function useFilesTable({
  sectionedData,
  totalCount,
  state,
  query,
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
  canRename = true,
  canDelete = true,
  canExport = true,
}: UseFilesTableParams) {
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
    canRename,
    canDelete,
    canExport,
  });

  const list = useListTable({
    columns,
    getRowId: (row) => row.id,
    query,
    rows: sectionedData.data,
    state,
    totalCount,
  });

  return { columns, list, table: list.table };
}
