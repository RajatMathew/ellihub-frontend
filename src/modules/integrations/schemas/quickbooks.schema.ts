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
  lastSyncedAt: z.string().nullable(),
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

export const quickBooksTransactionEntitySchema = z.enum([
  'Invoice',
  'Bill',
  'Payment',
  'BillPayment',
  'Purchase',
  'PurchaseOrder',
  'SalesReceipt',
  'CreditMemo',
  'RefundReceipt',
  'VendorCredit',
  'JournalEntry',
  'Deposit',
  'Transfer',
]);

export const quickBooksTransactionSchema = z.object({
  entity: quickBooksTransactionEntitySchema,
  id: z.string(),
  docNumber: z.string().nullable(),
  txnDate: z.string().nullable(),
  displayName: z.string(),
  totalAmount: z.number().nullable(),
  currency: z.string().nullable(),
  privateNote: z.string().nullable(),
  lastUpdatedTime: z.string().nullable(),
  raw: z.record(z.string(), z.unknown()),
});

export const quickBooksTransactionsSchema = z.object({
  realmId: z.string(),
  companyName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  fetchedAt: z.string(),
  entities: z.array(quickBooksTransactionEntitySchema),
  transactions: z.array(quickBooksTransactionSchema),
});

export const quickBooksDisconnectSchema = z.object({
  disconnected: z.boolean(),
});

export type QuickBooksStatus = z.infer<typeof quickBooksStatusSchema>;
export type QuickBooksConnection = z.infer<typeof quickBooksConnectionSchema>;
export type QuickBooksAuthorization = z.infer<typeof quickBooksAuthorizationSchema>;
export type QuickBooksTransactionEntity = z.infer<typeof quickBooksTransactionEntitySchema>;
export type QuickBooksTransaction = z.infer<typeof quickBooksTransactionSchema>;
export type QuickBooksTransactions = z.infer<typeof quickBooksTransactionsSchema>;
export type QuickBooksDisconnect = z.infer<typeof quickBooksDisconnectSchema>;
