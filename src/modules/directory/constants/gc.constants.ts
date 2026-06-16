import type { GCStatus } from '@/modules/directory/schemas/gc.schema';

export const GC_FORM_SECTIONS = [
  { id: 'info', label: 'Info' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'compliance-docs', label: 'Compliance Docs' },
] as const;

export const GC_STATUS_OPTIONS: { value: GCStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];
