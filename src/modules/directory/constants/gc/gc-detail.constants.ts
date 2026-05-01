import type { GCStatus } from '@/modules/directory/schemas/gc.schema';

export const GC_TYPE_BADGE_VARIANTS: Record<string, 'primary' | 'success' | 'info' | 'warning'> = {
  PUBLIC_STATE: 'primary',
  PRIVATE: 'success',
  INSTITUTIONAL: 'info',
  CIVIL: 'warning',
  SCA: 'primary',
};

export const GC_STATUS_COLORS: Record<GCStatus, string> = {
  ACTIVE: 'bg-success',
  PROSPECTING: 'bg-primary',
  INACTIVE: 'bg-muted-foreground',
};

export const GC_STATUS_LABELS: Record<GCStatus, string> = {
  ACTIVE: 'Active',
  PROSPECTING: 'Prospect',
  INACTIVE: 'Inactive',
};

export const GC_DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'projects', label: 'Projects' },
  { value: 'change-orders', label: 'Change Orders' },
  { value: 'prime-payments', label: 'Prime Payments' },
] as const;
