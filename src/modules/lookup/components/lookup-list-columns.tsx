import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { Lookup } from '@/modules/lookup/schemas/lookup.schema';
import { type ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

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
      col.actions({
        label: (lookup) => lookup.label ?? lookup.name ?? lookup.id,
        items: (lookup) => [
          { icon: Pencil, label: 'Edit', onSelect: () => onEdit(lookup) },
          canDelete && {
            destructive: true,
            icon: Trash2,
            label: 'Delete',
            onSelect: () => onDelete(lookup),
          },
        ],
      }),
    ],
    [canDelete, onDelete, onEdit]
  );
}
