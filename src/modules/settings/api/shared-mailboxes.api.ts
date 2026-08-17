import api from '@/app/api';
import { z } from 'zod';

const pendingDiscoveryCandidateSchema = z.object({
  emailAddress: z.string(),
  displayName: z.string(),
  alreadyAvailable: z.boolean().default(false),
});

const pendingDiscoverySchema = z.object({
  id: z.string(),
  scope: z.enum(['vendor', 'personal']),
  status: z.enum(['discovering', 'ready', 'error']),
  errorMessage: z.string().nullable(),
  candidates: z.array(pendingDiscoveryCandidateSchema),
  primaryAccountId: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  expiresAt: z.string(),
});

const confirmPendingDiscoverySchema = z.object({
  provisioned: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  provisionedAccountIds: z.array(z.string()),
});

const batchSyncStatusSchema = z.object({
  accountId: z.string(),
  displayName: z.string(),
  emailAddress: z.string(),
  status: z.string(),
  lastSyncStatus: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  lastSyncError: z.string().nullable(),
  messageCount: z.number().int().nonnegative(),
  folderCount: z.number().int().nonnegative(),
  inFlight: z.boolean(),
});

export type PendingDiscoveryCandidate = z.infer<typeof pendingDiscoveryCandidateSchema>;
export type PendingDiscovery = z.infer<typeof pendingDiscoverySchema>;
export type ConfirmPendingDiscoveryResult = z.infer<typeof confirmPendingDiscoverySchema>;
export type BatchSyncStatus = z.infer<typeof batchSyncStatusSchema>;

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

  async getPendingDiscovery(pendingId: string): Promise<PendingDiscovery> {
    const response = await api.get<ApiResponse<unknown>>(
      `/email/pending-discoveries/${pendingId}`
    );
    return pendingDiscoverySchema.parse(response.data.data);
  },

  async confirmPendingDiscovery(
    pendingId: string,
    emailAddresses: string[]
  ): Promise<ConfirmPendingDiscoveryResult> {
    const response = await api.post<ApiResponse<unknown>>(
      `/email/pending-discoveries/${pendingId}/confirm`,
      { emailAddresses }
    );
    return confirmPendingDiscoverySchema.parse(response.data.data);
  },

  async cancelPendingDiscovery(pendingId: string): Promise<void> {
    await api.delete(`/email/pending-discoveries/${pendingId}`);
  },

  async listBatchSyncStatus(accountIds: string[]): Promise<BatchSyncStatus[]> {
    if (accountIds.length === 0) return [];
    const response = await api.get<ApiResponse<unknown>>(
      '/email/accounts/sync-status/batch',
      { params: { ids: accountIds.join(',') } }
    );
    return batchSyncStatusSchema.array().parse(response.data.data ?? []);
  },
};
