import type { Vendor, VendorType } from '@/modules/directory/schemas/vendor.schema';

export function getVendorTypeLabel(type: VendorType | null | undefined): string {
  if (!type) return 'Unknown';
  if (typeof type === 'string') return type;
  return type.label || type.type || 'Unknown';
}

export function getVendorTypeCode(type: VendorType | null | undefined): string {
  if (!type) return '';
  if (typeof type === 'string') return type;
  return type.type || '';
}

export function getVendorContactCount(vendor: Vendor) {
  const nestedContacts = vendor.contacts?.length ?? 0;
  const linkedContacts = vendor.contactLinks?.length ?? 0;
  const countedContacts = vendor._count?.contacts ?? 0;
  const countedLinks = vendor._count?.contactLinks ?? 0;

  return nestedContacts + linkedContacts || countedContacts || countedLinks;
}

export function getVendorPrimaryContact(vendor: Vendor) {
  return (
    vendor.contacts?.find((contact) => contact.isPrimary) ??
    vendor.contactLinks?.find((link) => link.isPrimary)?.contact ??
    vendor.contacts?.[0] ??
    vendor.contactLinks?.[0]?.contact ??
    null
  );
}

export function getVendorTypeOptionLabel(type: {
  code?: string;
  id: string;
  label?: string;
  name?: string;
  type?: string;
}) {
  return type.label || type.name || type.type || type.code || type.id;
}
