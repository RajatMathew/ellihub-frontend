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
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface UseCategoryListColumnsOptions {
  onEdit: (category: CostCodeCategory) => void;
  onDelete: (category: CostCodeCategory) => void;
  canDelete: boolean;
}

export function useCategoryListColumns({
  onEdit,
  onDelete,
  canDelete,
}: UseCategoryListColumnsOptions) {
  return useMemo<ColumnDef<CostCodeCategory>[]>(
    () => [
      {
        accessorKey: 'name',
        cell: ({ row }) => (
          <div className="text-sm font-bold text-foreground">{row.original.name}</div>
        ),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        meta: {
          skeleton: <Skeleton className="h-4 w-40" />,
          textOverflow: 'truncate',
        },
      },
      {
        accessorKey: 'description',
        cell: ({ row }) => (
          <div className="line-clamp-1 text-sm text-muted-foreground">
            {row.original.description ?? '—'}
          </div>
        ),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
        meta: {
          skeleton: <Skeleton className="h-4 w-full max-w-80" />,
          textOverflow: 'scroll',
        },
      },
      {
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Open actions for ${row.original.name}`}
                  mode="icon"
                  size="sm"
                  variant="ghost"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
        id: 'actions',
        meta: {
          skeleton: <Skeleton className="ms-auto h-7 w-7" />,
        },
      },
    ],
    [canDelete, onDelete, onEdit]
  );
}
