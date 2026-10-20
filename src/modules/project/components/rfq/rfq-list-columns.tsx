import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  RFQActionsCell,
  RFQDateCell,
  RFQNumberCell,
  RFQQuotesCell,
  RFQStatusCell,
  RFQTitleCell,
  RFQTrackCell,
  RFQVendorsCell,
} from '@/modules/project/components/rfq/rfq-list-column-cells';
import type { RFQListItem } from '@/modules/project/schemas/rfq';
import type { ColumnDef } from '@tanstack/react-table';

interface UseRFQListColumnsOptions {
  onDelete: (rfq: RFQListItem) => void;
  onVoid: (rfq: RFQListItem) => void;
  onCreatePO: (rfq: RFQListItem) => void;
}

export function useRFQListColumns({ onDelete, onVoid, onCreatePO }: UseRFQListColumnsOptions) {
  return useMemo<ColumnDef<RFQListItem>[]>(
    () => [
      {
        accessorKey: 'rfqNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RFQ #" />,
        cell: ({ row }) => <RFQNumberCell rfq={row.original} />,
        meta: {
          headerClassName: 'min-w-28',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
        cell: ({ row }) => <RFQTitleCell rfq={row.original} />,
        meta: {
          headerClassName: 'min-w-56',
          textOverflow: 'truncate',
          skeleton: <Skeleton className="h-3.5 w-44" />,
        },
      },
      {
        id: 'track',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Track" />,
        cell: ({ row }) => <RFQTrackCell rfq={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <RFQStatusCell rfq={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-5 w-24 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'rfqDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RFQ Date" />,
        cell: ({ row }) => <RFQDateCell rfq={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        id: 'vendors',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendors" />,
        cell: ({ row }) => <RFQVendorsCell rfq={row.original} />,
        meta: {
          headerClassName: 'min-w-28',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      {
        id: 'quotes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Quotes" />,
        cell: ({ row }) => <RFQQuotesCell rfq={row.original} />,
        meta: {
          headerClassName: 'min-w-28',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      col.actions({
        cell: (rfq) => (
          <RFQActionsCell rfq={rfq} onCreatePO={onCreatePO} onDelete={onDelete} onVoid={onVoid} />
        ),
      }),
    ],
    [onCreatePO, onDelete, onVoid]
  );
}
