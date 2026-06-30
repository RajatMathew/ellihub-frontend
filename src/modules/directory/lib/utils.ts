import type { VendorStatus } from '@/modules/directory/schemas/vendor.schema';

export function isValidVendorStatus(v: string | null): v is VendorStatus {
  return v === 'ACTIVE' || v === 'INACTIVE';
}
