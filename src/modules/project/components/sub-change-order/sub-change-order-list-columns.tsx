import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';

import {
  SubChangeOrderActionsCell,
  SubChangeOrderAmountCell,
  SubChangeOrderCreatedAtCell,
  SubChangeOrderDateCell,
  SubChangeOrderNumberCell,
  SubChangeOrderPurchaseOrderCell,
  SubChangeOrderStatusCell,
  SubChangeOrderTypeCell,
} from './sub-change-order-list-column-cells';
import {
  getSubChangeOrderPurchaseOrderLabel,
  getSubChangeOrderTypeLabel,
} from './sub-change-order-list-utils';

export function useSubChangeOrderListColumns({
  projectId,
  changeTypeLabelById,
}: {
  projectId: string;
  changeTypeLabelById: Map<string, string>;
}) {
  return useMemo<ColumnDef<SCOListItem>[]>(
    () => [
      {
        accessorKey: 'scoNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SCO #" />,
        cell: ({ row }) => <SubChangeOrderNumberCell sco={row.original} />,
        meta: {
          headerClassName: 'min-w-48',
          textOverflow: 'truncate',
          preserveTruncatedCellLayout: true,
          alwaysShowTooltip: true,
          tooltipContent: (sco) =>
            [sco.scoNumber ?? '-', sco.title ?? sco.description].filter(Boolean).join('\n'),
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ),
        },
      },
      {
        id: 'purchaseOrder',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Purchase Order" />,
        cell: ({ row }) => (
          <SubChangeOrderPurchaseOrderCell sco={row.original} projectId={projectId} />
        ),
        meta: {
          headerClassName: 'min-w-44',
          textOverflow: 'truncate',
          tooltipContent: (sco) => getSubChangeOrderPurchaseOrderLabel(sco),
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'changeTypeId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Change Type" />,
        cell: ({ row }) => (
          <SubChangeOrderTypeCell
            sco={row.original}
            fallback={
              row.original.changeTypeId
                ? changeTypeLabelById.get(row.original.changeTypeId)
                : undefined
            }
          />
        ),
        meta: {
          headerClassName: 'min-w-36',
          textOverflow: 'truncate',
          tooltipContent: (sco) =>
            getSubChangeOrderTypeLabel(
              sco,
              sco.changeTypeId ? changeTypeLabelById.get(sco.changeTypeId) : undefined
            ),
          skeleton: <Skeleton className="h-5 w-24 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => <SubChangeOrderAmountCell sco={row.original} />,
        meta: {
          headerClassName: 'min-w-32 text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <SubChangeOrderStatusCell sco={row.original} />,
        meta: {
          headerClassName: 'min-w-28',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
      },
      {
        id: 'date',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
        cell: ({ row }) => <SubChangeOrderDateCell sco={row.original} />,
        meta: {
          headerClassName: 'min-w-36',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => <SubChangeOrderCreatedAtCell sco={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => <SubChangeOrderActionsCell sco={row.original} />,
        meta: {
          headerClassName: 'w-14',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [changeTypeLabelById, projectId],
  );
}
