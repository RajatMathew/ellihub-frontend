import { useMemo } from 'react';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  GCActionsCell,
  GCActiveProjectsCell,
  GCNameCell,
  GCPrimaryContactCell,
  GCStatusCell,
  GCTypeCell,
} from '@/modules/directory/components/gc/gc-list-column-cells';
import type { GeneralContractor } from '@/modules/directory/schemas/gc.schema';
import { type ColumnDef } from '@tanstack/react-table';

interface UseGCListColumnsOptions {
  typeLabels: Map<string, string>;
  onDelete: (id: string) => void;
}

export function useGCListColumns({ typeLabels, onDelete }: UseGCListColumnsOptions) {
  return useMemo<ColumnDef<GeneralContractor>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="GC Name" />,
        cell: ({ row }) => <GCNameCell gc={row.original} />,
        meta: {
          headerClassName: 'min-w-64',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ),
        },
      },
      {
        id: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <GCTypeCell gc={row.original} typeLabels={typeLabels} />,
        meta: {
          headerClassName: 'min-w-40',
          skeleton: <Skeleton className="h-5 w-24 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <GCStatusCell gc={row.original} />,
        meta: {
          headerClassName: 'min-w-36',
          skeleton: (
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ),
        },
      },
      {
        id: 'primaryContact',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Primary Contact" />,
        cell: ({ row }) => <GCPrimaryContactCell gc={row.original} />,
        meta: {
          headerClassName: 'min-w-64',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'activeProjects',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active Projects" />,
        cell: ({ row }) => <GCActiveProjectsCell gc={row.original} />,
        meta: {
          headerClassName: 'min-w-40 text-center',
          cellClassName: 'text-center',
          skeleton: <Skeleton className="mx-auto h-3.5 w-8" />,
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => <GCActionsCell gc={row.original} onDelete={onDelete} />,
        meta: {
          headerClassName: 'w-16',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [onDelete, typeLabels]
  );
}
