import { DetailPageHeader } from '@/app/components/page-header';
import { VENDOR_STATUS_LABELS } from '@/modules/directory/constants/vendors/vendor-detail.constants';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { Pencil, Trash2 } from 'lucide-react';

import { getVendorTypeLabel } from './vendor-detail-utils';

interface VendorDetailToolbarProps {
  vendor: VendorDetail;
  sidebarOpen: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function VendorDetailToolbar({
  vendor,
  sidebarOpen,
  canUpdate,
  canDelete,
  onDelete,
  onOpenSidebar,
}: VendorDetailToolbarProps) {
  return (
    <DetailPageHeader
      title={vendor.name}
      status={{ value: vendor.status, label: VENDOR_STATUS_LABELS[vendor.status] }}
      meta={[
        { label: 'Type', value: getVendorTypeLabel(vendor) },
        ...(vendor.taxId ? [{ label: 'Tax ID', value: vendor.taxId }] : []),
      ]}
      actions={[
        { label: 'Edit Profile', icon: Pencil, to: 'edit', enabled: canUpdate },
        {
          label: 'Archive Vendor',
          icon: Trash2,
          placement: 'overflow',
          destructive: true,
          onClick: onDelete,
          enabled: canDelete,
        },
      ]}
      panel={{ open: sidebarOpen, onOpen: onOpenSidebar }}
    />
  );
}
