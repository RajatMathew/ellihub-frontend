import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';
import { type ColumnDef } from '@tanstack/react-table';

interface UseCostCodeColumnsOptions {
  onEdit: (row: CostCode) => void;
  onDelete: (row: CostCode) => void;
  canDelete: boolean;
}

export function useCostCodeColumns({ onEdit, onDelete, canDelete }: UseCostCodeColumnsOptions) {
  return useMemo<ColumnDef<CostCode>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">{row.original.code}</span>
        ),
        meta: {
          headerClassName: 'min-w-24',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground">{row.original.name}</span>
        ),
        meta: {
          headerClassName: 'min-w-48',
          textOverflow: 'truncate',
          skeleton: <Skeleton className="h-4 w-48" />,
        },
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.description ?? '-'}</span>
        ),
        meta: {
          headerClassName: 'min-w-48',
          textOverflow: 'scroll',
          skeleton: <Skeleton className="h-4 w-full max-w-80" />,
        },
        enableSorting: false,
      },
      {
        id: 'category',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.costCodeCategory?.name ?? '-'}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-4 w-28" />,
        },
        enableSorting: false,
      },
      col.actions({
        label: (costCode) => costCode.name,
        items: (costCode) => [
          { label: 'Edit', onSelect: () => onEdit(costCode) },
          canDelete && {
            destructive: true,
            label: 'Delete',
            onSelect: () => onDelete(costCode),
          },
        ],
      }),
    ],
    [canDelete, onEdit, onDelete]
  );
}
