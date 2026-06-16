import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  CreatedAtCell,
  DueDateCell,
  InvoiceActionsCell,
  InvoiceDateCell,
  InvoiceNumberCell,
  PaymentCell,
  PurchaseOrderCell,
  TotalAmountCell,
  VendorCell,
} from '@/modules/project/components/invoice/invoice-list-column-cells';
import type { InvoiceListItem } from '@/modules/project/schemas/invoice';

export function useInvoiceListColumns(projectId: string) {
  return useMemo<ColumnDef<InvoiceListItem>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice #" />,
        cell: ({ row }) => <InvoiceNumberCell invoice={row.original} />,
        meta: {
          headerClassName: 'min-w-48',
          textOverflow: 'truncate',
          preserveTruncatedCellLayout: true,
          alwaysShowTooltip: true,
          tooltipContent: (invoice) =>
            [invoice.invoiceNumber ?? '-', invoice.notes].filter(Boolean).join('\n'),
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ),
        },
      },
      {
        id: 'vendor',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => <VendorCell invoice={row.original} />,
        meta: {
          headerClassName: 'min-w-44',
          textOverflow: 'truncate',
          tooltipContent: (invoice) => invoice.vendor?.name ?? '-',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
        enableSorting: false,
      },
      {
        id: 'purchaseOrder',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Purchase Order" />,
        cell: ({ row }) => <PurchaseOrderCell invoice={row.original} projectId={projectId} />,
        meta: {
          headerClassName: 'min-w-44',
          textOverflow: 'truncate',
          tooltipContent: (invoice) =>
            invoice.purchaseOrder?.poNumber ?? invoice.purchaseOrderId ?? '-',
          skeleton: <Skeleton className="h-3.5 w-32" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice Date" />,
        cell: ({ row }) => <InvoiceDateCell invoice={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => <DueDateCell invoice={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        accessorKey: 'totalAmount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total" />,
        cell: ({ row }) => <TotalAmountCell invoice={row.original} />,
        meta: {
          headerClassName: 'min-w-32 text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
      },
      {
        id: 'payment',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Payment" />,
        cell: ({ row }) => <PaymentCell invoice={row.original} />,
        meta: {
          headerClassName: 'min-w-36',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => <CreatedAtCell invoice={row.original} />,
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => <InvoiceActionsCell invoice={row.original} />,
        meta: {
          headerClassName: 'w-14',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [projectId],
  );
}
