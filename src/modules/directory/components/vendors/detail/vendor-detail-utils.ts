import { VENDOR_TYPE_LABELS } from '@/modules/directory/constants/vendors/vendor-detail.constants';
import type { VendorDetail, VendorTypeEnum } from '@/modules/directory/schemas/vendor.schema';

// Moved to shared when GC documents started needing it. Re-exported so vendor
// callers keep their existing import.
export { formatDirectoryDate } from '@/modules/directory/components/shared/directory-format';

export function getVendorTypeLabel(vendor: VendorDetail) {
  if (typeof vendor.type === 'string') {
    return VENDOR_TYPE_LABELS[vendor.type as VendorTypeEnum] ?? vendor.type;
  }

  return vendor.type?.label ?? vendor.type?.name ?? vendor.type?.type ?? 'Unknown';
}
