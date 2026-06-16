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

export const quickBooksBankAccountSchema = z.object({
  id: z.string(),
  realmId: z.string(),
  qbId: z.string(),
  name: z.string(),
  fullyQualifiedName: z.string().nullable(),
  accountSubType: z.string().nullable(),
  currencyCode: z.string().nullable(),
  active: z.boolean(),
  deletedAt: z.string().nullable(),
});

export const quickBooksLineItemCategorySchema = z.object({
  id: z.string(),
  realmId: z.string(),
  qbId: z.string(),
  name: z.string(),
  fullyQualifiedName: z.string().nullable(),
  accountType: z.string().nullable(),
  accountSubType: z.string().nullable(),
  currencyCode: z.string().nullable(),
  active: z.boolean(),
  deletedAt: z.string().nullable(),
});

export const quickBooksPayeeSchema = z.object({
  id: z.string(),
  realmId: z.string(),
  qbId: z.string(),
  displayName: z.string(),
  companyName: z.string().nullable(),
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  active: z.boolean().nullable(),
  deletedAt: z.string().nullable(),
});

export const quickBooksBankAccountsSchema = z.array(quickBooksBankAccountSchema);
export const quickBooksLineItemCategoriesSchema = z.array(quickBooksLineItemCategorySchema);
export const quickBooksPayeesSchema = z.array(quickBooksPayeeSchema);

export const quickBooksPayeePaginatedResponseSchema = z.object({
  data: z.array(quickBooksPayeeSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export const quickBooksVendorMappingSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  realmId: z.string(),
  quickBooksPayeeId: z.string(),
  qbVendorId: z.string(),
  displayName: z.string(),
  companyName: z.string().nullable(),
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
});

export const quickBooksCreateVendorPayloadSchema = z.object({
  displayName: z.string().trim().min(1),
  companyName: z.string().trim().optional().nullable(),
  primaryEmail: z.string().trim().email().optional().nullable(),
  primaryPhone: z.string().trim().optional().nullable(),
  vendorId: z.string().optional(),
  saveMapping: z.boolean().optional(),
});

export const quickBooksCreateVendorResultSchema = z.object({
  vendor: quickBooksPayeeSchema,
  mapping: quickBooksVendorMappingSchema.nullable(),
});

export const quickBooksMapVendorPayloadSchema = z.object({
  vendorId: z.string(),
  qbVendorId: z.string(),
});

export const quickBooksUnmapVendorResultSchema = z.object({
  unmapped: z.boolean(),
});

export type QuickBooksBankAccount = z.infer<typeof quickBooksBankAccountSchema>;
export type QuickBooksLineItemCategory = z.infer<typeof quickBooksLineItemCategorySchema>;
export type QuickBooksPayee = z.infer<typeof quickBooksPayeeSchema>;
export type QuickBooksPayeePaginatedResponse = z.infer<
  typeof quickBooksPayeePaginatedResponseSchema
>;
export type QuickBooksVendorMapping = z.infer<typeof quickBooksVendorMappingSchema>;
export type QuickBooksCreateVendorPayload = z.infer<typeof quickBooksCreateVendorPayloadSchema>;
export type QuickBooksCreateVendorResult = z.infer<typeof quickBooksCreateVendorResultSchema>;
export type QuickBooksMapVendorPayload = z.infer<typeof quickBooksMapVendorPayloadSchema>;
export type QuickBooksUnmapVendorResult = z.infer<typeof quickBooksUnmapVendorResultSchema>;

export type QuickBooksStatus = z.infer<typeof quickBooksStatusSchema>;
export type QuickBooksConnection = z.infer<typeof quickBooksConnectionSchema>;
export type QuickBooksAuthorization = z.infer<typeof quickBooksAuthorizationSchema>;
export type QuickBooksDisconnect = z.infer<typeof quickBooksDisconnectSchema>;
export type QuickBooksReferenceSyncStatus = z.infer<typeof quickBooksReferenceSyncStatusSchema>;
export type QuickBooksReferenceSyncResult = z.infer<typeof quickBooksReferenceSyncResultSchema>;
export type QuickBooksReferenceAutoDailySync = z.infer<
  typeof quickBooksReferenceAutoDailySyncSchema
>;
