import { useCallback, useState } from 'react';

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
import { useFilesCsvExport } from '@/modules/files/hooks/use-files-csv-export';
import { useFilesDisplayData } from '@/modules/files/hooks/use-files-display-data';
import { useFilesFolderData } from '@/modules/files/hooks/use-files-folder-data';
import { encodeFolderPath, useFilesListParams } from '@/modules/files/hooks/use-files-list-params';
import { useFilesTable } from '@/modules/files/hooks/use-files-table';
import type { FileItem } from '@/modules/files/schemas/file.schema';

interface FilesExplorerProps {
  title?: string;
  rootFolderId?: string;
  rootLabel?: string;
}

export function FilesExplorer({
  title = 'Files',
  rootFolderId,
  rootLabel = 'Files',
}: FilesExplorerProps) {
  const listParams = useFilesListParams();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    searchInput,
    updateParams,
    handleSearchChange,
    folderId,
    folderPath,
    viewMode,
    dateFrom,
    dateTo,
    clearFilters,
  } = listParams;
  const { currentFolderId, allChildren, isLoading, isError, refetch } = useFilesFolderData(
    folderId,
    rootFolderId
  );
  const { sectionedData, totalCount, hasActiveFilters } = useFilesDisplayData({
    items: allChildren,
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    dateFrom,
    dateTo,
  });

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);

  const handleExport = useFilesCsvExport(allChildren);

  const handleFolderClick = useCallback(
    (folder: FileItem) => {
      const nextPath = [
        ...folderPath,
        { id: folder.id, name: folder.displayName || folder.name || '' },
      ];

      updateParams({
        folderId: folder.id,
        folderPath: encodeFolderPath(nextPath),
        page: undefined,
      });
    },
    [folderPath, updateParams]
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
    updateParams,
    onPreview: setPreviewItem,
    onRename: setRenameItem,
    onDelete: setDeleteItem,
  });

  return (
    <div className="container-fluid py-7.5">
      <FilesPageToolbar
        title={title}
        searchInput={searchInput}
        canMutateFolder={!!currentFolderId}
        canExport={allChildren.length > 0}
        onSearchChange={handleSearchChange}
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

        {isError ? (
          <CardContent>
            <QueryErrorState
              title="Failed to load files"
              onRetry={() => void refetch()}
              className="border-0 py-12"
            />
          </CardContent>
        ) : (
          <DataGrid
            table={table}
            recordCount={totalCount}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            emptyMessage={<FilesEmptyState />}
            tableLayout={{ cellBorder: false, rowBorder: true, headerBackground: true }}
          >
            {viewMode === 'list' ? (
              <FilesListTable
                table={table}
                columns={columns}
                sectionedData={sectionedData}
                isLoading={isLoading}
              />
            ) : (
              <FilesGridContent
                sectionedData={sectionedData}
                isLoading={isLoading}
                onFolderClick={handleFolderClick}
                onFilePreview={setPreviewItem}
              />
            )}
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </DataGrid>
        )}
      </Card>

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
      />
    </div>
  );
}
