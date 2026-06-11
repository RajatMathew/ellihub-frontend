import { useCallback, useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Card, CardContent, CardFooter } from '@/app/components/ui/card';
import { DataGrid } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import { FilesBreadcrumbs } from '@/modules/files/components/files-breadcrumbs';
import { FilesEmptyState } from '@/modules/files/components/files-empty-state';
import { FilesGridContent } from '@/modules/files/components/files-grid-content';
import { FilesListFilters } from '@/modules/files/components/files-list-filters';
import { FilesListTable } from '@/modules/files/components/files-list-table';
import { FilesPageDialogs } from '@/modules/files/components/files-page-dialogs';
import { FilesPageToolbar } from '@/modules/files/components/files-page-toolbar';
import { FolderExportProgressDialog } from '@/modules/files/components/folder-export-progress-dialog';
import { useFilesSearchQuery } from '@/modules/files/hooks/files.hooks';
import {
  sectionFileItems,
  useFilesDisplayData,
} from '@/modules/files/hooks/use-files-display-data';
import { useFilesFolderData } from '@/modules/files/hooks/use-files-folder-data';
import {
  encodeFolderPath,
  useFilesListParams,
  type FilesSearchMode,
  type FolderPathEntry,
} from '@/modules/files/hooks/use-files-list-params';
import { useFilesTable } from '@/modules/files/hooks/use-files-table';
import { useFolderZipExport } from '@/modules/files/hooks/use-folder-zip-export';
import type { FileItem } from '@/modules/files/schemas/file.schema';

interface FilesExplorerProps {
  title?: string;
  rootFolderId?: string;
  rootLabel?: string;
  readOnly?: boolean;
  primeContractPinning?: {
    folderId?: string;
    pinnedFileIds: string[];
    canPin: boolean;
    onPin: (file: FileItem) => void;
    canSetPrimary?: boolean;
    onSetPrimary?: (file: FileItem, isPrimary: boolean) => void;
  };
}

function getFileName(file: FileItem) {
  return file.displayName || file.name || '';
}

function getFolderPathFromBreadcrumbs(
  folder: FileItem,
  rootId: string | undefined,
  fallbackPath: FolderPathEntry[]
): FolderPathEntry[] {
  if (!folder.breadcrumbs?.length) {
    return [...fallbackPath, { id: folder.id, name: getFileName(folder) }];
  }

  const rootIndex = rootId ? folder.breadcrumbs.findIndex((entry) => entry.id === rootId) : -1;
  const relativePath =
    rootIndex >= 0 ? folder.breadcrumbs.slice(rootIndex + 1) : folder.breadcrumbs.slice(1);

  return relativePath.map((entry) => ({ id: entry.id, name: entry.name }));
}

