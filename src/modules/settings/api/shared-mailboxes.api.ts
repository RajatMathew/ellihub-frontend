import api from '@/app/api';
import { z } from 'zod';

const sharedMailboxAccountSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    lastSyncedAt: z.string().nullable(),
    mailboxAddress: z.string().nullable(),
  })
  .nullable();

const sharedMailboxSchema = z.object({
  id: z.string(),
  key: z.string(),
  displayName: z.string(),
  emailAddress: z.string(),
  provider: z.string(),
  status: z.string(),
  account: sharedMailboxAccountSchema,
  vendorEmails: z.array(z.string()),
  sourceCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const vendorConnectionSchema = z.object({
  id: z.string(),
  emailAddress: z.string(),
  displayName: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  sharedMailboxCount: z.number().int().nonnegative(),
});

const authStartSchema = z.object({
  authorizationUrl: z.string().url(),
});

export type SharedMailbox = z.infer<typeof sharedMailboxSchema>;
export type VendorConnection = z.infer<typeof vendorConnectionSchema>;

type ApiResponse<T> = { data?: T; message?: string };

export const sharedMailboxesApi = {
  async discover(): Promise<string> {
    const response = await api.post<ApiResponse<unknown>>('/email/shared-mailboxes/discover');
    return authStartSchema.parse(response.data.data).authorizationUrl;
  },

  async list(): Promise<SharedMailbox[]> {
    const response = await api.get<ApiResponse<unknown>>('/email/shared-mailboxes');
    return sharedMailboxSchema.array().parse(response.data.data ?? []);
  },

  async listVendorConnections(): Promise<VendorConnection[]> {
    const response = await api.get<ApiResponse<unknown>>(
      '/email/shared-mailboxes/vendor-connections'
    );
    return vendorConnectionSchema.array().parse(response.data.data ?? []);
  },

  async disconnectVendorConnection(vendorConnectionId: string): Promise<void> {
    await api.delete(`/email/shared-mailboxes/vendor-connections/${vendorConnectionId}`);
  },

  async removeVendorConnection(vendorConnectionId: string): Promise<void> {
    await api.delete(`/email/shared-mailboxes/vendor-connections/${vendorConnectionId}/remove`);
  },

  async removeSharedMailbox(sharedMailboxId: string): Promise<void> {
    await api.delete(`/email/shared-mailboxes/${sharedMailboxId}`);
  },

  async create(input: {
    key: string;
    displayName: string;
    emailAddress: string;
  }): Promise<SharedMailbox> {
    const response = await api.post<ApiResponse<unknown>>('/email/shared-mailboxes', input);
    return sharedMailboxSchema.parse(response.data.data);
  },

  async connect(sharedMailboxId: string): Promise<string> {
    const response = await api.post<ApiResponse<unknown>>(
      `/email/shared-mailboxes/${sharedMailboxId}/connect`
    );
    return authStartSchema.parse(response.data.data).authorizationUrl;
  },
};
