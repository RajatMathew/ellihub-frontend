import type { BadgeProps } from '@/app/components/ui/badge';

export const ACTIVITY_ENTITY_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'contact', label: 'Contact' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'gc', label: 'General Contractor' },
  { value: 'employee', label: 'Employee' },
  { value: 'department', label: 'Department' },
  { value: 'file', label: 'File' },
  { value: 'costCode', label: 'Cost Code' },
  { value: 'costCodeCategory', label: 'Cost Code Category' },
  { value: 'professionalRole', label: 'Professional Role' },
  { value: 'project', label: 'Project' },
  { value: 'rfq', label: 'RFQ' },
  { value: 'purchaseOrder', label: 'Purchase Order' },
  { value: 'primeChangeOrder', label: 'Prime Change Order' },
  { value: 'subChangeOrder', label: 'Sub Change Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'template', label: 'Template' },
] as const;

export const ACTIVITY_ACTION_OPTIONS = [
  { value: 'create', label: 'Created', variant: 'primary' },
  { value: 'update', label: 'Updated', variant: 'info' },
  { value: 'delete', label: 'Deleted', variant: 'destructive' },
  { value: 'link', label: 'Linked', variant: 'success' },
  { value: 'unlink', label: 'Unlinked', variant: 'warning' },
  { value: 'addTag', label: 'Tag Added', variant: 'success' },
  { value: 'removeTag', label: 'Tag Removed', variant: 'warning' },
  { value: 'comment', label: 'Commented', variant: 'secondary' },
] as const satisfies readonly {
  value: string;
  label: string;
  variant: BadgeProps['variant'];
}[];

export function getActivityEntityLabel(entityType: string) {
  return ACTIVITY_ENTITY_OPTIONS.find((option) => option.value === entityType)?.label ?? entityType;
}

export function getActivityActionMeta(action: string) {
  return (
    ACTIVITY_ACTION_OPTIONS.find((option) => option.value === action) ?? {
      value: action,
      label: action,
      variant: 'secondary' as BadgeProps['variant'],
    }
  );
}
