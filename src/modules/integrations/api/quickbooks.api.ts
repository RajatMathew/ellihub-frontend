import api from '@/app/api';
import {
  quickBooksAuthorizationSchema,
  quickBooksBankAccountsSchema,
  quickBooksDisconnectSchema,
  quickBooksLineItemCategoriesSchema,
  quickBooksPayeesSchema,
  quickBooksReferenceAutoDailySyncSchema,
  quickBooksReferenceSyncResultSchema,
  quickBooksReferenceSyncStatusSchema,
  quickBooksStatusSchema,
  type QuickBooksAuthorization,
  type QuickBooksBankAccount,
  type QuickBooksDisconnect,
  type QuickBooksLineItemCategory,
  type QuickBooksPayee,
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

  async listBankAccounts(): Promise<QuickBooksBankAccount[]> {
    const res = await api.get(`${BASE}/bank-accounts`);
    return quickBooksBankAccountsSchema.parse(res.data?.data ?? res.data);
  },

  async listCategories(): Promise<QuickBooksLineItemCategory[]> {
    const res = await api.get(`${BASE}/categories`);
    return quickBooksLineItemCategoriesSchema.parse(res.data?.data ?? res.data);
  },

  async listVendors(): Promise<QuickBooksPayee[]> {
    const res = await api.get(`${BASE}/vendors`);
    return quickBooksPayeesSchema.parse(res.data?.data ?? res.data);
  },
};
