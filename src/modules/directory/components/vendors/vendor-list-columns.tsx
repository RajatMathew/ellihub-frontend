import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { ImportedBadge } from '@/app/components/import-source';
import { formatCurrency } from '@/app/lib/helpers';
import type { VendorCommitmentSummary } from '@/modules/directory/components/vendors/vendor-commitment-utils';
import {
  VendorContactCell,
  VendorTypeCell,
} from '@/modules/directory/components/vendors/vendor-list-column-cells';
import { getVendorPrimaryContact } from '@/modules/directory/components/vendors/vendor-list-utils';
import { VENDOR_STATUS_LABELS } from '@/modules/directory/constants/vendors/vendor-list.constants';
import type { Vendor } from '@/modules/directory/schemas/vendor.schema';
import { type ColumnDef } from '@tanstack/react-table';

interface UseVendorListColumnsOptions {
  typeLabels: Map<string, string>;
  onDelete: (id: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  commitmentsByVendorId?: Map<string, VendorCommitmentSummary>;
}

function getContactCount(vendor: Vendor): number {
  return vendor.contacts?.length ?? vendor._count?.contacts ?? 0;
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
      col.link({
        key: 'name',
        title: 'Vendor Name',
        to: (vendor) => vendor.id,
        label: (vendor) => vendor.name,
        badge: (vendor) => <ImportedBadge source={vendor.importSource} />,
        secondary: (vendor) => {
          const count = getContactCount(vendor);
          const contacts = `${count} Contact${count === 1 ? '' : 's'}`;

          return vendor.status === 'ACTIVE'
            ? contacts
            : `${contacts} · ${VENDOR_STATUS_LABELS[vendor.status]}`;
        },
        tooltip: (vendor) => vendor.name,
        width: 'xl',
      }),
      col.custom({
        key: 'type',
        title: 'Type',
        cell: (vendor) => <VendorTypeCell typeLabels={typeLabels} vendor={vendor} />,
      }),
      col.custom({
        key: 'contact',
        title: 'Contact',
        cell: (vendor) => <VendorContactCell vendor={vendor} />,
        tooltip: (vendor) =>
          getVendorPrimaryContact(vendor)?.fullName ?? vendor.email ?? vendor.name,
        width: 'lg',
      }),
      col.text({
        key: 'documents',
        title: 'Documents',
        value: (vendor) => {
          const count = vendor.documentCount ?? vendor._count?.documents ?? 0;
          return `${count} Document${count === 1 ? '' : 's'}`;
        },
        sortable: false,
        width: 'md',
      }),
      col.currency({
        key: 'totalCommitted',
        title: 'Total Committed',
        value: (vendor) =>
          formatCurrency(
            commitmentsByVendorId?.get(vendor.id)?.totalCommitted ?? vendor.totalCommitted
          ),
        sortable: false,
        width: 'md',
      }),
      col.currency({
        key: 'balance',
        title: 'Balance',
        value: (vendor) => {
          const commitment = commitmentsByVendorId?.get(vendor.id);

          return formatCurrency(
            commitment ? commitment.totalCommitted - vendor.totalPaid : vendor.currentBalance
          );
        },
        sortable: false,
      }),
      col.actions({
        label: (vendor) => vendor.name,
        items: (vendor) => [
          { label: 'View', to: `${vendor.id}` },
          canUpdate && { label: 'Edit', to: `${vendor.id}/edit` },
          canDelete && {
            destructive: true,
            label: 'Archive',
            onSelect: () => onDelete(vendor.id),
          },
        ],
      }),
    ],
    [canDelete, canUpdate, commitmentsByVendorId, onDelete, typeLabels]
  );
}
