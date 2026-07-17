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
  quickBooksRegisterAccountsSchema,
  quickBooksRegisterTransactionsResponseSchema,
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
  type QuickBooksRegisterAccount,
  type QuickBooksRegisterClr,
  type QuickBooksRegisterTransactionsResponse,
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

export interface ListQuickBooksRegisterTransactionsParams {
  accountId: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  clr?: QuickBooksRegisterClr;
  transactionType?: string;
  page?: number;
  size?: number;
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

  async listRegisterAccounts(): Promise<QuickBooksRegisterAccount[]> {
    const res = await api.get(`${BASE}/register/accounts`);
    return quickBooksRegisterAccountsSchema.parse(res.data?.data ?? res.data);
  },

  async listRegisterTransactions(
    params: ListQuickBooksRegisterTransactionsParams
  ): Promise<QuickBooksRegisterTransactionsResponse> {
    const { accountId, ...filters } = params;
    const query: Record<string, string | number> = {};

    if (filters.startDate) query.startDate = filters.startDate;
    if (filters.endDate) query.endDate = filters.endDate;
    if (filters.search) query.search = filters.search;
    if (filters.clr) query.clr = filters.clr;
    if (filters.transactionType) query.transactionType = filters.transactionType;
    if (filters.page != null) query.page = filters.page;
    if (filters.size != null) query.size = filters.size;

    const res = await api.get(
      `${BASE}/register/accounts/${encodeURIComponent(accountId)}/transactions`,
      { params: query }
    );
    return quickBooksRegisterTransactionsResponseSchema.parse(res.data?.data ?? res.data);
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
