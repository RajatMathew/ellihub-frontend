import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { POListItem } from '@/modules/project/schemas/purchase-order';

import {
  PurchaseOrderActionsCell,
  PurchaseOrderAmountCell,
  PurchaseOrderCreatedAtCell,
  PurchaseOrderNumberCell,
  PurchaseOrderRfqCell,
  PurchaseOrderStatusCell,
  PurchaseOrderTimelineCell,
  PurchaseOrderTradeCategoryCell,
  PurchaseOrderVendorCell,
} from './purchase-order-list-column-cells';
import {
  getPurchaseOrderRfqLabel,
  getPurchaseOrderTradeCategoryLabel,
  getPurchaseOrderVendorName,
} from './purchase-order-list-utils';

export function usePurchaseOrderListColumns({
  projectId,
  tradeCategoryLabelById,
  onCancel,
}: {
  projectId: string;
  tradeCategoryLabelById: Map<string, string>;
  onCancel: (po: POListItem) => void;
}) {
  return useMemo<ColumnDef<POListItem>[]>(
    () => [
      {
        accessorKey: 'poNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="PO #" />,
        cell: ({ row }) => <PurchaseOrderNumberCell po={row.original} />,
        meta: {
          headerClassName: 'min-w-48',
          textOverflow: 'truncate',
          preserveTruncatedCellLayout: true,
          alwaysShowTooltip: true,
          tooltipContent: (po) =>
            [po.poNumber ?? '-', po.description].filter(Boolean).join('\n'),
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ),
        },
      },
      {
        accessorKey: 'vendorId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => <PurchaseOrderVendorCell po={row.original} />,
        meta: {
          headerClassName: 'min-w-40',
          textOverflow: 'truncate',
          tooltipContent: (po) => getPurchaseOrderVendorName(po),
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'rfqId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RFQ" />,
        cell: ({ row }) => (
          <PurchaseOrderRfqCell po={row.original} projectId={projectId} />
        ),
        meta: {
          headerClassName: 'min-w-28',
          textOverflow: 'truncate',
          tooltipContent: (po) => getPurchaseOrderRfqLabel(po) ?? po.rfqId ?? '-',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      {
        id: 'tradeCategoryId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Trade Category" />,
        cell: ({ row }) => (
          <PurchaseOrderTradeCategoryCell
            po={row.original}
            fallback={
              row.original.tradeCategoryId
                ? tradeCategoryLabelById.get(row.original.tradeCategoryId)
                : undefined
            }
          />
        ),
        meta: {
          headerClassName: 'min-w-36',
          textOverflow: 'truncate',
          tooltipContent: (po) =>
            getPurchaseOrderTradeCategoryLabel(
              po,
              po.tradeCategoryId ? tradeCategoryLabelById.get(po.tradeCategoryId) : undefined
            ),
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <PurchaseOrderStatusCell po={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'total',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => <PurchaseOrderAmountCell po={row.original} />,
        meta: {
          headerClassName: 'min-w-40 text-right',
          cellClassName: 'text-right',
          skeleton: (
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ),
        },
      },
      {
        id: 'timeline',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Timeline" />,
        cell: ({ row }) => <PurchaseOrderTimelineCell po={row.original} />,
        meta: {
          headerClassName: 'min-w-48',
          skeleton: (
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => <PurchaseOrderCreatedAtCell po={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <PurchaseOrderActionsCell po={row.original} onCancel={onCancel} />
        ),
        meta: {
          headerClassName: 'w-14',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [onCancel, projectId, tradeCategoryLabelById],
  );
}
