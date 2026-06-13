import {
  sumRoundedLineAmountsDecimal,
  toCommercialDecimal,
} from '@/modules/project/lib/commercial-decimal';
import {
  moneySchema,
  percentSchema,
  quantitySchema,
  rateSchema,
} from '@/modules/project/lib/commercial-validation';
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

export const scoStatusNameSchema = z.enum(['DRAFT', 'APPROVED', 'REJECTED', 'VOID']);
export type SCOStatusName = z.infer<typeof scoStatusNameSchema>;

const scoProjectRefSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    jobNumber: z.string().nullable().optional(),
  })
  .passthrough();

const scoPurchaseOrderRefSchema = z
  .object({
    id: z.string(),
    poNumber: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    total: z.string().nullable().optional(),
    vendorId: z.string().nullable().optional(),
  })
  .passthrough();

const scoLookupRefSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
  })
  .passthrough();

const scoListLineItemSchema = z
  .object({
    id: z.string(),
    subCoId: z.string().nullable().optional(),
    sequenceNumber: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    qty: z.coerce.number().nullable().optional(),
    unitId: z.string().nullable().optional(),
    unit: scoLookupRefSchema.nullable().optional(),
    unitPrice: z.string().nullable().optional(),
    amount: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    category: scoLookupRefSchema.nullable().optional(),
    costCodeId: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deletedAt: z.string().nullable().optional(),
  })
  .passthrough();

