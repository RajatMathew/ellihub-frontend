import { VENDOR_TYPE_LABELS } from '@/modules/directory/constants/vendors/vendor-detail.constants';
import type { VendorDetail, VendorTypeEnum } from '@/modules/directory/schemas/vendor.schema';

export function getVendorTypeLabel(vendor: VendorDetail) {
  if (typeof vendor.type === 'string') {
    return VENDOR_TYPE_LABELS[vendor.type as VendorTypeEnum] ?? vendor.type;
  }

  return vendor.type?.label ?? vendor.type?.name ?? vendor.type?.type ?? 'Unknown';
}

export function formatDirectoryDate(value: string | null | undefined) {
  if (!value) return '-';

  return new Date(value).toISOString().split('T')[0];
}
