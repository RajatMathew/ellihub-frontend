import z from 'zod';

export const paymentConflictStatusSchema = z.enum(['ACTIVE', 'RESOLVED']);
export const paymentConflictSeveritySchema = z.enum(['HIGH', 'MEDIUM']);
export const paymentConflictLineComparisonKindSchema = z.enum(['CATEGORY_DETAILS', 'ITEM_DETAILS']);
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
  // A payment loaded from a migration workbook: never tracked, so it never
  // appears in a conflict, but the status is part of the API's vocabulary.
  'NOT_TRACKED',
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
  'CHECK_NUMBER',
  'TRANSACTION_MISSING',
]);

export const paymentComparableLineSchema = z.object({
  lineId: z.string().nullable(),
  amount: z.string(),
  categoryAccountId: z.string().nullable(),
});

export const paymentLineDetailSchema = z.object({
  lineId: z.string().nullable(),
  detailType: z.string().nullable(),
  amount: z.string(),
  categoryAccountId: z.string().nullable(),
  categoryAccountName: z.string().nullable(),
  itemId: z.string().nullable(),
  itemName: z.string().nullable(),
  quantity: z.string().nullable().default(null),
  unitPrice: z.string().nullable().default(null),
  description: z.string().nullable(),
  billableStatus: z.string().nullable(),
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
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
  checkNumber: z.string().nullable().default(null),
  currencyCode: z.string().nullable(),
  exchangeRate: z.string().nullable(),
  totalAmount: z.string(),
  lines: z.array(paymentComparableLineSchema),
  lineDetails: z.array(paymentLineDetailSchema).default([]),
  unsupportedReasons: z.array(z.string()),
});

export const paymentConflictDiffSchema = z.object({
  field: paymentConflictFieldSchema,
  fieldKey: z.string().min(1),
  path: z.string(),
  label: z.string(),
  severity: paymentConflictSeveritySchema,
  elliValue: z.unknown().nullable(),
  quickBooksValue: z.unknown().nullable(),
  lineId: z.string().nullable().optional(),
});

export const paymentConflictItemSchema = z.object({
  id: z.string(),
  diffKey: z.string(),
  field: paymentConflictFieldSchema,
  fieldKey: z.string().min(1),
  path: z.string(),
  lineId: z.string().nullable(),
  label: z.string(),
  status: paymentConflictStatusSchema,
  priority: paymentConflictSeveritySchema,
  elliValue: z.unknown().nullable(),
  quickBooksValue: z.unknown().nullable(),
  firstDetectedAt: z.string(),
  lastDetectedAt: z.string(),
  quickBooksChangedAt: z.string().nullable().default(null),
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
  version: z.number().int().positive(),
  canAcceptQuickBooks: z.boolean(),
  acceptBlockedReasons: z.array(z.string()),
  lineComparisonKind: paymentConflictLineComparisonKindSchema.nullable().default(null),
});

const purchaseOrderConflictSubjectSchema = z.object({
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
});

const poPaymentConflictSubjectPaymentSchema = z.object({
  id: z.string(),
  amount: z.string(),
  checkNumber: z.string().nullable(),
  txnDate: z.string(),
  transactionId: z.string(),
  transactionUrl: z.string(),
  trackingStatus: paymentTrackingStatusSchema,
});

export const paymentConflictSubjectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PO_PAYMENT'),
    purchaseOrder: purchaseOrderConflictSubjectSchema,
    payment: poPaymentConflictSubjectPaymentSchema,
  }),
]);

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
  subject: paymentConflictSubjectSchema,
  purchaseOrder: purchaseOrderConflictSubjectSchema,
  payment: poPaymentConflictSubjectPaymentSchema,
  baseline: paymentComparableSchema,
  latestQuickBooks: paymentComparableSchema.nullable(),
  items: z.array(paymentConflictItemSchema),
  diffs: z.array(paymentConflictDiffSchema),
  referenceLabels: z.record(z.string(), z.string()),
});

const paymentConflictConnectionSchema = z.object({
  id: z.string(),
  companyName: z.string().nullable(),
  realmId: z.string(),
  status: z.literal('CONNECTED'),
});

export const paymentConflictListResponseSchema = z.object({
  data: z.array(paymentConflictSchema),
  count: z.number(),
  page: z.number(),
  size: z.number(),
  counts: z.object({
    active: z.number(),
    resolved: z.number(),
    activePayments: z.number(),
    resolvedPayments: z.number(),
  }),
  connection: paymentConflictConnectionSchema.nullable(),
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

export const paymentConflictSyncRunStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'SUCCESS',
  'PARTIAL',
  'FAILED',
  'INTERRUPTED',
]);

export const paymentConflictSyncRunSchema = z.object({
  id: z.string(),
  trigger: z.enum(['MANUAL', 'SCHEDULED']),
  status: paymentConflictSyncRunStatusSchema,
  phase: z.string().nullable(),
  queuedAt: z.string(),
  startedAt: z.string().nullable(),
  heartbeatAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  progress: z.object({
    completed: z.number(),
    total: z.number().nullable(),
  }),
  counts: z.object({
    totalReceived: z.number(),
    conflictCount: z.number(),
    resolvedCount: z.number(),
    missingCount: z.number(),
    failedCount: z.number(),
  }),
  performedFullReconciliation: z.boolean().nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
      retryAt: z.string().nullable(),
    })
    .nullable(),
});

export const paymentConflictSyncStatusResponseSchema = z.object({
  connection: paymentConflictConnectionSchema.nullable(),
  run: paymentConflictSyncRunSchema.nullable(),
  isActive: z.boolean(),
  lastCompletedAt: z.string().nullable(),
  lastSuccessfulAt: z.string().nullable(),
  pollAfterMs: z.number(),
});

export const paymentConflictSyncStartResultSchema = z.object({
  alreadyRunning: z.boolean(),
  pollAfterMs: z.number(),
  run: paymentConflictSyncRunSchema,
});

export const acceptQuickBooksPaymentResultSchema = z.object({
  accepted: z.boolean(),
  alreadyResolved: z.boolean(),
  blockedReasons: z.array(z.string()).optional(),
  acceptedItemIds: z.array(z.string()),
  conflict: paymentConflictSchema,
});

export type PaymentConflictStatus = z.infer<typeof paymentConflictStatusSchema>;
export type PaymentConflictSeverity = z.infer<typeof paymentConflictSeveritySchema>;
export type PaymentLineDetail = z.infer<typeof paymentLineDetailSchema>;
export type PaymentConflictDiff = z.infer<typeof paymentConflictDiffSchema>;
export type PaymentConflict = z.infer<typeof paymentConflictSchema>;
export type PaymentConflictItem = z.infer<typeof paymentConflictItemSchema>;
export type PaymentConflictListResponse = z.infer<typeof paymentConflictListResponseSchema>;
export type PaymentConflictSyncRun = z.infer<typeof paymentConflictSyncRunSchema>;
export type PaymentConflictSyncStatusResponse = z.infer<
  typeof paymentConflictSyncStatusResponseSchema
>;
export type PaymentConflictSyncStartResult = z.infer<typeof paymentConflictSyncStartResultSchema>;
export type AcceptQuickBooksPaymentResult = z.infer<typeof acceptQuickBooksPaymentResultSchema>;
