import { useMemo } from 'react';

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
import type { FileItem } from '@/modules/files/schemas/file.schema';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { FileTypeIcon } from './file-type-icon';

interface UseFilesColumnsOptions {
  onPreview: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
}

export function useFilesColumns({ onPreview, onRename, onDelete }: UseFilesColumnsOptions) {
  const downloadFile = useDownloadFile();

  return useMemo<ColumnDef<FileItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="File Name" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <FileTypeIcon
              fileType={row.original.type}
              mimeType={row.original.mimeType}
              fileName={row.original.displayName || row.original.name}
              className="size-4 shrink-0"
            />
            <span className="line-clamp-1 text-sm font-medium text-foreground">
              {row.original.displayName || row.original.name || 'Unnamed'}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-72',
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
              {row.original.isDeletable && (
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
                    <DropdownMenuItem onClick={() => onRename(row.original)}>
                      <Pencil className="size-3.5" />
                      Rename
                    </DropdownMenuItem>
                    {isFile && (
                      <DropdownMenuItem onClick={() => downloadFile.mutate(row.original)}>
                        <Download className="size-3.5" />
                        Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(row.original)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
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
    [downloadFile, onDelete, onPreview, onRename]
  );
}
