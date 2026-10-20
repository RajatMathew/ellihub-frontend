import type { GCStatus } from '@/modules/directory/schemas/gc.schema';

export const GCS_DEFAULT_PAGE_SIZE = 10;

export const GCS_SORT_BY_OPTIONS = ['name', 'type', 'status', 'createdAt'] as const;
export type GCsSortByField = (typeof GCS_SORT_BY_OPTIONS)[number];

export const GC_TYPE_BADGE_VARIANTS: Record<string, 'primary' | 'success' | 'info' | 'warning'> = {
  PUBLIC_STATE: 'primary',
  PRIVATE: 'success',
  INSTITUTIONAL: 'info',
  CIVIL: 'warning',
  SCA: 'primary',
};

export const GC_STATUS_LABELS: Record<GCStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};
