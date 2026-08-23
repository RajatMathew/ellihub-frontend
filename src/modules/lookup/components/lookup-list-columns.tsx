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
import type { Lookup } from '@/modules/lookup/schemas/lookup.schema';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface UseLookupListColumnsOptions {
  onEdit: (lookup: Lookup) => void;
  onDelete: (lookup: Lookup) => void;
  canDelete: boolean;
}

export function useLookupListColumns({ onEdit, onDelete, canDelete }: UseLookupListColumnsOptions) {
  return useMemo<ColumnDef<Lookup>[]>(
    () => [
      {
        accessorKey: 'type',
        cell: ({ row }) => (
          <div className="text-sm font-bold text-foreground">{row.original.type}</div>
        ),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        meta: {
          skeleton: <Skeleton className="h-4 w-32" />,
          textOverflow: 'truncate',
        },
      },
      {
        accessorKey: 'label',
        cell: ({ row }) => (
          <div className="text-sm text-foreground">{row.original.label ?? '—'}</div>
        ),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Label" />,
        meta: {
          skeleton: <Skeleton className="h-4 w-40" />,
          textOverflow: 'truncate',
        },
      },
      {
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Open actions for ${row.original.label ?? row.original.type}`}
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
