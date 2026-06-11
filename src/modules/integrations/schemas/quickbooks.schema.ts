import z from 'zod';

export const quickBooksConnectionSchema = z.object({
  id: z.string(),
  realmId: z.string(),
  companyName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  status: z.enum(['CONNECTED', 'DISCONNECTED']),
  scope: z.string(),
  connectedById: z.string().nullable(),
  accessTokenExpiresAt: z.string(),
  refreshTokenExpiresAt: z.string().nullable(),
  tokenHealth: z.enum(['healthy', 'expiring', 'expired', 'unknown']),
  disconnectedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const quickBooksStatusSchema = z.object({
  configured: z.boolean(),
  missingConfig: z.array(z.string()),
  environment: z.enum(['sandbox', 'production']),
  redirectUri: z.string().nullable(),
  apiBaseUrl: z.string(),
  minorVersion: z.string(),
  connection: quickBooksConnectionSchema.nullable(),
});

export const quickBooksAuthorizationSchema = z.object({
  authorizationUrl: z.string().url(),
  scope: z.string(),
  environment: z.enum(['sandbox', 'production']),
  expiresAt: z.string(),
});

export const quickBooksDisconnectSchema = z.object({
  disconnected: z.boolean(),
});

const quickBooksReferenceSyncStatusEnum = z.enum(['SUCCESS', 'FAILED', 'PARTIAL']);
const quickBooksReferenceEntityEnum = z.enum(['BANK_ACCOUNT', 'LINE_ITEM_CATEGORY', 'PAYEE']);
const quickBooksReferenceSyncCountsSchema = z.object({
  totalReceived: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  deletedCount: z.number(),
});

export const quickBooksReferenceEntityStatusSchema = quickBooksReferenceSyncCountsSchema.extend({
  entity: quickBooksReferenceEntityEnum,
  lastFullSyncedAt: z.string().nullable(),
  lastCdcSyncedAt: z.string().nullable(),
  cdcWatermark: z.string().nullable(),
  lastSyncStatus: quickBooksReferenceSyncStatusEnum.nullable(),
  lastSyncError: z.string().nullable(),
});

export const quickBooksReferenceSyncStatusSchema = z.object({
  provider: z.literal('quickbooks'),
  connected: z.boolean(),
  autoDailySyncEnabled: z.boolean(),
  lastSyncedAt: z.string().nullable(),
  lastSyncStatus: quickBooksReferenceSyncStatusEnum.nullable(),
  lastSyncError: z.string().nullable(),
  totals: quickBooksReferenceSyncCountsSchema,
  entities: z.array(quickBooksReferenceEntityStatusSchema),
});

export const quickBooksReferenceEntityResultSchema = quickBooksReferenceSyncCountsSchema.extend({
  entity: quickBooksReferenceEntityEnum,
  mode: z.enum(['FULL', 'CDC']),
  status: quickBooksReferenceSyncStatusEnum,
  syncedAt: z.string().nullable(),
  error: z.string().nullable(),
});

export const quickBooksReferenceSyncResultSchema = quickBooksReferenceSyncCountsSchema.extend({
  provider: z.literal('quickbooks'),
  trigger: z.enum(['MANUAL', 'SCHEDULED']),
  startedAt: z.string(),
  finishedAt: z.string(),
  status: quickBooksReferenceSyncStatusEnum,
  entities: z.array(quickBooksReferenceEntityResultSchema),
});

export const quickBooksReferenceAutoDailySyncSchema = z.object({
  autoDailySyncEnabled: z.boolean(),
});

export type QuickBooksStatus = z.infer<typeof quickBooksStatusSchema>;
export type QuickBooksConnection = z.infer<typeof quickBooksConnectionSchema>;
export type QuickBooksAuthorization = z.infer<typeof quickBooksAuthorizationSchema>;
export type QuickBooksDisconnect = z.infer<typeof quickBooksDisconnectSchema>;
export type QuickBooksReferenceSyncStatus = z.infer<typeof quickBooksReferenceSyncStatusSchema>;
export type QuickBooksReferenceSyncResult = z.infer<typeof quickBooksReferenceSyncResultSchema>;
export type QuickBooksReferenceAutoDailySync = z.infer<
  typeof quickBooksReferenceAutoDailySyncSchema
>;
