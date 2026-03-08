import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { AlertCircle, Download, FolderOpen, FolderPlus, Home, RefreshCcw, Search, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardTable,
} from '@app/components/ui/card';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import { Input, InputWrapper } from '@app/components/ui/input';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { parsePageParam, parseSizeParam } from '@app/lib/helpers';

import { CreateFolderDialog } from '../components/create-folder-dialog';
import { FilePreviewDialog } from '../components/file-preview-dialog';
import { useFilesColumns } from '../components/files-columns';
import { FilesGridView } from '../components/files-grid-view';
import { FilesListFilters } from '../components/files-list-filters';
import { FilesListStats } from '../components/files-list-stats';
import { RenameDialog } from '../components/rename-dialog';
import { UploadFileDialog } from '../components/upload-file-dialog';
import {
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  isSortField,
  type SortField,
} from '../constants/files.constants';
import {
  useCreateFolderMutation,
  useDeleteFileMutation,
  useDeleteFolderMutation,
  useFolderDetailQuery,
  useRenameMutation,
  useRootFolderQuery,
  useUploadFileMutation,
} from '../hooks/files.hooks';

import type { FileItem } from '@modules/files/schemas/file.schema';

// ── Folder path serialization ──────────────────────────────────────
// Stored in URL as `folderPath=id:name|id:name|...`
interface BreadcrumbEntry {
  id: string;
  name: string;
}

function encodeFolderPath(path: BreadcrumbEntry[]): string | undefined {
  if (path.length === 0) return undefined;
  return path.map((e) => `${e.id}:${e.name}`).join('|');
}

function decodeFolderPath(raw: string | null): BreadcrumbEntry[] {
  if (!raw) return [];
  return raw.split('|').map((segment) => {
    const colonIdx = segment.indexOf(':');
    if (colonIdx === -1) return { id: segment, name: segment };
    return { id: segment.slice(0, colonIdx), name: segment.slice(colonIdx + 1) };
  });
}

