import api from '@/app/api';
import {
  quickBooksAuthorizationSchema,
  quickBooksDisconnectSchema,
  quickBooksStatusSchema,
  quickBooksTransactionsSchema,
  type QuickBooksAuthorization,
  type QuickBooksDisconnect,
  type QuickBooksStatus,
  type QuickBooksTransactionEntity,
  type QuickBooksTransactions,
} from '@/modules/integrations/schemas/quickbooks.schema';

const BASE = '/integrations/quickbooks';

type QuickBooksTransactionsParams = {
  entities?: QuickBooksTransactionEntity[];
  maxResults?: number;
};

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

  async getTransactions(params?: QuickBooksTransactionsParams): Promise<QuickBooksTransactions> {
    const res = await api.get(`${BASE}/transactions`, {
      params: {
        entities: params?.entities?.join(','),
        maxResults: params?.maxResults,
      },
    });
    return quickBooksTransactionsSchema.parse(res.data?.data ?? res.data);
  },
};
