import api from '@/app/api';
import {
  quickBooksAuthorizationSchema,
  quickBooksBankAccountsSchema,
  quickBooksCreateVendorResultSchema,
  quickBooksDisconnectSchema,
  quickBooksLineItemCategoriesSchema,
  quickBooksPayeePaginatedResponseSchema,
  quickBooksPayeesSchema,
  quickBooksReferenceAutoDailySyncSchema,
  quickBooksReferenceSyncResultSchema,
  quickBooksReferenceSyncStatusSchema,
  quickBooksStatusSchema,
  quickBooksUnmapVendorResultSchema,
  quickBooksVendorMappingSchema,
  type QuickBooksAuthorization,
  type QuickBooksBankAccount,
  type QuickBooksCreateVendorPayload,
  type QuickBooksCreateVendorResult,
  type QuickBooksDisconnect,
  type QuickBooksLineItemCategory,
  type QuickBooksMapVendorPayload,
  type QuickBooksPayee,
  type QuickBooksPayeePaginatedResponse,
  type QuickBooksReferenceAutoDailySync,
  type QuickBooksReferenceSyncResult,
  type QuickBooksReferenceSyncStatus,
  type QuickBooksStatus,
  type QuickBooksUnmapVendorResult,
  type QuickBooksVendorMapping,
} from '@/modules/integrations/schemas/quickbooks.schema';

const BASE = '/integrations/quickbooks';

export interface ListQuickBooksVendorOptionsParams {
  page?: number;
  size?: number;
  search?: string;
  includeInactive?: boolean;
}

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

  async listVendorOptions(
    params?: ListQuickBooksVendorOptionsParams
  ): Promise<QuickBooksPayeePaginatedResponse> {
    const query: Record<string, string | number | boolean> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.search) query.search = params.search;
    if (params?.includeInactive != null) query.includeInactive = params.includeInactive;

    const res = await api.get(`${BASE}/vendor-options`, { params: query });
    return quickBooksPayeePaginatedResponseSchema.parse({
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: params?.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params?.size ?? 25,
      },
    });
  },

  async createVendor(
    payload: QuickBooksCreateVendorPayload
  ): Promise<QuickBooksCreateVendorResult> {
    const res = await api.post(`${BASE}/vendors`, payload);
    return quickBooksCreateVendorResultSchema.parse(res.data?.data ?? res.data);
  },

  async mapVendor(payload: QuickBooksMapVendorPayload): Promise<QuickBooksVendorMapping> {
    const res = await api.put(`${BASE}/vendor-mappings`, payload);
    return quickBooksVendorMappingSchema.parse(res.data?.data ?? res.data);
  },

  async unmapVendor(vendorId: string): Promise<QuickBooksUnmapVendorResult> {
    const res = await api.delete(`${BASE}/vendor-mappings/${vendorId}`);
    return quickBooksUnmapVendorResultSchema.parse(res.data?.data ?? res.data);
  },
};
