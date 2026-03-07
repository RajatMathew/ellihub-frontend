import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Skeleton } from '@app/components/ui/skeleton';
import { timeAgo, formatDateTime } from '@app/lib/helpers';

import type { FileItem } from '@modules/files/schemas/file.schema';

import { formatFileSize } from '../constants/files.constants';
import { FileTypeIcon } from './file-type-icon';
import { useDownloadFile } from '../hooks/files.hooks';

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
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Timestamp" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-primary">
              {timeAgo(row.original.createdAt)}
            </span>
            <span className="text-2sm text-muted-foreground">
              {formatDateTime(row.original.createdAt)}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[160px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          ),
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="File Name" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <FileTypeIcon
              fileType={row.original.type}
              mimeType={row.original.mimeType}
              fileName={row.original.name}
              className="size-4 shrink-0"
            />
            <span className="text-sm font-medium text-foreground line-clamp-1">
              {row.original.name}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[280px]',
          skeleton: <Skeleton className="h-3.5 w-48" />,
        },
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const isFolder = row.original.type === 'FOLDER';
          return (
            <Badge
              variant={isFolder ? 'warning' : 'info'}
              appearance="light"
              size="sm"
            >
              {isFolder ? 'Folder' : 'File'}
            </Badge>
          );
        },
        meta: {
          headerClassName: 'min-w-[100px]',
          skeleton: <Skeleton className="h-5 w-16 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'size',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Size" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground tabular-nums">
            {row.original.type === 'FOLDER' ? '—' : formatFileSize(row.original.size)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[100px]',
          skeleton: <Skeleton className="h-3.5 w-16" />,
        },
      },
      {
        accessorKey: 'createdBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Uploaded By" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.createdBy}</span>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const isFile = row.original.type === 'FILE';
          return (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {isFile && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    onClick={() => onPreview(row.original)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    onClick={() => downloadFile.mutate(row.original.id)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="size-8 p-0">
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
                    <DropdownMenuItem onClick={() => downloadFile.mutate(row.original.id)}>
                      <Download className="size-3.5" />
                      Download
                    </DropdownMenuItem>
                  )}
                  {row.original.isDeletable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(row.original)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        meta: {
          headerClassName: 'w-[100px]',
          skeleton: <Skeleton className="h-6 w-16" />,
        },
        enableSorting: false,
      },
    ],
    [downloadFile, onPreview, onRename, onDelete],
  );
}
