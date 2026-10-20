import { useCallback, useMemo, useState } from 'react';

import { BackLink } from '@/app/components/back-link';
import {
  BulkDeleteDialog,
  DataTableBulkBar,
  DataTableFilters,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardFooter } from '@/app/components/ui/card';
import { DataGrid } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import {
  FilesBreadcrumbs,
  type FilesBreadcrumbEntry,
} from '@/modules/files/components/files-breadcrumbs';
import { FilesEmptyState } from '@/modules/files/components/files-empty-state';
import { FilesGridContent } from '@/modules/files/components/files-grid-content';
import { FilesListTable } from '@/modules/files/components/files-list-table';
import { FilesPageDialogs } from '@/modules/files/components/files-page-dialogs';
import { FilesPageToolbar } from '@/modules/files/components/files-page-toolbar';
import { FolderExportProgressDialog } from '@/modules/files/components/folder-export-progress-dialog';
import { FolderExportStatusCard } from '@/modules/files/components/folder-export-status-card';
import { useOfferDropDestination } from '@/modules/files/global-drop/global-drop';
import { useBulkDeleteFilesMutation, useFilesSearchQuery } from '@/modules/files/hooks/files.hooks';
import { useFilesBreadcrumbTrail } from '@/modules/files/hooks/use-files-breadcrumb-trail';
import { useFilesDisplayData } from '@/modules/files/hooks/use-files-display-data';
import { useFilesFolderData } from '@/modules/files/hooks/use-files-folder-data';
import { useFilesListParams } from '@/modules/files/hooks/use-files-list-params';
import { useFilesTable } from '@/modules/files/hooks/use-files-table';
import { useFolderZipExport } from '@/modules/files/hooks/use-folder-zip-export';
import { getFileDisplayNameWithExtension } from '@/modules/files/lib/file-display-name';
import { getBlockingFileLinks, getFileLinkBlockedReason } from '@/modules/files/lib/file-links';
import { getFilesSearchAncestorId } from '@/modules/files/lib/file-search-scope';
import { sectionFileItems } from '@/modules/files/lib/file-sections';
import { folderHref, getParentFolder } from '@/modules/files/lib/folder-navigation';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface FilesExplorerProps {
  title?: string;
  rootFolderId?: string;
  rootLabel?: string;
  readOnly?: boolean;
  permissions?: {
    create?: boolean;
    upload?: boolean;
    createFolder?: boolean;
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

const FILES_ITEM_LABEL = { many: 'items', one: 'item' };

/**
 * The row menu's own rule, so the checkbox cannot offer what the menu refuses:
 * system items are never deletable, and a file something still points at is
 * refused by the API.
 */
function canDeleteFileItem(item: FileItem) {
  return item.isDeletable && !item.isLinked;
}

function getFileItemDeleteBlockedReason(item: FileItem) {
  if (!item.isDeletable) return 'This item cannot be deleted.';

  return getFileLinkBlockedReason(getBlockingFileLinks(item)) ?? undefined;
}

function getFolderDisplayName(name: string | null | undefined, fallback: string) {
  if (!name) return fallback;
  return name.trim().toLowerCase() === 'root' ? 'Home' : name;
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
  const { pathname, search: locationSearch } = useLocation();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    searchMode,
    setSearchInput,
    updateParams,
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
      ancestorId: getFilesSearchAncestorId({
        searchMode,
        currentFolderId,
        explorerRootId: rootFolderId,
        driveRootId: rootFolderId ? undefined : rootFolder?.id,
      }),
      createdFrom: dateFrom,
      createdTo: dateTo,
    }),
    [
      currentFolderId,
      dateFrom,
      dateTo,
      page,
      rootFolder?.id,
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
  const isDataLoading = isLoading || (isSearchActive && fileSearchQuery.isLoading);
  const isDataError = isError || (isSearchActive && fileSearchQuery.isError);
  const navigationRootId = rootFolderId ?? rootFolder?.id;
  const breadcrumbs = useMemo(
    () => getScopedBreadcrumbs(folderDetail?.breadcrumbs, navigationRootId),
    [folderDetail?.breadcrumbs, navigationRootId]
  );
  // The header owns the path on desktop; the in-page trail below is the mobile
  // fallback, since the header hides its breadcrumbs under `lg`.
  useFilesBreadcrumbTrail(breadcrumbs);
  const parentFolder = getParentFolder(breadcrumbs, rootLabel);
  const backTo = parentFolder
    ? {
        to: folderHref({ pathname, search: locationSearch }, parentFolder.folderId),
        label: getFolderDisplayName(parentFolder.name, rootLabel),
      }
    : null;
  const currentFolderName = getFolderDisplayName(
    folderDetail?.displayName || folderDetail?.name || breadcrumbs.at(-1)?.name,
    rootLabel
  );
  // Both scopes reach into subfolders, so a result can be anywhere below.
  const showResultLocation = isSearchActive;
  const tableTitle =
    isSearchActive && searchMode === 'global'
      ? rootFolderId
        ? rootLabel
        : 'All files'
      : currentFolderName;
  const baseCanCreate = permissions?.create ?? !readOnly;
  const folderCapabilities = folderDetail?.capabilities;
  const canUpload = (permissions?.upload ?? baseCanCreate) && (folderCapabilities?.upload ?? true);
  const canCreateFolder =
    (permissions?.createFolder ?? baseCanCreate) && (folderCapabilities?.createFolder ?? true);
  const canUpdate = (permissions?.update ?? !readOnly) && (folderCapabilities?.update ?? true);
  const canDelete = (permissions?.delete ?? !readOnly) && (folderCapabilities?.delete ?? true);
  // A file dragged in from the computer opens Save to Files at the folder open
  // here (elli-ui#1333), browsing within this explorer's own root.
  useOfferDropDestination(
    canUpload && currentFolderId && !isSearchActive
      ? { folderId: currentFolderId, label: currentFolderName, rootFolderId, rootLabel }
      : null
  );
  const canExport = (permissions?.export ?? true) && (folderCapabilities?.export ?? true);
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
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const folderZipExport = useFolderZipExport({ enabled: canExport });

  // Selection is list-view only, and the folder and search scope are navigation
  // state the filter schema deliberately does not hold — so they have to be
  // named here, or checked rows would follow the user into another folder.
  const selection = useMemo<ListSelectionConfig<FileItem> | undefined>(
    () =>
      canDelete && viewMode === 'list'
        ? {
            canSelect: canDeleteFileItem,
            getRowLabel: getFileDisplayNameWithExtension,
            ineligibleReason: getFileItemDeleteBlockedReason,
            scope: `${currentFolderId}|${searchMode}|${isSearchActive}`,
          }
        : undefined,
    [canDelete, currentFolderId, isSearchActive, searchMode, viewMode]
  );

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

  // Leaving for another folder ends the search, as opening a folder row does.
  const handleBreadcrumbClick = useCallback(
    (folderId?: string) => {
      setSearchInput('');
      updateParams({
        folderId,
        folderPath: undefined,
        page: undefined,
        search: undefined,
      });
    },
    [setSearchInput, updateParams]
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

  // Loading and error are combined from the folder and search queries, and the
  // error state is rendered outside the grid, so the kit only ever needs the
  // table instance back.
  const tableQueryStatus = useMemo(
    () => ({
      isError: isDataError,
      isFetching: isDataLoading,
      isLoading: isDataLoading,
      refetch: () => {
        void refetch();
        if (isSearchActive) void fileSearchQuery.refetch();
      },
    }),
    [fileSearchQuery, isDataError, isDataLoading, isSearchActive, refetch]
  );

  const { table, list } = useFilesTable({
    selection,
    sectionedData,
    totalCount,
    state: listParams,
    query: tableQueryStatus,
    showLocation: showResultLocation,
    locationRootId: navigationRootId,
    locationRootLabel: rootLabel,
    onPreview: setPreviewItem,
    onRename: setRenameItem,
    onDelete: setDeleteItem,
    onExportFolder: (item) => void folderZipExport.startExport(item),
    onPinPrimeContract: primeContractPinning?.onPin,
    canPinPrimeContract,
    onSetPrimeContractPrimary: primeContractPinning?.onSetPrimary,
    canSetPrimeContractPrimary,
    canRename: canUpdate && !showResultLocation,
    canDelete: canDelete && !showResultLocation,
    canExport,
  });

  const bulkDelete = useBulkDeleteFilesMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
  });

  return (
    <div className="container-fluid max-w-full overflow-x-clip py-5 sm:py-7.5">
      <FilesPageToolbar
        title={title}
        canCreateFolder={canCreateFolder && !!currentFolderId}
        canUpload={canUpload && !!currentFolderId}
        canExport={canExport && (!!folderDetail || folderZipExport.isExporting)}
        isExporting={folderZipExport.isExporting}
        showMutationActions={canCreateFolder || canUpload}
        onExport={handleExport}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onUploadFile={() => setUploadFileOpen(true)}
      />

      {backTo && (
        // Up one level, in both Files and a project's files. The header shows
        // the full path on desktop; under `lg` the trail below stands in for it.
        <div className="mb-2 min-w-0 lg:mb-4">
          <BackLink to={backTo.to} label={backTo.label} />
        </div>
      )}

      <FilesBreadcrumbs
        breadcrumbs={breadcrumbs}
        rootLabel={rootLabel}
        className="lg:hidden"
        onBreadcrumbClick={handleBreadcrumbClick}
      />

      <Card className="min-w-0 max-w-full overflow-hidden">
        {list.selection.count > 0 ? (
          <DataTableBulkBar
            count={list.selection.count}
            itemLabel={FILES_ITEM_LABEL}
            onClear={list.selection.clear}
            actions={
              <Button size="toolbar" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 />
                Delete
              </Button>
            }
          />
        ) : (
          <DataTableFilters state={listParams} title={tableTitle} onClearAll={clearFilters} />
        )}

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
            tableAriaLabel="Files"
            isLoading={isDataLoading}
            onRowClick={handleRowClick}
            emptyMessage={<FilesEmptyState filtered={isSearchActive || !!dateFrom || !!dateTo} />}
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

      <BulkDeleteDialog
        description="Folders must be empty first — a folder that still has items in it is reported back, not emptied."
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={FILES_ITEM_LABEL}
        items={list.selection.items}
        open={isBulkDeleteOpen}
        onConfirm={() => bulkDelete.run(list.selection.ids)}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) bulkDelete.reset();
        }}
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
        canCreateFolder={canCreateFolder}
        canUpload={canUpload}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
