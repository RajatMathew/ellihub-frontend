import type { VendorStatus, VendorType } from '@/modules/directory/schemas/vendor.schema';

export const VENDOR_FORM_SECTIONS = [
  { id: 'info', label: 'Info' },
  { id: 'contacts', label: 'Contacts' },
] as const;

export const VENDOR_TYPE_OPTIONS: { value: VendorType; label: string }[] = [
  { value: 'MATERIAL', label: 'Material Vendor' },
  { value: 'FABRICATION', label: 'Fabrication' },
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
];

export const VENDOR_STATUS_OPTIONS: { value: VendorStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export const CONTACT_ROLE_OPTIONS = [
  'Primary Contact',
  'Accounts Payable',
  'Estimator',
  'Project Manager',
  'Sales Rep',
  'Operations',
];
