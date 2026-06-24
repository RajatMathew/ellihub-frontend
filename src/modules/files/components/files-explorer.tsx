import { useCallback, useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Card, CardContent, CardFooter } from '@/app/components/ui/card';
import { DataGrid } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import {
  FilesBreadcrumbs,
  type FilesBreadcrumbEntry,
} from '@/modules/files/components/files-breadcrumbs';
import { FilesEmptyState } from '@/modules/files/components/files-empty-state';
import { FilesGridContent } from '@/modules/files/components/files-grid-content';
import { FilesListFilters } from '@/modules/files/components/files-list-filters';
import { FilesListTable } from '@/modules/files/components/files-list-table';
import { FilesPageDialogs } from '@/modules/files/components/files-page-dialogs';
import { FilesPageToolbar } from '@/modules/files/components/files-page-toolbar';
import { FolderExportProgressDialog } from '@/modules/files/components/folder-export-progress-dialog';
import { FolderExportStatusCard } from '@/modules/files/components/folder-export-status-card';
import { useFilesSearchQuery } from '@/modules/files/hooks/files.hooks';
import {
  sectionFileItems,
  useFilesDisplayData,
} from '@/modules/files/hooks/use-files-display-data';
import { useFilesFolderData } from '@/modules/files/hooks/use-files-folder-data';
import {
  useFilesListParams,
  type FilesSearchMode,
} from '@/modules/files/hooks/use-files-list-params';
import { useFilesTable } from '@/modules/files/hooks/use-files-table';
import { useFolderZipExport } from '@/modules/files/hooks/use-folder-zip-export';
import type { FileItem } from '@/modules/files/schemas/file.schema';

interface FilesExplorerProps {
  title?: string;
  rootFolderId?: string;
  rootLabel?: string;
  readOnly?: boolean;
  permissions?: {
    create?: boolean;
    update?: boolean;
    delete?: boolean;
    export?: boolean;
  };
  primeContractPinning?: {
    folderId?: string;
    pinnedFileIds: string[];
    canPin: boolean;
    onPin: (file: FileItem) => void;
    canSetPrimary?: boolean;
    onSetPrimary?: (file: FileItem, isPrimary: boolean) => void;
  };
}

function getScopedBreadcrumbs(
  breadcrumbs: FilesBreadcrumbEntry[] | undefined,
  rootId: string | undefined
): FilesBreadcrumbEntry[] {
  if (!breadcrumbs?.length) return [];

  const rootIndex = rootId ? breadcrumbs.findIndex((entry) => entry.id === rootId) : -1;

  if (rootIndex >= 0) {
    return breadcrumbs.slice(rootIndex + 1);
  }

  return breadcrumbs.slice(1);
}

export function FilesExplorer({
  title = 'Files',
  rootFolderId,
  rootLabel = 'Files',
  readOnly = false,
  permissions,
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
  const breadcrumbs = useMemo(
    () => getScopedBreadcrumbs(folderDetail?.breadcrumbs, navigationRootId),
    [folderDetail?.breadcrumbs, navigationRootId]
  );
  const showResultLocation = isSearchActive && searchMode === 'global';
  const canCreate = permissions?.create ?? !readOnly;
  const canUpdate = permissions?.update ?? !readOnly;
  const canDelete = permissions?.delete ?? !readOnly;
  const canExport = permissions?.export ?? true;
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
  const folderZipExport = useFolderZipExport({ enabled: canExport });

  const handleExport = useCallback(() => {
    if (folderZipExport.isExporting) {
      folderZipExport.reopen();
      return;
    }

    if (!folderDetail) return;
    void folderZipExport.startExport(folderDetail);
  }, [folderDetail, folderZipExport]);

  const handleFolderClick = useCallback(
    (folder: FileItem) => {
      setSearchInput('');
      updateParams({
        folderId: folder.id,
        folderPath: undefined,
        page: undefined,
        search: undefined,
      });
    },
    [setSearchInput, updateParams]
  );

  const handleSearchModeChange = useCallback(
    (value: FilesSearchMode) => {
      updateParams({ searchMode: value === 'global' ? undefined : value, page: undefined });
    },
    [updateParams]
  );

  const handleBreadcrumbClick = useCallback(
    (folderId?: string) => {
      updateParams({
        folderId,
        folderPath: undefined,
        page: undefined,
      });
    },
    [updateParams]
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
    canRename: canUpdate,
    canDelete,
    canExport,
  });

  return (
    <div className="container-fluid max-w-full overflow-x-clip py-5 sm:py-7.5">
      <FilesPageToolbar
        title={title}
        searchInput={searchInput}
        searchMode={searchMode}
        canMutateFolder={canCreate && !!currentFolderId}
        canExport={canExport && (!!folderDetail || folderZipExport.isExporting)}
        isExporting={folderZipExport.isExporting}
        showMutationActions={canCreate}
        onSearchChange={handleSearchChange}
        onSearchModeChange={handleSearchModeChange}
        onExport={handleExport}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onUploadFile={() => setUploadFileOpen(true)}
      />

      <FilesBreadcrumbs
        breadcrumbs={breadcrumbs}
        rootLabel={rootLabel}
        onBreadcrumbClick={handleBreadcrumbClick}
      />

      <Card className="min-w-0 max-w-full overflow-hidden">
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
            tableLayout={{
              cellBorder: false,
              rowBorder: true,
              headerBackground: true,
              width: 'auto',
            }}
            tableClassNames={{
              base: 'min-w-[48rem]',
            }}
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
                canExport={canExport}
                onPinPrimeContract={primeContractPinning?.onPin}
                canPinPrimeContract={canPinPrimeContract}
                onSetPrimeContractPrimary={primeContractPinning?.onSetPrimary}
                canSetPrimeContractPrimary={canSetPrimeContractPrimary}
              />
            )}
            <CardFooter className="min-w-0 max-w-full overflow-x-auto">
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
        isCancelling={folderZipExport.isCancelling}
        hasAutoDownloaded={folderZipExport.hasAutoDownloaded}
        onCancel={folderZipExport.cancelExport}
        onRetry={folderZipExport.retry}
        onDownloadAgain={folderZipExport.downloadAgain}
      />

      <FolderExportStatusCard
        visible={folderZipExport.isExporting && !folderZipExport.open}
        folder={folderZipExport.folder}
        job={folderZipExport.job}
        error={folderZipExport.error}
        isCancelling={folderZipExport.isCancelling}
        onView={folderZipExport.reopen}
        onCancel={folderZipExport.cancelExport}
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
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
