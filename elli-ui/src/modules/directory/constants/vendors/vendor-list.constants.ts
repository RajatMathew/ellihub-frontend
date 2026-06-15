import type { VendorStatus } from '@/modules/directory/schemas/vendor.schema';

export const VENDORS_DEFAULT_PAGE_SIZE = 10;
export const VENDORS_SEARCH_DEBOUNCE_MS = 300;

export const VENDORS_SORT_BY_OPTIONS = ['name', 'type', 'status', 'createdAt'] as const;
export type VendorsSortByField = (typeof VENDORS_SORT_BY_OPTIONS)[number];

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const VENDOR_TYPE_BADGE_VARIANTS: Record<
  string,
  'primary' | 'success' | 'info' | 'warning'
> = {
  MATERIAL: 'primary',
  FABRICATION: 'success',
  INSTALLATION: 'info',
  SUBCONTRACTOR: 'warning',
};

export function isVendorsSortByField(value: string | null): value is VendorsSortByField {
  return VENDORS_SORT_BY_OPTIONS.includes(value as VendorsSortByField);
}

export function isValidVendorStatus(value: string | null): value is VendorStatus {
  return value === 'ACTIVE' || value === 'INACTIVE';
}
