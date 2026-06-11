import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  PrimeChangeOrderAssigneeCell,
  PrimeChangeOrderCostCell,
  PrimeChangeOrderDueDateCell,
  PrimeChangeOrderFieldwireCell,
  PrimeChangeOrderNameCell,
  PrimeChangeOrderReferenceCell,
  PrimeChangeOrderScheduleImpactCell,
  PrimeChangeOrderStatusCell,
} from '@/modules/project/components/prime-change-order/prime-change-order-list-column-cells';
import type { PrimeChangeOrder } from '@/modules/project/schemas/prime-change-order';

export function usePrimeChangeOrderListColumns() {
  return useMemo<ColumnDef<PrimeChangeOrder>[]>(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Reference" />,
        cell: ({ row }) => <PrimeChangeOrderReferenceCell order={row.original} />,
        meta: {
          headerClassName: 'min-w-40',
          skeleton: (
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          ),
        },
      },
      {
        accessorKey: 'totalCost',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total Cost" />,
        cell: ({ row }) => <PrimeChangeOrderCostCell order={row.original} />,
        meta: {
          headerClassName: 'min-w-32 text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="ml-auto h-3.5 w-20" />,
        },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <PrimeChangeOrderStatusCell order={row.original} />,
        meta: {
          headerClassName: 'min-w-44',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <PrimeChangeOrderNameCell order={row.original} />,
        meta: {
          headerClassName: 'min-w-80',
          textOverflow: 'truncate',
          skeleton: <Skeleton className="h-3.5 w-56" />,
        },
      },
      {
        accessorKey: 'scheduleImpact',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Schedule Impact" />,
        cell: ({ row }) => <PrimeChangeOrderScheduleImpactCell order={row.original} />,
        meta: {
          headerClassName: 'min-w-40',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => <PrimeChangeOrderDueDateCell order={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        id: 'assignee',
        header: () => 'Assignee',
        cell: ({ row }) => <PrimeChangeOrderAssigneeCell order={row.original} />,
        meta: {
          headerClassName: 'min-w-44',
          textOverflow: 'truncate',
          tooltipContent: (order) =>
            order.assignee
              ? [order.assignee.displayName, order.assignee.company ?? order.assignee.jobTitle]
                  .filter(Boolean)
                  .join('\n')
              : '-',
          skeleton: (
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'fieldwire',
        header: () => null,
        cell: ({ row }) => <PrimeChangeOrderFieldwireCell order={row.original} />,
        meta: {
          headerClassName: 'w-32',
          skeleton: <Skeleton className="h-7 w-24 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [],
  );
}
