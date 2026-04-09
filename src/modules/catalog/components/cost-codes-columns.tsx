import { MoreHorizontal } from 'lucide-react';
import { useMemo } from 'react';

import { type ColumnDef } from '@tanstack/react-table';

import { Button } from '@app/components/ui/button';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';

import type { CostCode } from '../schemas/costcode.schema';

interface UseCostCodeColumnsOptions {
  onEdit: (row: CostCode) => void;
  onDelete: (row: CostCode) => void;
}

export function useCostCodeColumns({ onEdit, onDelete }: UseCostCodeColumnsOptions) {
  return useMemo<ColumnDef<CostCode>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">{row.original.code}</span>
        ),
        meta: { headerClassName: 'min-w-[100px]' },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground">
            {row.original.name}
          </span>
        ),
        meta: { headerClassName: 'min-w-[200px]' },
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.description ?? '—'}</span>
        ),
        meta: { headerClassName: 'min-w-[200px]' },
        enableSorting: false,
      },
      {
        id: 'category',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.costCodeCategory?.name ?? '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[120px]' },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
                  Delete
                </DropdownMenuItem>
              </>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        meta: { headerClassName: 'w-[60px]' },
        enableSorting: false,
      },
    ],
    [onEdit, onDelete],
  );
}
