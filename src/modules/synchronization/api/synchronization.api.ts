import api from '@/app/api';
import {
  fieldwireSyncOverviewSchema,
  fieldwireSyncResultSchema,
  type FieldwireSyncOverview,
  type FieldwireSyncResult,
} from '@/modules/synchronization/schemas/synchronization.schema';

const FIELDWIRE_BASE = '/prime-change-order/fieldwire';

export const synchronizationApi = {
  async getFieldwireStatus(): Promise<FieldwireSyncOverview> {
    const res = await api.get(`${FIELDWIRE_BASE}/sync-status`);
    return fieldwireSyncOverviewSchema.parse(res.data?.data ?? res.data);
  },

  async syncFieldwire(): Promise<FieldwireSyncResult> {
    const res = await api.patch(`${FIELDWIRE_BASE}/sync`);
    return fieldwireSyncResultSchema.parse(res.data?.data ?? res.data);
  },
};
