import { z } from 'zod';

// --- Status ---

export const scoStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    color: z.string(),
    order: z.number().optional(),
  })
  .passthrough();

export type SCOStatus = z.infer<typeof scoStatusSchema>;

// --- List item ---

export const scoListItemSchema = z
  .object({
    id: z.string(),
    scoNumber: z.string(),
    title: z.string(),
    amount: z.coerce.number(),
    status: scoStatusSchema,
    date: z.string().nullable().optional(),
    initiatedBy: z.string(),
    priority: z.string(),
    purchaseOrder: z
      .object({ id: z.string(), poNumber: z.string().nullable().optional() })
      .passthrough(),
    vendor: z.object({ id: z.string(), name: z.string() }).passthrough(),
    changeType: z
      .object({
        id: z.string(),
        name: z.string(),
        code: z.string(),
        color: z.string(),
      })
      .passthrough()
      .nullable()
      .optional(),
    _count: z.object({ lineItems: z.number() }).optional(),
    project: z
      .object({
        id: z.string(),
        name: z.string(),
        jobNumber: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    createdAt: z.string(),
  })
  .passthrough();

export type SCOListItem = z.infer<typeof scoListItemSchema>;

// --- Paginated response ---

export const scoPaginatedResponseSchema = z.object({
  data: z.array(scoListItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type SCOPaginatedResponse = z.infer<typeof scoPaginatedResponseSchema>;

// --- List params ---

export const listSCOsParamsSchema = z.object({
  projectId: z.string().optional(),
  poId: z.string().optional(),
  status: z.string().optional(),
  vendorId: z.string().optional(),
  initiatedBy: z.string().optional(),
  changeType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListSCOsParams = z.infer<typeof listSCOsParamsSchema>;

// --- Summary ---

const statusBucket = z.object({
  count: z.number(),
  totalAmount: z.number(),
});

export const scoSummarySchema = z.object({
  totalCount: z.number(),
  totalApprovedAmount: z.number(),
  totalPendingAmount: z.number(),
  byStatus: z.object({
    draft: statusBucket,
    approved: statusBucket,
    rejected: statusBucket,
    void: statusBucket,
  }),
  byInitiatedBy: z.object({
    vendor: statusBucket,
    firm: statusBucket,
  }),
  byCostCategory: z
    .object({
      materials: z.number(),
      labor: z.number(),
      equipment: z.number(),
      subcontractor: z.number(),
      other: z.number(),
    })
    .optional(),
  netMarginImpact: z.number(),
});

export type SCOSummary = z.infer<typeof scoSummarySchema>;

// --- Change type ---

export const scoChangeTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    color: z.string(),
    order: z.number(),
    description: z.string().nullable().optional(),
  })
  .passthrough();

export type SCOChangeType = z.infer<typeof scoChangeTypeSchema>;

// --- Line item input (for create/edit form) ---

export const scoLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty: z.number().min(0, 'Qty must be >= 0'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number(),
  costCategory: z.string().optional(),
  costCodeId: z.string().optional(),
  poLineItemId: z.string().optional(),
  notes: z.string().optional(),
});

export type SCOLineItemInput = z.infer<typeof scoLineItemInputSchema>;

// --- Create SCO input ---

export const createSCOInputSchema = z.object({
  purchaseOrderId: z.string().min(1, 'Purchase Order is required'),
  title: z.string().min(1, 'Title is required').max(255),
  amount: z.number(),
  markupAmount: z.number().optional(),
  initiatedBy: z.enum(['VENDOR', 'FIRM'], { required_error: 'Initiated By is required' }),
  date: z.string().optional(),
  reasonForChange: z.string().optional(),
  detailedScope: z.string().optional(),
  scheduleImpactDays: z.number().int().optional(),
  changeType: z.string().optional(),
  priority: z.string().optional(),
  vendorContactName: z.string().max(255).optional(),
  vendorContactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  vendorReferenceNumber: z.string().max(100).optional(),
  linkedPCOId: z.string().optional(),
  rfqId: z.string().optional(),
  costCodeId: z.string().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  retainagePercent: z.number().min(0).max(100).optional(),
  paymentTerms: z.string().optional(),
  lineItems: z.array(scoLineItemInputSchema).min(1, 'At least one line item is required'),
});

export type CreateSCOInput = z.infer<typeof createSCOInputSchema>;

// --- Update SCO input ---

export const updateSCOInputSchema = createSCOInputSchema
  .omit({ purchaseOrderId: true, lineItems: true })
  .partial();

export type UpdateSCOInput = z.infer<typeof updateSCOInputSchema>;

// --- SCO line item (from detail response) ---

export const scoLineItemSchema = z
  .object({
    id: z.string(),
    lineNumber: z.number().optional(),
    description: z.string(),
    unit: z.string(),
    quantity: z.coerce.number(),
    unitPrice: z.coerce.number(),
    amount: z.coerce.number(),
    costCategory: z.string().nullable().optional(),
    costCodeId: z.string().nullable().optional(),
    poLineItemId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough();

export type SCOLineItem = z.infer<typeof scoLineItemSchema>;

// --- SCO detail (GET /scos/:id response) ---

export const scoDetailSchema = z
  .object({
    id: z.string(),
    scoNumber: z.string(),
    title: z.string(),
    date: z.string().nullable().optional(),
    amount: z.coerce.number(),
    status: scoStatusSchema.nullable().optional(),
    statusId: z.string().optional(),
    initiatedBy: z.string(),
    priority: z.string(),
    reasonForChange: z.string().nullable().optional(),
    detailedScope: z.string().nullable().optional(),
    scheduleImpactDays: z.number().nullable().optional(),
    vendorContactName: z.string().nullable().optional(),
    vendorContactEmail: z.string().nullable().optional(),
    vendorReferenceNumber: z.string().nullable().optional(),
    closeoutJustification: z.string().nullable().optional(),
    purchaseOrder: z
      .object({ id: z.string(), poNumber: z.string().nullable().optional() })
      .passthrough(),
    vendor: z.object({ id: z.string(), name: z.string() }).passthrough(),
    project: z
      .object({
        id: z.string(),
        name: z.string(),
        jobNumber: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    changeType: z
      .object({ id: z.string(), name: z.string(), code: z.string(), color: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    costCode: z
      .object({ id: z.string(), code: z.string(), name: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    linkedPCO: z
      .object({ id: z.string(), pcoNumber: z.string(), title: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    rfq: z
      .object({ id: z.string(), rfqNumber: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    createdBy: z.string().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    rejectedBy: z.string().nullable().optional(),
    rejectedAt: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    voidedBy: z.string().nullable().optional(),
    voidedAt: z.string().nullable().optional(),
    voidReason: z.string().nullable().optional(),
    taxPercent: z.coerce.number().optional(),
    retainagePercent: z.coerce.number().optional(),
    paymentTerms: z.string().optional(),
    lineItems: z.array(scoLineItemSchema).optional().default([]),
    attachments: z.array(z.object({ id: z.string(), documentId: z.string() }).passthrough()).optional().default([]),
    statusHistory: z
      .array(
        z.object({
          id: z.string(),
          fromStatus: z.string().nullable().optional(),
          toStatus: z.string(),
          changedBy: z.string(),
          changedAt: z.string(),
          reason: z.string().nullable().optional(),
        }).passthrough(),
      )
      .optional()
      .default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type SCODetail = z.infer<typeof scoDetailSchema>;
