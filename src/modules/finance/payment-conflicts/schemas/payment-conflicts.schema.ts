import z from 'zod';

export const paymentConflictStatusSchema = z.enum(['ACTIVE', 'RESOLVED']);
export const paymentConflictSeveritySchema = z.enum(['HIGH', 'MEDIUM']);
export const paymentConflictDetectionSourceSchema = z.enum([
  'CDC',
  'FULL_RECONCILIATION',
  'DIRECT_RECHECK',
  'ACCEPT_PREFLIGHT',
]);
export const paymentConflictResolutionActionSchema = z.enum([
  'ACCEPTED_QUICKBOOKS',
  'AUTO_MATCHED_ELLI',
  'RECHECK_MATCHED_ELLI',
]);
export const paymentTrackingStatusSchema = z.enum([
  'TRACKED',
  'CONFLICT',
  'MISSING',
  'LEGACY_UNTRACKED',
]);
export const paymentConflictFieldSchema = z.enum([
  'VENDOR',
  'BANK_ACCOUNT',
  'PAYMENT_DATE',
  'CATEGORY',
  'LINE_AMOUNT',
  'TOTAL_AMOUNT',
  'LINE_STRUCTURE',
  'PAYMENT_TYPE',
  'CURRENCY',
  'TRANSACTION_MISSING',
]);

export const paymentComparableLineSchema = z.object({
  lineId: z.string().nullable(),
  amount: z.string(),
  categoryAccountId: z.string().nullable(),
});

export const paymentComparableSchema = z.object({
  entity: z.literal('Purchase'),
  realmId: z.string(),
  quickBooksTransactionId: z.string(),
  syncToken: z.string().nullable(),
  paymentType: z.string().nullable(),
  vendorId: z.string().nullable(),
  bankAccountId: z.string().nullable(),
  paymentDate: z.string().nullable(),
  currencyCode: z.string().nullable(),
  exchangeRate: z.string().nullable(),
  totalAmount: z.string(),
  lines: z.array(paymentComparableLineSchema),
  unsupportedReasons: z.array(z.string()),
});

export const paymentConflictDiffSchema = z.object({
  field: paymentConflictFieldSchema,
  path: z.string(),
  label: z.string(),
  severity: paymentConflictSeveritySchema,
  elliValue: z.unknown().nullable(),
  quickBooksValue: z.unknown().nullable(),
  lineId: z.string().nullable().optional(),
});

export const paymentConflictSchema = z.object({
  id: z.string(),
  status: paymentConflictStatusSchema,
  severity: paymentConflictSeveritySchema,
  detectionSource: paymentConflictDetectionSourceSchema,
  firstDetectedAt: z.string(),
  lastDetectedAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionAction: paymentConflictResolutionActionSchema.nullable(),
  resolutionNote: z.string().nullable(),
  resolvedBy: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .nullable(),
  canAcceptQuickBooks: z.boolean(),
  acceptBlockedReasons: z.array(z.string()),
  purchaseOrder: z.object({
    id: z.string(),
    poNumber: z.string(),
    project: z.object({
      id: z.string(),
      name: z.string(),
      jobNumber: z.string().nullable(),
    }),
    vendor: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  payment: z.object({
    id: z.string(),
    amount: z.string(),
    txnDate: z.string(),
    transactionId: z.string(),
    transactionUrl: z.string(),
    trackingStatus: paymentTrackingStatusSchema,
  }),
  baseline: paymentComparableSchema,
  latestQuickBooks: paymentComparableSchema.nullable(),
  diffs: z.array(paymentConflictDiffSchema),
  referenceLabels: z.record(z.string(), z.string()),
});

export const paymentConflictListResponseSchema = z.object({
  data: z.array(paymentConflictSchema),
  count: z.number(),
  page: z.number(),
  size: z.number(),
  counts: z.object({
    active: z.number(),
    resolved: z.number(),
  }),
  connection: z
    .object({
      id: z.string(),
      companyName: z.string().nullable(),
      realmId: z.string(),
      status: z.literal('CONNECTED'),
    })
    .nullable(),
  sync: z
    .object({
      status: z.enum(['SUCCESS', 'FAILED', 'PARTIAL']).nullable(),
      error: z.string().nullable(),
      lastStartedAt: z.string().nullable(),
      lastCompletedAt: z.string().nullable(),
      lastFullReconciledAt: z.string().nullable(),
    })
    .nullable(),
});

export const paymentConflictSyncResultSchema = z.object({
  trigger: z.enum(['MANUAL', 'SCHEDULED']),
  status: z.literal('SUCCESS'),
  startedAt: z.string(),
  finishedAt: z.string(),
  performedFullReconciliation: z.boolean(),
  totalReceived: z.number(),
  conflictCount: z.number(),
  resolvedCount: z.number(),
  missingCount: z.number(),
});

export const acceptQuickBooksPaymentResultSchema = z.object({
  accepted: z.boolean(),
  alreadyResolved: z.boolean(),
  blockedReasons: z.array(z.string()).optional(),
  conflict: paymentConflictSchema,
});

export type PaymentConflictStatus = z.infer<typeof paymentConflictStatusSchema>;
export type PaymentConflictSeverity = z.infer<typeof paymentConflictSeveritySchema>;
export type PaymentConflictDiff = z.infer<typeof paymentConflictDiffSchema>;
export type PaymentConflict = z.infer<typeof paymentConflictSchema>;
export type PaymentConflictListResponse = z.infer<typeof paymentConflictListResponseSchema>;
export type PaymentConflictSyncResult = z.infer<typeof paymentConflictSyncResultSchema>;
export type AcceptQuickBooksPaymentResult = z.infer<typeof acceptQuickBooksPaymentResultSchema>;
