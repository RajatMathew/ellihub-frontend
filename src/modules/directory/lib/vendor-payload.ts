import type { VendorFormValues } from '@/modules/directory/schemas/vendor.schema';

/**
 * A vendor's cell phone and address, as the API takes them. A blank or
 * whitespace-only value is no value: the API rejects an empty string for
 * either, so it goes as `null`, which also clears what was saved before.
 */
export function getVendorContactPayload(values: Pick<VendorFormValues, 'phone' | 'address'>): {
  phone: string | null;
  address: string | null;
} {
  return {
    phone: values.phone?.trim() || null,
    address: values.address?.trim() || null,
  };
}
