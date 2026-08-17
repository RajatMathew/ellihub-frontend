import { useMemo } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatDateTime } from '@/app/lib/helpers';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import { useDownloadFile } from '@/modules/files/hooks/files.hooks';
import { getFileDisplayNameWithExtension } from '@/modules/files/lib/file-display-name';
import { getBlockingFileLinks, getFileLinkBlockedReason } from '@/modules/files/lib/file-links';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Download,
  Eye,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Pin,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';

import { FileLinkBadge } from './file-link-badge';
import { getFileLocationLabel } from './file-location';
import { FileTypeIcon } from './file-type-icon';

interface UseFilesColumnsOptions {
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

export function useFilesColumns({
  showLocation = false,
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
}: UseFilesColumnsOptions) {
  const downloadFile = useDownloadFile();

  return useMemo<ColumnDef<FileItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="File Name" />,
        cell: ({ row }) => {
          const location = showLocation
            ? getFileLocationLabel(row.original, {
                rootId: locationRootId,
                rootLabel: locationRootLabel,
              })
            : undefined;
          const fileName = getFileDisplayNameWithExtension(row.original);

          return (
            <div className="flex min-w-0 max-w-full items-start gap-2.5">
              <FileTypeIcon
                fileType={row.original.type}
                mimeType={row.original.mimeType}
                fileName={fileName}
                className="mt-0.5 size-4 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                  <span
                    className="min-w-0 max-w-full truncate text-sm font-medium text-foreground"
                    title={fileName}
                  >
                    {fileName}
                  </span>
                  {row.original.primeContract?.isPinned && (
                    <Badge variant="secondary" appearance="light" size="sm">
                      Pinned
                    </Badge>
                  )}
                  {row.original.primeContract?.isPrimary && (
                    <Badge variant="primary" appearance="light" size="sm">
                      Primary
                    </Badge>
                  )}
                  <FileLinkBadge file={row.original} />
                </div>
                {location && (
                  <span className="mt-1 flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground">
                    <FolderTree className="size-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate" title={location}>
                      {location}
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-72',
          textOverflow: 'truncate',
          tooltipContent: (file) => getFileDisplayNameWithExtension(file),
          skeleton: <Skeleton className="h-3.5 w-48" />,
        },
      },
      {
        accessorKey: 'size',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Size" />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-foreground">
            {row.original.type === 'FOLDER' ? '-' : formatFileSize(row.original.size)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-24',
          skeleton: <Skeleton className="h-3.5 w-16" />,
        },
      },
      {
        accessorKey: 'createdBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Uploaded By" />,
        cell: ({ row }) => (
          <span className="block max-w-40 truncate text-sm text-foreground">
            {row.original.createdByUser?.name || row.original.createdBy || '-'}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-32',
          textOverflow: 'truncate',
          tooltipContent: (file) => file.createdByUser?.name || file.createdBy || '-',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.updatedAt || '')}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-40',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const isFile = row.original.type === 'FILE';
          const isFolder = row.original.type === 'FOLDER';
          const canRenameItem = canRename && row.original.isDeletable;
          const canDeleteItem = canDelete && row.original.isDeletable;
          // Delete is withheld because something still points at this file, as
          // opposed to the user simply lacking the permission. Say so rather
          // than letting the action disappear without explanation.
          const blockedReason =
            canDelete && !canDeleteItem
              ? getFileLinkBlockedReason(getBlockingFileLinks(row.original))
              : null;
          const canPin = canPinPrimeContract?.(row.original) ?? false;
          const canSetPrimary = canSetPrimeContractPrimary?.(row.original) ?? false;
          const isPrimary = row.original.primeContract?.isPrimary === true;
          const canExportFolder = isFolder && canExport;
          const showMenu =
            isFile ||
            canExportFolder ||
            canRenameItem ||
            canDeleteItem ||
            canPin ||
            canSetPrimary ||
            !!blockedReason;

          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(event) => event.stopPropagation()}
            >
              {isFile && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    onClick={() => onPreview(row.original)}
                    aria-label="Preview file"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    onClick={() => downloadFile.mutate(row.original)}
                    aria-label="Download file"
                  >
                    <Download className="size-3.5" />
                  </Button>
                </>
              )}
              {canExportFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => onExportFolder(row.original)}
                  aria-label="Export folder as ZIP"
                >
                  <Download className="size-3.5" />
                </Button>
              )}
              {showMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="size-8 p-0" aria-label="More">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isFile && (
                      <DropdownMenuItem onClick={() => onPreview(row.original)}>
                        <Eye className="size-3.5" />
                        Preview
                      </DropdownMenuItem>
                    )}
                    {isFile && (
                      <DropdownMenuItem onClick={() => downloadFile.mutate(row.original)}>
                        <Download className="size-3.5" />
                        Download
                      </DropdownMenuItem>
                    )}
                    {canExportFolder && (
                      <DropdownMenuItem onClick={() => onExportFolder(row.original)}>
                        <Download className="size-3.5" />
                        Export ZIP
                      </DropdownMenuItem>
                    )}
                    {canRenameItem && (
                      <DropdownMenuItem onClick={() => onRename(row.original)}>
                        <Pencil className="size-3.5" />
                        Rename
                      </DropdownMenuItem>
                    )}
                    {canPin && onPinPrimeContract && (
                      <DropdownMenuItem onClick={() => onPinPrimeContract(row.original)}>
                        <Pin className="size-3.5" />
                        Pin to Overview
                      </DropdownMenuItem>
                    )}
                    {canSetPrimary && onSetPrimeContractPrimary && (
                      <DropdownMenuItem
                        onClick={() => onSetPrimeContractPrimary(row.original, !isPrimary)}
                      >
                        {isPrimary ? (
                          <StarOff className="size-3.5" />
                        ) : (
                          <Star className="size-3.5" />
                        )}
                        {isPrimary ? 'Remove Primary' : 'Mark Primary'}
                      </DropdownMenuItem>
                    )}
                    {(canDeleteItem || blockedReason) &&
                      (canRenameItem || canPin || canSetPrimary) && <DropdownMenuSeparator />}
                    {canDeleteItem && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(row.original)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    )}
                    {!canDeleteItem && blockedReason && (
                      <div className="px-2 py-1.5">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Trash2 className="size-3.5 shrink-0" />
                          Delete unavailable
                        </p>
                        <p className="mt-1 max-w-64 text-xs text-muted-foreground">
                          {blockedReason}
                        </p>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
        meta: {
          headerClassName: 'w-24',
          skeleton: <Skeleton className="h-6 w-16" />,
        },
        enableSorting: false,
      },
    ],
    [
      downloadFile,
      locationRootId,
      locationRootLabel,
      onDelete,
      onExportFolder,
      onPinPrimeContract,
      onSetPrimeContractPrimary,
      onPreview,
      onRename,
      canPinPrimeContract,
      canSetPrimeContractPrimary,
      canRename,
      canDelete,
      canExport,
      showLocation,
    ]
  );
}
