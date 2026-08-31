import type { GCStatus } from '@/modules/directory/schemas/gc.schema';

// Re-exported rather than restated: the detail header and the list cell paint a
// GC's type identically, and the two copies of this map had already drifted out
// of anyone's sight of each other.
export { GC_TYPE_BADGE_VARIANTS } from './gc-list.constants';

export const GC_STATUS_LABELS: Record<GCStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const GC_DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'projects', label: 'Projects' },
] as const;
