import type { VendorStatus, VendorTypeEnum } from '@/modules/directory/schemas/vendor.schema';

export const VENDOR_TYPE_LABELS: Record<VendorTypeEnum, string> = {
  MATERIAL: 'Material',
  FABRICATION: 'Fabrication',
  INSTALLATION: 'Installation',
  SUBCONTRACTOR: 'Subcontractor',
};

export const VENDOR_STATUS_COLORS: Record<VendorStatus, string> = {
  ACTIVE: 'bg-success',
  INACTIVE: 'bg-muted-foreground',
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const VENDOR_DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'projects', label: 'Projects' },
  { value: 'purchase-orders', label: 'Purchase Orders' },
] as const;
