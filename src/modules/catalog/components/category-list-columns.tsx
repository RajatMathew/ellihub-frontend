import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import { type ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

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
      col.actions({
        label: (category) => category.name,
        items: (category) => [
          { icon: Pencil, label: 'Edit', onSelect: () => onEdit(category) },
          canDelete && {
            destructive: true,
            icon: Trash2,
            label: 'Delete',
            onSelect: () => onDelete(category),
          },
        ],
      }),
    ],
    [canDelete, onDelete, onEdit]
  );
}
