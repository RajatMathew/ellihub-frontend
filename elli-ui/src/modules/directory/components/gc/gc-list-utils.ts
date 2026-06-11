import type { GCType, GeneralContractor } from '@/modules/directory/schemas/gc.schema';

export function getGCTypeLabel(type: GCType | null | undefined, fallback?: string | null) {
  return type?.label || type?.name || fallback || 'Unknown';
}

export function getGCTypeCode(type: GCType | null | undefined) {
  return type?.code || '';
}

export function getGCPrimaryContact(gc: GeneralContractor) {
  return (
    gc.contacts?.find((contact) => contact.isPrimary) ??
    gc.contactLinks?.find((link) => link.isPrimary)?.contact ??
    gc.contacts?.[0] ??
    gc.contactLinks?.[0]?.contact ??
    null
  );
}

export function getGCTypeOptionLabel(type: GCType) {
  return type.label || type.name || type.code || type.id;
}
