import api from '@/app/api';
import {
  quickBooksAuthorizationSchema,
  quickBooksDisconnectSchema,
  quickBooksReferenceAutoDailySyncSchema,
  quickBooksReferenceSyncResultSchema,
  quickBooksReferenceSyncStatusSchema,
  quickBooksStatusSchema,
  type QuickBooksAuthorization,
  type QuickBooksDisconnect,
  type QuickBooksReferenceAutoDailySync,
  type QuickBooksReferenceSyncResult,
  type QuickBooksReferenceSyncStatus,
  type QuickBooksStatus,
} from '@/modules/integrations/schemas/quickbooks.schema';

const BASE = '/integrations/quickbooks';

export const quickBooksApi = {
  async getStatus(): Promise<QuickBooksStatus> {
    const res = await api.get(`${BASE}/status`);
    return quickBooksStatusSchema.parse(res.data?.data ?? res.data);
  },

  async createAuthorizationUrl(): Promise<QuickBooksAuthorization> {
    const res = await api.post(`${BASE}/auth-url`);
    return quickBooksAuthorizationSchema.parse(res.data?.data ?? res.data);
  },

  async disconnect(): Promise<QuickBooksDisconnect> {
    const res = await api.post(`${BASE}/disconnect`);
    return quickBooksDisconnectSchema.parse(res.data?.data ?? res.data);
  },

  async getReferenceSyncStatus(): Promise<QuickBooksReferenceSyncStatus> {
    const res = await api.get(`${BASE}/reference-sync/status`);
    return quickBooksReferenceSyncStatusSchema.parse(res.data?.data ?? res.data);
  },

  async syncReferenceData(): Promise<QuickBooksReferenceSyncResult> {
    const res = await api.patch(`${BASE}/reference-sync`);
    return quickBooksReferenceSyncResultSchema.parse(res.data?.data ?? res.data);
  },

  async updateReferenceAutoDailySync(enabled: boolean): Promise<QuickBooksReferenceAutoDailySync> {
    const res = await api.patch(`${BASE}/reference-sync/auto-daily`, { enabled });
    return quickBooksReferenceAutoDailySyncSchema.parse(res.data?.data ?? res.data);
  },
};