export default function FilesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL-derived state ──────────────────────────────────────────────
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortField = isSortField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const viewMode: 'list' | 'grid' =
    searchParams.get('view') === 'grid' ? 'grid' : 'list';
  const folderIdParam = searchParams.get('folderId') ?? undefined;
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;

  // Folder path derived from URL — survives browser back/forward
  const folderPath = useMemo(
    () => decodeFolderPath(searchParams.get('folderPath')),
    [searchParams],
  );

  // ── Local search — debounced to URL ────────────────────────────────
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '') next.delete(k);
          else next.set(k, v);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateParams],
  );

  // ── Data fetching ──────────────────────────────────────────────────
  const {
    data: rootFolder,
    isLoading: isRootLoading,
    isError: isRootError,
  } = useRootFolderQuery();

  const rootId = rootFolder?.id ?? '';
  const currentFolderId = folderIdParam ?? rootId;

  const {
    data: folderDetail,
    isLoading: isFolderLoading,
    isError: isFolderError,
    refetch,
  } = useFolderDetailQuery(currentFolderId);

  const isLoading = isRootLoading || (!!currentFolderId && isFolderLoading);
  const isError = isRootError || isFolderError;
  const allChildren = useMemo<FileItem[]>(
    () => folderDetail?.children ?? [],
    [folderDetail?.children],
  );

  // ── Create folder / Upload file ────────────────────────────────────
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const createFolderMutation = useCreateFolderMutation();
  const uploadFileMutation = useUploadFileMutation();

  // ── Preview ─────────────────────────────────────────────────────────
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);

  // ── Rename / Delete ────────────────────────────────────────────────
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);
  const renameMutation = useRenameMutation();
  const deleteFolderMutation = useDeleteFolderMutation();
  const deleteFileMutation = useDeleteFileMutation();
  const isDeleting = deleteFolderMutation.isPending || deleteFileMutation.isPending;

  // ── Folder navigation ──────────────────────────────────────────────
  const handleFolderClick = useCallback(
    (folder: FileItem) => {
      const newPath = [...folderPath, { id: folder.id, name: folder.name }];
      updateParams({
        folderId: folder.id,
        folderPath: encodeFolderPath(newPath),
        page: undefined,
      });
    },
    [updateParams, folderPath],
  );

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      if (index === -1) {
        // Root ("Files") clicked
        updateParams({ folderId: undefined, folderPath: undefined, page: undefined });
      } else {
        // Truncate path to clicked level
        const truncated = folderPath.slice(0, index + 1);
        const targetId = truncated[truncated.length - 1]?.id;
        updateParams({
          folderId: targetId,
          folderPath: encodeFolderPath(truncated),
          page: undefined,
        });
      }
    },
    [updateParams, folderPath],
  );

  // ── Date range handler ─────────────────────────────────────────────
  const handleDateRangeChange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      updateParams({ dateFrom: from, dateTo: to, page: undefined });
    },
    [updateParams],
  );

  // ── Export handler ─────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const rows = allChildren.map((item) => ({
      name: item.name,
      type: item.type,
      size: item.size ?? '',
      createdBy: item.createdBy,
      createdAt: item.createdAt,
    }));
    const header = ['Name', 'Type', 'Size', 'Created By', 'Created At'];
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [
          `"${r.name.replace(/"/g, '""')}"`,
          r.type,
          r.size,
          `"${r.createdBy.replace(/"/g, '""')}"`,
          r.createdAt,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'files-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [allChildren]);

  // ── Client-side filter / sort ──────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = allChildren;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
      const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
      result = result.filter((f) => {
        const ts = new Date(f.createdAt).getTime();
        return ts >= fromTs && ts <= toTs;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = (a.size ?? 0) - (b.size ?? 0);
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
        case 'createdAt':
        default:
          cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allChildren, searchQuery, sortBy, sortOrder, dateFrom, dateTo]);

  const listData = filteredData.slice((page - 1) * size, page * size);
  const totalCount = filteredData.length;
  const hasActiveFilters = !!searchQuery || !!dateFrom || !!dateTo;

  // ── TanStack Table ─────────────────────────────────────────────────
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];
  const columns = useFilesColumns({
    onPreview: (item) => setPreviewItem(item),
    onRename: (item) => setRenameItem(item),
    onDelete: (item) => setDeleteItem(item),
  });
  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: listData,
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
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: Record<string, string | undefined> = {};
      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }
      updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const col = next[0];
      if (!col) {
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
      } else {
        const newSortBy = isSortField(col.id) ? col.id : 'createdAt';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
          sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
          page: undefined,
        });
      }
    },
  });

  // ── Row click handler for DataGrid list view ──────────────────────
  const handleRowClick = useCallback(
    (row: FileItem) => {
      if (row.type === 'FOLDER') handleFolderClick(row);
      else setPreviewItem(row);
    },
    [handleFolderClick],
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-7.5">
      {/* Toolbar */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>Files</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <InputWrapper variant="sm">
              <Search className="size-4" />
              <Input
                placeholder="Search files..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </InputWrapper>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={allChildren.length === 0}>
              <Download className="size-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)} disabled={!currentFolderId}>
              <FolderPlus className="size-4" />
              New Folder
            </Button>
            <Button size="sm" onClick={() => setUploadFileOpen(true)} disabled={!currentFolderId}>
              <Upload className="size-4" />
              Upload
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* Breadcrumb */}
      {folderPath.length > 0 && (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer flex items-center gap-1.5"
                onClick={() => handleBreadcrumbClick(-1)}
              >
                <Home className="size-3.5" />
                Files
              </BreadcrumbLink>
            </BreadcrumbItem>
            {folderPath.map((entry, idx) => (
              <span key={entry.id} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {idx === folderPath.length - 1 ? (
                    <BreadcrumbPage>{entry.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => handleBreadcrumbClick(idx)}
                    >
                      {entry.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Stats */}
      <FilesListStats data={allChildren} />

      {/* Table card */}
      <Card>
        <FilesListFilters
          sortBy={sortBy}
          viewMode={viewMode}
          hasActiveFilters={hasActiveFilters}
          dateFrom={dateFrom}
          dateTo={dateTo}
          totalCount={totalCount}
          onSortChange={(value) =>
            updateParams({ sortBy: value === 'createdAt' ? undefined : value, page: undefined })
          }
          onViewChange={(view) =>
            updateParams({ view: view === 'list' ? undefined : view })
          }
          onClearFilters={() => {
            setSearchInput('');
            updateParams({
              search: undefined,
              dateFrom: undefined,
              dateTo: undefined,
              page: undefined,
            });
          }}
          onDateRangeChange={handleDateRangeChange}
        />

        {isError ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="size-10 text-destructive/60" />
              <p className="text-sm font-medium">Failed to load files</p>
              <p className="text-xs text-muted-foreground">
                Something went wrong. Please try again.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        ) : (
          <DataGrid
            table={table}
            recordCount={totalCount}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            emptyMessage={
              <div className="flex flex-col items-center gap-2 py-8">
                <FolderOpen className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No files yet</p>
                <p className="text-xs text-muted-foreground">
                  Upload a file or create a folder to get started.
                </p>
              </div>
            }
            tableLayout={{ cellBorder: false, rowBorder: true, headerBackground: true }}
          >
            {viewMode === 'list' ? (
              <CardTable>
                <DataGridTable />
              </CardTable>
            ) : (
              <FilesGridView data={listData} onFolderClick={handleFolderClick} onFilePreview={(item) => setPreviewItem(item)} />
            )}
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </DataGrid>
        )}
      </Card>

      {/* Dialogs */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        parentId={currentFolderId}
        isSubmitting={createFolderMutation.isPending}
        onSubmit={(data) => {
          createFolderMutation.mutate(data, {
            onSuccess: () => setCreateFolderOpen(false),
          });
        }}
      />
      <UploadFileDialog
        open={uploadFileOpen}
        onOpenChange={setUploadFileOpen}
        parentId={currentFolderId}
        isSubmitting={uploadFileMutation.isPending}
        onSubmit={(payload) => {
          uploadFileMutation.mutate(payload, {
            onSuccess: () => setUploadFileOpen(false),
          });
        }}
      />
      <RenameDialog
        open={!!renameItem}
        onOpenChange={(open) => { if (!open) setRenameItem(null); }}
        item={renameItem}
        isSubmitting={renameMutation.isPending}
        onSubmit={(data) => {
          renameMutation.mutate(data, {
            onSuccess: () => {
              toast.success('Renamed successfully.');
              setRenameItem(null);
            },
          });
        }}
      />
      <FilePreviewDialog
        open={!!previewItem}
        onOpenChange={(open) => { if (!open) setPreviewItem(null); }}
        file={previewItem}
      />
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        title={`Delete ${deleteItem?.type === 'FOLDER' ? 'folder' : 'file'}`}
        description={
          <>
            Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        isPending={isDeleting}
        onConfirm={() => {
          if (!deleteItem) return;
          const mutation = deleteItem.type === 'FOLDER' ? deleteFolderMutation : deleteFileMutation;
          mutation.mutate(deleteItem.id, {
            onSuccess: () => {
              toast.success(`${deleteItem.type === 'FOLDER' ? 'Folder' : 'File'} deleted.`);
              setDeleteItem(null);
            },
          });
        }}
      />
    </div>
  );
}
