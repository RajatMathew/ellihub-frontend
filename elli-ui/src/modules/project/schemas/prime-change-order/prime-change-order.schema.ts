import { z } from 'zod';

export const PRIME_CHANGE_ORDER_STATUSES = [
  'Draft',
  'Requested',
  'Pending Revision',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Void',
] as const;

export const SCHEDULE_IMPACT_OPTIONS = ['yes', 'no', 'maybe'] as const;

export const primeChangeOrderStatusSchema = z.enum(PRIME_CHANGE_ORDER_STATUSES);
export const scheduleImpactSchema = z.enum(SCHEDULE_IMPACT_OPTIONS);
export type PrimeChangeOrderStatus = z.infer<typeof primeChangeOrderStatusSchema>;

export const primeChangeOrderAssigneeSchema = z
  .object({
    fieldwireUserId: z.number(),
    displayName: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    company: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    userDeletedAt: z.string().nullable().optional(),
  })
  .passthrough();

export const primeChangeOrderSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    fieldwireId: z.string(),
    creatorUserId: z.number(),
    lastEditorUserId: z.number(),
    fieldwireProjectId: z.string(),
    fieldwireCreatedAt: z.string(),
    fieldwireUpdatedAt: z.string(),
    deviceCreatedAt: z.string(),
    deviceUpdatedAt: z.string(),
    fieldwireDeletedAt: z.string().nullable().optional(),
    referenceNumber: z.string().nullable().optional(),
    name: z.string(),
    dueDate: z.string().nullable().optional(),
    pmGroupNumber: z.number().nullable().optional(),
    totalCost: z.coerce.number().nullable().optional(),
    revisionId: z.string(),
    statusName: primeChangeOrderStatusSchema.or(z.string()),
    description: z.string().nullable().optional(),
    assigneeUserId: z.number().nullable().optional(),
    assignee: primeChangeOrderAssigneeSchema.nullable().optional(),
    externalAssigneeUserId: z.number().nullable().optional(),
    scheduleImpact: scheduleImpactSchema.or(z.string()).nullable().optional(),
    scheduleImpactDays: z.number().nullable().optional(),
    currentRevisionId: z.string(),
    reasonTypeId: z.string().nullable().optional(),
    lastSyncedAt: z.string(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type PrimeChangeOrder = z.infer<typeof primeChangeOrderSchema>;

export const primeChangeOrderPaginatedResponseSchema = z.object({
  data: z.array(primeChangeOrderSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type PrimeChangeOrderPaginatedResponse = z.infer<
  typeof primeChangeOrderPaginatedResponseSchema
>;

export const fieldwireSyncStatusSchema = z.enum(['SUCCESS', 'FAILED']);
export const primeChangeOrderSyncTriggerSchema = z.enum(['MANUAL', 'SCHEDULED']);

export const primeChangeOrderSyncStatusCountsSchema = z.object({
  lastSyncedAt: z.string().nullable(),
  lastSyncStatus: fieldwireSyncStatusSchema.nullable(),
  lastSyncError: z.string().nullable(),
  totalReceived: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  deletedCount: z.number(),
});

export const primeChangeOrderSyncRunSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    trigger: primeChangeOrderSyncTriggerSchema,
    status: fieldwireSyncStatusSchema,
    startedAt: z.string(),
    finishedAt: z.string().nullable().optional(),
    totalReceived: z.number(),
    createdCount: z.number(),
    updatedCount: z.number(),
    deletedCount: z.number(),
    error: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
  })
  .passthrough();

export const primeChangeOrderSyncStatusResponseSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  fieldwireProjectId: z.string().nullable(),
  syncStatus: primeChangeOrderSyncStatusCountsSchema,
  latestRun: primeChangeOrderSyncRunSchema.nullable().optional(),
});

export type PrimeChangeOrderSyncStatusResponse = z.infer<
  typeof primeChangeOrderSyncStatusResponseSchema
>;

export const primeChangeOrderFinancialSummarySchema = z.object({
  projectId: z.string(),
  originalContractValue: z.coerce.number(),
  approvedChangeOrdersCount: z.number(),
  approvedChangeOrdersTotal: z.coerce.number(),
  approvedChangeOrdersPositiveTotal: z.coerce.number(),
  approvedChangeOrdersNegativeTotal: z.coerce.number(),
  revisedContractValue: z.coerce.number(),
});

export type PrimeChangeOrderFinancialSummary = z.infer<
  typeof primeChangeOrderFinancialSummarySchema
>;

export const primeChangeOrderStatusSummaryItemSchema = z.object({
  statusName: primeChangeOrderStatusSchema,
  count: z.number(),
  totalCost: z.coerce.number(),
});

export const primeChangeOrderStatusSummarySchema = z.array(primeChangeOrderStatusSummaryItemSchema);

export type PrimeChangeOrderStatusSummaryItem = z.infer<
  typeof primeChangeOrderStatusSummaryItemSchema
>;

export const primeChangeOrderSyncSummarySchema = z.object({
  projectId: z.string(),
  fieldwireProjectId: z.string(),
  status: z.literal('SUCCESS'),
  syncedAt: z.string(),
  totalReceived: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  deletedCount: z.number(),
});

export const primeChangeOrderSyncResponseSchema = z.object({
  summary: primeChangeOrderSyncSummarySchema,
  data: z.array(primeChangeOrderSchema),
});

export type PrimeChangeOrderSyncResponse = z.infer<typeof primeChangeOrderSyncResponseSchema>;

export const listPrimeChangeOrderParamsSchema = z.object({
  projectId: z.string(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  statusName: z.string().optional(),
  scheduleImpact: z.string().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  totalCostMin: z.string().optional(),
  totalCostMax: z.string().optional(),
  includeDeleted: z.boolean().optional(),
});

export type ListPrimeChangeOrderParams = z.infer<typeof listPrimeChangeOrderParamsSchema>;
