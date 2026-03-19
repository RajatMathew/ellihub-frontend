import { z } from 'zod';

/* ---- Shared / lookup schemas ---- */

export const pcoStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    color: z.string(),
    order: z.number(),
  })
  .passthrough();

export type PCOStatus = z.infer<typeof pcoStatusSchema>;

export const pcoChangeTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    color: z.string(),
    description: z.string().nullable().optional(),
    order: z.number().optional(),
  })
  .passthrough();

export type PCOChangeType = z.infer<typeof pcoChangeTypeSchema>;

/* ---- Line item (from detail / create response) ---- */

export const PCO_LINE_ITEM_CATEGORIES = ['MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER'] as const;
export type PCOLineItemCategory = (typeof PCO_LINE_ITEM_CATEGORIES)[number];

export const pcoLineItemSchema = z
  .object({
    id: z.string(),
    primeCoId: z.string().optional(),
    sequenceNumber: z.number().optional(),
    title: z.string(),
    description: z.string(),
    qty: z.coerce.number(),
    unit: z.string(),
    unitPrice: z.coerce.number(),
    amount: z.coerce.number(),
    category: z.enum(PCO_LINE_ITEM_CATEGORIES).optional().default('MATERIALS'),
    costCodeId: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type PCOLineItem = z.infer<typeof pcoLineItemSchema>;

/* ---- List item (from GET /pcos) ---- */

export const pcoListItemSchema = z
  .object({
    id: z.string(),
    pcoNumber: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    title: z.string(),
    amount: z.coerce.number(),
    status: pcoStatusSchema.nullable().optional(),
    priority: z.string().nullable().optional(),
    impactsSchedule: z.boolean().nullable().optional(),
    changeType: pcoChangeTypeSchema.nullable().optional(),
    project: z
      .object({ id: z.string(), name: z.string(), jobNumber: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    createdBy: z.string().nullable().optional(),
    creator: z
      .object({ id: z.string(), name: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    _count: z.record(z.string(), z.number()).nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type PCOListItem = z.infer<typeof pcoListItemSchema>;

/* ---- Detail (from GET /pcos/:id, POST /pcos, PUT /pcos/:id) ---- */

export const pcoDetailSchema = z
  .object({
    id: z.string(),
    projectId: z.string().optional(),
    pcoNumber: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    amount: z.coerce.number(),
    markupAmount: z.coerce.number().nullable().optional(),
    scheduleImpactDays: z.number().nullable().optional(),
    requestedBy: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    impactsSchedule: z.boolean().nullable().optional(),
    estimatedCost: z.coerce.number().nullable().optional(),
    estimatedMargin: z.coerce.number().nullable().optional(),
    estimatedMarginPercent: z.coerce.number().nullable().optional(),
    revisionNumber: z.number().optional(),
    status: pcoStatusSchema.nullable().optional(),
    statusId: z.string().optional(),
    changeType: pcoChangeTypeSchema.nullable().optional(),
    changeTypeId: z.string().nullable().optional(),
    contact: z
      .object({ id: z.string(), fullName: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    contactId: z.string().nullable().optional(),
    costCode: z
      .object({ id: z.string(), name: z.string(), code: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    costCodeId: z.string().nullable().optional(),
    project: z
      .object({ id: z.string(), name: z.string(), jobNumber: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    createdBy: z.string().nullable().optional(),
    creator: z
      .object({ id: z.string(), name: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    rejectedBy: z.string().nullable().optional(),
    rejectedAt: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    voidedBy: z.string().nullable().optional(),
    voidedAt: z.string().nullable().optional(),
    voidReason: z.string().nullable().optional(),
    supersededBy: z.string().nullable().optional(),
    supersededByOrder: z
      .object({ id: z.string(), pcoNumber: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    lineItems: z.array(pcoLineItemSchema).optional().default([]),
    attachments: z.array(z.any()).optional().default([]),
    statusHistory: z.array(z.any()).optional().default([]),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type PCODetail = z.infer<typeof pcoDetailSchema>;

/* ---- Paginated list response ---- */

export const pcoPaginatedResponseSchema = z.object({
  data: z.array(pcoListItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type PCOPaginatedResponse = z.infer<typeof pcoPaginatedResponseSchema>;

/* ---- Pipeline ---- */

export const pipelineBucketSchema = z.object({
  count: z.number().default(0),
  totalAmount: z.coerce.number().default(0),
});

export type PipelineBucket = z.infer<typeof pipelineBucketSchema>;

export const pcoPipelineSchema = z
  .object({
    draft: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
    pending_review: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
    approved: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
    sent_to_gc: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
    penciled: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
    executed: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
    rejected: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
    void: pipelineBucketSchema.optional().default({ count: 0, totalAmount: 0 }),
  })
  .passthrough();

export type PCOPipeline = z.infer<typeof pcoPipelineSchema>;

/* ---- List query params ---- */

export const listPCOParamsSchema = z.object({
  projectId: z.string(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  changeTypeId: z.string().optional(),
  priority: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type ListPCOParams = z.infer<typeof listPCOParamsSchema>;

/* ---- Input schemas ---- */

export const pcoLineItemInputSchema = z.object({
  _originalId: z.string().optional(),
  title: z.string().optional().default(''),
  description: z.string().min(1, 'Item description is required'),
  qty: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number(),
  category: z.enum(PCO_LINE_ITEM_CATEGORIES).optional().default('MATERIALS'),
  costCodeId: z.string().optional(),
});

export type PCOLineItemInput = z.infer<typeof pcoLineItemInputSchema>;

export const createPCOInputSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.string().min(1, 'Date is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  amount: z.number(),
  markupAmount: z.number().optional(),
  scheduleImpactDays: z.number().optional(),
  requestedBy: z.string().optional(),
  contactId: z.string().optional(),
  changeTypeId: z.string().optional(),
  priority: z.string().optional(),
  impactsSchedule: z.boolean().optional(),
  estimatedCost: z.number().optional(),
  costCodeId: z.string().optional(),
  lineItems: z.array(pcoLineItemInputSchema).min(1, 'At least one line item is required'),
});

export type CreatePCOInput = z.infer<typeof createPCOInputSchema>;

export const updatePCOInputSchema = z.object({
  date: z.string().optional(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  markupAmount: z.number().nullable().optional(),
  scheduleImpactDays: z.number().nullable().optional(),
  requestedBy: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  changeTypeId: z.string().nullable().optional(),
  priority: z.string().optional(),
  impactsSchedule: z.boolean().optional(),
  estimatedCost: z.number().nullable().optional(),
  costCodeId: z.string().nullable().optional(),
});

export type UpdatePCOInput = z.infer<typeof updatePCOInputSchema>;

export const pcoRejectInputSchema = z.object({
  reason: z.string().min(20, 'Reason must be at least 20 characters'),
});

export type PCORejectInput = z.infer<typeof pcoRejectInputSchema>;

export const pcoVoidInputSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export type PCOVoidInput = z.infer<typeof pcoVoidInputSchema>;

/* ---- Approve response ---- */

export const pcoApproveResponseSchema = z.object({
  pco: pcoDetailSchema,
  financialImpact: z
    .object({
      originalContractValue: z.coerce.number(),
      approvedPCOTotal: z.coerce.number(),
      thisAmount: z.coerce.number(),
      revisedContractValue: z.coerce.number(),
      budgetLimit: z.coerce.number(),
    })
    .passthrough(),
});

export type PCOApproveResponse = z.infer<typeof pcoApproveResponseSchema>;

/* ---- Financial impact (from GET /pcos/:id/financial-impact) ---- */

export const pcoFinancialImpactSchema = z
  .object({
    current: z.object({
      originalContractValue: z.coerce.number(),
      approvedPCOTotal: z.coerce.number(),
      revisedContractValue: z.coerce.number(),
      budgetLimit: z.coerce.number(),
    }),
    afterApproval: z.object({
      approvedPCOTotal: z.coerce.number(),
      revisedContractValue: z.coerce.number(),
      budgetLimit: z.coerce.number(),
      percentChangeFromOriginal: z.coerce.number(),
    }),
    thisPCO: z.object({
      amount: z.coerce.number(),
      percentOfOriginalContract: z.coerce.number(),
    }),
  })
  .passthrough();

export type PCOFinancialImpact = z.infer<typeof pcoFinancialImpactSchema>;
