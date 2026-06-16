import type { SCOStatusName } from '@/modules/project/schemas/sub-change-order';

export const SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE = 25;
export const SUB_CHANGE_ORDER_SEARCH_DEBOUNCE_MS = 300;

export const SUB_CHANGE_ORDER_SORT_BY_OPTIONS = [
  'createdAt',
  'scoNumber',
  'amount',
  'status',
  'date',
] as const;

export type SubChangeOrderSortByField =
  (typeof SUB_CHANGE_ORDER_SORT_BY_OPTIONS)[number];

export function isSubChangeOrderSortByField(
  value: string | null,
): value is SubChangeOrderSortByField {
  return SUB_CHANGE_ORDER_SORT_BY_OPTIONS.includes(value as SubChangeOrderSortByField);
}

export const SCO_STATUS_BADGE_VARIANTS: Record<
  string,
  'primary' | 'success' | 'info' | 'warning' | 'destructive' | 'secondary'
> = {
  DRAFT: 'primary',
  APPROVED: 'success',
  REJECTED: 'destructive',
  VOID: 'secondary',
};

export const SCO_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted-foreground',
  APPROVED: 'bg-success',
  REJECTED: 'bg-destructive',
  VOID: 'bg-muted-foreground',
};

export function getSCOPriorityVariant(priority: string | null | undefined) {
  switch (priority) {
    case 'URGENT':
      return 'destructive' as const;
    case 'HIGH':
      return 'warning' as const;
    case 'MEDIUM':
      return 'primary' as const;
    case 'LOW':
      return 'secondary' as const;
    default:
      return 'secondary' as const;
  }
}

export const SCO_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'VOID', label: 'Void' },
] as const;

export function isValidSCOStatus(value: string | null): value is SCOStatusName {
  return SCO_STATUS_OPTIONS.some((option) => option.value === value);
}

export const PRIORITY_BADGE_VARIANTS: Record<
  string,
  'primary' | 'success' | 'info' | 'warning' | 'destructive'
> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const INITIATED_BY_LABELS: Record<string, string> = {
  VENDOR: 'Vendor',
  FIRM: 'Firm',
};

export const INITIATED_BY_OPTIONS = [
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'FIRM', label: 'Firm' },
] as const;

export const SCO_FORM_SECTIONS = [
  { id: 'sco-details', label: 'SCO Details' },
  { id: 'line-items', label: 'Line Items' },
  { id: 'documents', label: 'Documents' },
] as const;

export const SCO_CHANGE_TYPE_OPTIONS = [
  { value: 'UNFORESEEN_CONDITIONS', label: 'Unforeseen Conditions' },
  { value: 'DESIGN_CHANGE', label: 'Design Change' },
  { value: 'QUANTITY_ADJUSTMENT', label: 'Quantity Adjustment' },
  { value: 'MATERIAL_SUBSTITUTION', label: 'Material Substitution' },
  { value: 'LABOR_ADJUSTMENT', label: 'Labor Adjustment' },
  { value: 'EQUIPMENT_RENTAL', label: 'Equipment Rental' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'BACKCHARGE', label: 'Backcharge' },
  { value: 'SCHEDULE_ACCELERATION', label: 'Schedule Acceleration' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const SCO_COST_CATEGORY_OPTIONS = [
  { value: 'MATERIALS', label: 'Materials' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const SCO_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
] as const;