const scoListAttachmentSchema = z
  .object({
    id: z.string(),
    scoId: z.string().nullable().optional(),
    documentId: z.string().nullable().optional(),
    document: z.unknown().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

// --- List item ---

export const scoListItemSchema = z
  .object({
    id: z.string(),
    scoNumber: z.string().nullable().optional(),
    projectId: z.string(),
    project: scoProjectRefSchema.nullable().optional(),
    purchaseOrderId: z.string().nullable().optional(),
    purchaseOrder: scoPurchaseOrderRefSchema.nullable().optional(),
    date: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    amount: z.string().nullable().optional(),
    status: scoStatusNameSchema,
    createdBy: z.string().nullable().optional(),
    negotiatedDiscount: z.coerce.number().nullable().optional(),
    shippingHandlingFee: z.coerce.number().nullable().optional(),
    taxPercent: z.coerce.number().nullable().optional(),
    taxAmount: z.coerce.number().nullable().optional(),
    changeTypeId: z.string().nullable().optional(),
    changeType: scoLookupRefSchema.nullable().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    rejectedBy: z.string().nullable().optional(),
    rejectedAt: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    voidedBy: z.string().nullable().optional(),
    voidedAt: z.string().nullable().optional(),
    voidReason: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deletedAt: z.string().nullable().optional(),
    lineItems: z.array(scoListLineItemSchema).optional().default([]),
    attachments: z.array(scoListAttachmentSchema).optional().default([]),
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

export const scoStatsSchema = z.object({
  totalSubChangeOrders: z.number(),
  draftSubChangeOrders: z.number(),
  approvedSubChangeOrders: z.number(),
  rejectedSubChangeOrders: z.number(),
  voidSubChangeOrders: z.number(),
  totalAmount: z.coerce.number(),
  approvedAmount: z.coerce.number(),
  pendingAmount: z.coerce.number(),
});

export type SCOStats = z.infer<typeof scoStatsSchema>;

// --- List params ---

export const listSCOsParamsSchema = z.object({
  projectId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  status: scoStatusNameSchema.optional(),
  changeTypeId: z.string().optional(),
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
    label: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    order: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .passthrough();

export type SCOChangeType = z.infer<typeof scoChangeTypeSchema>;

// --- Line item input (for create/edit form) ---

export const scoLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: quantitySchema(),
  unitId: z.string().min(1, 'Unit is required'),
  unitPrice: rateSchema(),
  costCodeId: z.string().optional(),
  notes: z.string().optional(),
});

export type SCOLineItemInput = z.infer<typeof scoLineItemInputSchema>;

// --- Create SCO input ---

const baseSCOInputSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  purchaseOrderId: z.string().min(1, 'Purchase order is required'),
  date: z.string().min(1, 'Date is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  negotiatedDiscount: moneySchema('Negotiated discount').optional(),
  shippingHandlingFee: moneySchema('Shipping and handling fee').optional(),
  taxPercent: percentSchema('Tax percent').optional(),
  changeTypeId: z.string().min(1, 'Change type is required'),
  lineItems: z.array(scoLineItemInputSchema).min(1, 'At least one line item is required'),
});

function validateSCODiscount(value: z.infer<typeof baseSCOInputSchema>, ctx: z.RefinementCtx) {
  const subtotal = sumRoundedLineAmountsDecimal(value.lineItems);
  if (toCommercialDecimal(value.negotiatedDiscount).greaterThan(subtotal)) {
    ctx.addIssue({
      code: 'custom',
      path: ['negotiatedDiscount'],
      message: 'Negotiated discount cannot exceed subtotal',
    });
  }
}

export const createSCOInputSchema = baseSCOInputSchema.superRefine(validateSCODiscount);

export type CreateSCOInput = z.infer<typeof createSCOInputSchema>;

// --- Update SCO input ---

export const updateSCOInputSchema = baseSCOInputSchema
  .extend({ id: z.string().optional() })
  .superRefine(validateSCODiscount);

export type UpdateSCOInput = z.infer<typeof updateSCOInputSchema>;

export const generateSCOPdfInputSchema = z.object({
  addWarningNotice: z.boolean().optional(),
  warningNoticeTitle: z.string().optional(),
  warningNoticeHtml: z.string().optional(),
  addTermsAndConditions: z.boolean().optional(),
  termsAndConditionsHtml: z.string().optional(),
});

export type GenerateSCOPdfInput = z.infer<typeof generateSCOPdfInputSchema>;

// --- SCO line item (from detail response) ---

export const scoLineItemSchema = z
  .object({
    id: z.string(),
    lineNumber: z.number().optional(),
    sequenceNumber: z.number().optional(),
    description: z.string(),
    unit: z.preprocess((value) => {
      if (typeof value === 'object' && value !== null) {
        const ref = value as { label?: unknown; name?: unknown; id?: unknown };
        return ref.label ?? ref.name ?? ref.id ?? undefined;
      }
      return value;
    }, z.string().nullable().optional()),
    unitId: z.string().nullable().optional(),
    quantity: z.coerce.number().optional(),
    qty: z.coerce.number().optional(),
    unitPrice: z.coerce.number(),
    amount: z.coerce.number(),
    costCategory: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    category: scoLookupRefSchema.nullable().optional(),
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
    projectId: z.string().optional(),
    title: z.string(),
    date: z.string().nullable().optional(),
    amount: z.coerce.number(),
    status: scoStatusSchema.nullable().optional(),
    statusId: z.string().optional(),
    description: z.string().nullable().optional(),
    initiatedBy: z.string().optional(),
    priority: z.string().optional(),
    reasonForChange: z.string().nullable().optional(),
    detailedScope: z.string().nullable().optional(),
    negotiatedDiscount: z.coerce.number().nullable().optional(),
    shippingHandlingFee: z.coerce.number().nullable().optional(),
    taxPercent: z.coerce.number().nullable().optional(),
    taxAmount: z.coerce.number().nullable().optional(),
    changeTypeId: z.string().nullable().optional(),
    vendorContactName: z.string().nullable().optional(),
    vendorContactEmail: z.string().nullable().optional(),
    vendorReferenceNumber: z.string().nullable().optional(),
    closeoutJustification: z.string().nullable().optional(),
    purchaseOrder: z
      .object({ id: z.string(), poNumber: z.string().nullable().optional() })
      .passthrough()
      .optional(),
    purchaseOrderId: z.string().nullable().optional(),
    vendor: z.object({ id: z.string(), name: z.string() }).passthrough().optional(),
    project: z
      .object({
        id: z.string(),
        name: z.string(),
        jobNumber: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    changeType: z
      .object({
        id: z.string().optional(),
        type: z.string().nullable().optional(),
        label: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        code: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
      })
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
    rfq: z.object({ id: z.string(), rfqNumber: z.string() }).passthrough().nullable().optional(),
    createdBy: z.string().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    rejectedBy: z.string().nullable().optional(),
    rejectedAt: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    voidedBy: z.string().nullable().optional(),
    voidedAt: z.string().nullable().optional(),
    voidReason: z.string().nullable().optional(),
    retainagePercent: z.coerce.number().optional(),
    paymentTerms: z.string().optional(),
    lineItems: z.array(scoLineItemSchema).optional().default([]),
    attachments: z
      .array(
        z.object({ id: z.string(), documentId: z.string().nullable().optional() }).passthrough()
      )
      .optional()
      .default([]),
    statusHistory: z
      .array(
        z
          .object({
            id: z.string(),
            fromStatus: z.string().nullable().optional(),
            toStatus: z.string(),
            changedBy: z.string(),
            changedAt: z.string(),
            reason: z.string().nullable().optional(),
          })
          .passthrough()
      )
      .optional()
      .default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type SCODetail = z.infer<typeof scoDetailSchema>;