export function FilesExplorer({
  title = 'Files',
  rootFolderId,
  rootLabel = 'Files',
  readOnly = false,
  primeContractPinning,
}: FilesExplorerProps) {
  const listParams = useFilesListParams();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    searchInput,
    searchMode,
    setSearchInput,
    updateParams,
    handleSearchChange,
    folderId,
    folderPath,
    viewMode,
    dateFrom,
    dateTo,
    clearFilters,
  } = listParams;
  const { rootFolder, currentFolderId, folderDetail, allChildren, isLoading, isError, refetch } =
    useFilesFolderData(folderId, rootFolderId);
  const trimmedSearchQuery = searchQuery.trim();
  const isSearchActive = trimmedSearchQuery.length > 0;
  const searchParams = useMemo(
    () => ({
      page,
      size,
      search: trimmedSearchQuery,
      sortBy,
      sortOrder,
      parentId: searchMode === 'folder' ? currentFolderId : undefined,
      ancestorId: searchMode === 'global' ? rootFolderId : undefined,
      createdFrom: dateFrom,
      createdTo: dateTo,
    }),
    [
      currentFolderId,
      dateFrom,
      dateTo,
      page,
      rootFolderId,
      searchMode,
      size,
      sortBy,
      sortOrder,
      trimmedSearchQuery,
    ]
  );
  const fileSearchQuery = useFilesSearchQuery(
    searchParams,
    isSearchActive && (searchMode === 'global' || !!currentFolderId)
  );
  const folderDisplayData = useFilesDisplayData({
    items: allChildren,
    page,
    size,
    searchQuery: isSearchActive ? '' : trimmedSearchQuery,
    sortBy,
    sortOrder,
    dateFrom,
    dateTo,
  });
  const searchItems = fileSearchQuery.data?.data;
  const searchSectionedData = useMemo(() => sectionFileItems(searchItems ?? []), [searchItems]);
  const sectionedData = isSearchActive ? searchSectionedData : folderDisplayData.sectionedData;
  const totalCount = isSearchActive
    ? (fileSearchQuery.data?.pagination.totalItems ?? 0)
    : folderDisplayData.totalCount;
  const hasActiveFilters = isSearchActive || !!dateFrom || !!dateTo;
  const isDataLoading = isLoading || (isSearchActive && fileSearchQuery.isLoading);
  const isDataError = isError || (isSearchActive && fileSearchQuery.isError);
  const navigationRootId = rootFolderId ?? rootFolder?.id;
  const showResultLocation = isSearchActive && searchMode === 'global';
  const canMutate = !readOnly;
  const pinnedPrimeContractFileIds = useMemo(
    () => new Set(primeContractPinning?.pinnedFileIds ?? []),
    [primeContractPinning?.pinnedFileIds]
  );
  const canPinPrimeContract = useCallback(
    (item: FileItem) =>
      !!primeContractPinning?.canPin &&
      item.type === 'FILE' &&
      item.parentId === primeContractPinning.folderId &&
      !item.primeContract?.isPinned &&
      !pinnedPrimeContractFileIds.has(item.id),
    [pinnedPrimeContractFileIds, primeContractPinning]
  );
  const canSetPrimeContractPrimary = useCallback(
    (item: FileItem) =>
      !!primeContractPinning?.canSetPrimary &&
      item.type === 'FILE' &&
      item.parentId === primeContractPinning.folderId &&
      item.primeContract?.isPinned === true,
    [primeContractPinning]
  );

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);
  const folderZipExport = useFolderZipExport();

  const handleExport = useCallback(() => {
    if (!folderDetail) return;
    void folderZipExport.startExport(folderDetail);
  }, [folderDetail, folderZipExport]);

  const handleFolderClick = useCallback(
    (folder: FileItem) => {
      const nextPath = getFolderPathFromBreadcrumbs(folder, navigationRootId, folderPath);

      setSearchInput('');
      updateParams({
        folderId: folder.id,
        folderPath: encodeFolderPath(nextPath),
        page: undefined,
        search: undefined,
      });
    },
    [folderPath, navigationRootId, setSearchInput, updateParams]
  );

  const handleSearchModeChange = useCallback(
    (value: FilesSearchMode) => {
      updateParams({ searchMode: value === 'global' ? undefined : value, page: undefined });
    },
    [updateParams]
  );

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      if (index === -1) {
        updateParams({ folderId: undefined, folderPath: undefined, page: undefined });
        return;
      }

      const nextPath = folderPath.slice(0, index + 1);
      updateParams({
        folderId: nextPath[nextPath.length - 1]?.id,
        folderPath: encodeFolderPath(nextPath),
        page: undefined,
      });
    },
    [folderPath, updateParams]
  );

  const handleRowClick = useCallback(
    (item: FileItem) => {
      if (item.type === 'FOLDER') {
        handleFolderClick(item);
        return;
      }

      setPreviewItem(item);
    },
    [handleFolderClick]
  );

  const { table, columns } = useFilesTable({
    sectionedData,
    totalCount,
    page,
    size,
    sortBy,
    sortOrder,
    showLocation: showResultLocation,
    locationRootId: navigationRootId,
    locationRootLabel: rootLabel,
    updateParams,
    onPreview: setPreviewItem,
    onRename: setRenameItem,
    onDelete: setDeleteItem,
    onExportFolder: (item) => void folderZipExport.startExport(item),
    onPinPrimeContract: primeContractPinning?.onPin,
    canPinPrimeContract,
    onSetPrimeContractPrimary: primeContractPinning?.onSetPrimary,
    canSetPrimeContractPrimary,
    canMutate,
  });

  return (
    <div className="container-fluid py-7.5">
      <FilesPageToolbar
        title={title}
        searchInput={searchInput}
        searchMode={searchMode}
        canMutateFolder={canMutate && !!currentFolderId}
        canExport={!!folderDetail && !folderZipExport.isExporting}
        showMutationActions={canMutate}
        onSearchChange={handleSearchChange}
        onSearchModeChange={handleSearchModeChange}
        onExport={handleExport}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onUploadFile={() => setUploadFileOpen(true)}
      />

      <FilesBreadcrumbs
        folderPath={folderPath}
        rootLabel={rootLabel}
        onBreadcrumbClick={handleBreadcrumbClick}
      />

      <Card>
        <FilesListFilters
          sortBy={sortBy}
          viewMode={viewMode}
          hasActiveFilters={hasActiveFilters}
          dateFrom={dateFrom}
          dateTo={dateTo}
          totalCount={totalCount}
          onSortChange={(value) =>
            updateParams({ sortBy: value === 'updatedAt' ? undefined : value, page: undefined })
          }
          onViewChange={(view) => updateParams({ view: view === 'list' ? undefined : view })}
          onClearFilters={clearFilters}
          onDateRangeChange={(from, to) =>
            updateParams({ dateFrom: from, dateTo: to, page: undefined })
          }
        />

        {isDataError ? (
          <CardContent>
            <QueryErrorState
              title="Failed to load files"
              onRetry={() => {
                void refetch();
                if (isSearchActive) void fileSearchQuery.refetch();
              }}
              className="border-0 py-12"
            />
          </CardContent>
        ) : (
          <DataGrid
            table={table}
            recordCount={totalCount}
            isLoading={isDataLoading}
            onRowClick={handleRowClick}
            emptyMessage={<FilesEmptyState />}
            tableLayout={{ cellBorder: false, rowBorder: true, headerBackground: true }}
          >
            {viewMode === 'list' ? (
              <FilesListTable
                table={table}
                columns={columns}
                sectionedData={sectionedData}
                isLoading={isDataLoading}
              />
            ) : (
              <FilesGridContent
                sectionedData={sectionedData}
                isLoading={isDataLoading}
                showLocation={showResultLocation}
                locationRootId={navigationRootId}
                locationRootLabel={rootLabel}
                onFolderClick={handleFolderClick}
                onFilePreview={setPreviewItem}
                onFolderExport={(item) => void folderZipExport.startExport(item)}
                onPinPrimeContract={primeContractPinning?.onPin}
                canPinPrimeContract={canPinPrimeContract}
                onSetPrimeContractPrimary={primeContractPinning?.onSetPrimary}
                canSetPrimeContractPrimary={canSetPrimeContractPrimary}
              />
            )}
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </DataGrid>
        )}
      </Card>

      <FolderExportProgressDialog
        open={folderZipExport.open}
        onOpenChange={folderZipExport.setOpen}
        folder={folderZipExport.folder}
        job={folderZipExport.job}
        error={folderZipExport.error}
        hasAutoDownloaded={folderZipExport.hasAutoDownloaded}
        onRetry={folderZipExport.retry}
        onDownloadAgain={folderZipExport.downloadAgain}
      />

      <FilesPageDialogs
        currentFolderId={currentFolderId}
        createFolderOpen={createFolderOpen}
        uploadFileOpen={uploadFileOpen}
        previewItem={previewItem}
        renameItem={renameItem}
        deleteItem={deleteItem}
        onCreateFolderOpenChange={setCreateFolderOpen}
        onUploadFileOpenChange={setUploadFileOpen}
        onPreviewItemChange={setPreviewItem}
        onRenameItemChange={setRenameItem}
        onDeleteItemChange={setDeleteItem}
        readOnly={readOnly}
      />
    </div>
  );
}
