import { useMemo } from 'react';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { VendorCommitmentSummary } from '@/modules/directory/components/vendors/vendor-commitment-utils';
import { getVendorPrimaryContact } from '@/modules/directory/components/vendors/vendor-list-utils';
import {
  VendorActionsCell,
  VendorContactCell,
  VendorCurrencyCell,
  VendorDocumentCountCell,
  VendorNameCell,
  VendorTypeCell,
} from '@/modules/directory/components/vendors/vendor-list-column-cells';
import type { Vendor } from '@/modules/directory/schemas/vendor.schema';
import { type ColumnDef } from '@tanstack/react-table';

interface UseVendorListColumnsOptions {
  typeLabels: Map<string, string>;
  onDelete: (id: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  commitmentsByVendorId?: Map<string, VendorCommitmentSummary>;
}

export function useVendorListColumns({
  typeLabels,
  onDelete,
  canUpdate,
  canDelete,
  commitmentsByVendorId,
}: UseVendorListColumnsOptions) {
  return useMemo<ColumnDef<Vendor>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor Name" />,
        cell: ({ row }) => <VendorNameCell vendor={row.original} />,
        meta: {
          headerClassName: 'w-[26%] min-w-72 max-w-[28rem]',
          cellClassName: 'w-[26%] min-w-72 max-w-[28rem]',
          textOverflow: 'truncate',
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
        cell: ({ row }) => <VendorTypeCell vendor={row.original} typeLabels={typeLabels} />,
        meta: {
          headerClassName: 'w-[12%] min-w-32',
          cellClassName: 'w-[12%] min-w-32',
          skeleton: <Skeleton className="h-5 w-24 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        id: 'contact',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contact" />,
        cell: ({ row }) => <VendorContactCell vendor={row.original} />,
        meta: {
          headerClassName: 'w-[20%] min-w-64 max-w-[24rem]',
          cellClassName: 'w-[20%] min-w-64 max-w-[24rem]',
          textOverflow: 'truncate',
          tooltipContent: (vendor) =>
            getVendorPrimaryContact(vendor)?.fullName ?? vendor.email ?? vendor.name,
          skeleton: (
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'documents',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Documents" />,
        cell: ({ row }) => <VendorDocumentCountCell vendor={row.original} />,
        meta: {
          headerClassName: 'w-[12%] min-w-36',
          cellClassName: 'w-[12%] min-w-36',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        id: 'totalCommitted',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total Committed" />,
        cell: ({ row }) => (
          <VendorCurrencyCell
            value={
              commitmentsByVendorId?.get(row.original.id)?.totalCommitted ??
              row.original.totalCommitted
            }
          />
        ),
        meta: {
          headerClassName: 'w-[14%] min-w-44',
          cellClassName: 'w-[14%] min-w-44',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      {
        id: 'balance',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Balance" />,
        cell: ({ row }) => {
          const commitment = commitmentsByVendorId?.get(row.original.id);
          const balance = commitment
            ? commitment.totalCommitted - row.original.totalPaid
            : row.original.currentBalance;

          return <VendorCurrencyCell value={balance} />;
        },
        meta: {
          headerClassName: 'w-[10%] min-w-32',
          cellClassName: 'w-[10%] min-w-32',
          skeleton: <Skeleton className="h-3.5 w-16" />,
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <VendorActionsCell
            vendor={row.original}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={onDelete}
          />
        ),
        meta: {
          headerClassName: 'w-16',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [canDelete, canUpdate, commitmentsByVendorId, onDelete, typeLabels]
  );
}
