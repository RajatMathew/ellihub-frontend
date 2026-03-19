import { z } from 'zod';

/* ---- Shared / lookup schemas ---- */

export const rfqStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    color: z.string(),
    order: z.number(),
  })
  .passthrough();

export type RFQStatus = z.infer<typeof rfqStatusSchema>;

/* ---- List item (from GET /rfqs) ---- */

export const RFQ_TRACKS = ['MATERIAL', 'FABRICATION', 'INSTALLATION', 'LABOR', 'EQUIPMENT'] as const;
export type RFQTrack = (typeof RFQ_TRACKS)[number];

export const rfqListItemSchema = z
  .object({
    id: z.string(),
    rfqNumber: z.string(),
    title: z.string(),
    status: rfqStatusSchema.nullable().optional(),
    track: z.enum(RFQ_TRACKS).nullable().optional(),
    bidDeadline: z.string(),
    estimatedBudget: z.coerce.number().nullable().optional(),
    biddingType: z.string(),
    project: z
      .object({ id: z.string(), name: z.string(), jobNumber: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    _count: z.record(z.string(), z.number()).nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type RFQListItem = z.infer<typeof rfqListItemSchema>;

/* ---- Paginated list response ---- */

export const rfqPaginatedResponseSchema = z.object({
  data: z.array(rfqListItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type RFQPaginatedResponse = z.infer<typeof rfqPaginatedResponseSchema>;

/* ---- List query params ---- */

export const listRFQParamsSchema = z.object({
  projectId: z.string(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  statusId: z.string().optional(),
});

export type ListRFQParams = z.infer<typeof listRFQParamsSchema>;

/* ---- Deliverable (from detail response) ---- */

export const rfqDeliverableSchema = z
  .object({
    id: z.string(),
    rfqId: z.string().optional(),
    sequenceNumber: z.number().optional(),
    description: z.string(),
    specifications: z.string().nullable().optional(),
    quantity: z.coerce.number(),
    unit: z.string(),
    costCodeId: z.string().nullable().optional(),
    estimatedUnitPrice: z.coerce.number().nullable().optional(),
    estimatedTotal: z.coerce.number().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type RFQDeliverable = z.infer<typeof rfqDeliverableSchema>;

/* ---- Invite (from detail response) ---- */

export const rfqInviteSchema = z
  .object({
    id: z.string(),
    rfqId: z.string().optional(),
    vendorId: z.string().optional(),
    vendor: z
      .object({ id: z.string(), name: z.string(), email: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    hasSubmittedQuote: z.boolean().optional(),
    declinedToQuote: z.boolean().optional(),
    sentAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type RFQInvite = z.infer<typeof rfqInviteSchema>;

/* ---- Quote (from detail response) ---- */

export const rfqQuoteSchema = z
  .object({
    id: z.string(),
    rfqId: z.string().optional(),
    vendorId: z.string().optional(),
    vendor: z
      .object({ id: z.string(), name: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    status: rfqStatusSchema.nullable().optional(),
    totalAmount: z.coerce.number().nullable().optional(),
    grandTotal: z.coerce.number().nullable().optional(),
    isAwarded: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    leadTimeDays: z.number().nullable().optional(),
    submittedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type RFQQuote = z.infer<typeof rfqQuoteSchema>;

/* ---- Attachment (from detail response) ---- */

export const rfqAttachmentSchema = z
  .object({
    id: z.string(),
    documentId: z.string().nullable().optional(),
    document: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .passthrough()
      .nullable()
      .optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type RFQAttachment = z.infer<typeof rfqAttachmentSchema>;

/* ---- Detail (from GET /rfqs/:id, POST /rfqs, PUT /rfqs/:id) ---- */

export const rfqDetailSchema = z
  .object({
    id: z.string(),
    projectId: z.string().optional(),
    rfqNumber: z.string().nullable().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    status: rfqStatusSchema.nullable().optional(),
    statusId: z.string().optional(),
    costCodeId: z.string().nullable().optional(),
    costCode: z
      .object({ id: z.string(), name: z.string(), code: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    project: z
      .object({ id: z.string(), name: z.string(), jobNumber: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    estimatedBudget: z.coerce.number().nullable().optional(),
    track: z.enum(RFQ_TRACKS).nullable().optional(),
    bidDeadline: z.string(),
    biddingType: z.string(),
    minimumVendors: z.number().optional(),
    deliverables: z.array(rfqDeliverableSchema).optional().default([]),
    invites: z.array(rfqInviteSchema).optional().default([]),
    quotes: z.array(rfqQuoteSchema).optional().default([]),
    attachments: z.array(rfqAttachmentSchema).optional().default([]),
    addendums: z.array(z.any()).optional().default([]),
    purchaseOrders: z
      .array(
        z.object({
          id: z.string(),
          poNumber: z.string().nullable().optional(),
          vendorId: z.string().nullable().optional(),
          awardedQuoteId: z.string().nullable().optional(),
        }).passthrough(),
      )
      .optional()
      .default([]),
    generatedPO: z.any().nullable().optional(),
    awardedAmount: z.coerce.number().nullable().optional(),
    awardedVendor: z
      .object({ id: z.string(), name: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    cancellationReason: z.string().nullable().optional(),
    voidReason: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deletedAt: z.string().nullable().optional(),
  })
  .passthrough();

export type RFQDetail = z.infer<typeof rfqDetailSchema>;

/* ---- Input schemas (form validation) ---- */

export const rfqDeliverableInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  specifications: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  costCodeId: z.string().optional(),
  estimatedUnitPrice: z.number().min(0).optional(),
});

export type RFQDeliverableInput = z.infer<typeof rfqDeliverableInputSchema>;

export const createRFQInputSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  estimatedBudget: z.number().min(0).optional(),
  track: z.enum(RFQ_TRACKS).optional().default('MATERIAL'),
  bidDeadline: z.string().min(1, 'Bid deadline is required'),
  biddingType: z.enum(['ANONYMOUS', 'OPEN']).optional(),
  minimumVendors: z.number().int().min(1).optional(),
  deliverables: z.array(rfqDeliverableInputSchema).min(1, 'At least one deliverable is required'),
});

export type CreateRFQInput = z.infer<typeof createRFQInputSchema>;

export const updateRFQInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  description: z.string().nullable().optional(),
  estimatedBudget: z.number().min(0).nullable().optional(),
  track: z.enum(RFQ_TRACKS).optional(),
  bidDeadline: z.string().optional(),
  biddingType: z.enum(['ANONYMOUS', 'OPEN']).optional(),
  minimumVendors: z.number().int().min(1).optional(),
});

export type UpdateRFQInput = z.infer<typeof updateRFQInputSchema>;

/* ---- Workflow input schemas ---- */

export const publishRFQInputSchema = z.object({
  vendorIds: z.array(z.string().min(1)).min(1, 'At least one vendor is required'),
  sendInviteEmails: z.boolean().optional(),
});

export type PublishRFQInput = z.infer<typeof publishRFQInputSchema>;

export const cancelRFQInputSchema = z.object({
  cancellationReason: z.string().min(1, 'Reason is required'),
});

export type CancelRFQInput = z.infer<typeof cancelRFQInputSchema>;

export const awardRFQInputSchema = z.object({
  awardedQuoteId: z.string().min(1),
  awardedVendorId: z.string().min(1),
  awardedAmount: z.number().positive(),
  autoGeneratePO: z.boolean().optional(),
  sendAwardEmail: z.boolean().optional(),
  sendRegretEmails: z.boolean().optional(),
});

export type AwardRFQInput = z.infer<typeof awardRFQInputSchema>;

export const voidAwardInputSchema = z.object({
  voidReason: z.string().min(1, 'Reason is required'),
});

export type VoidAwardInput = z.infer<typeof voidAwardInputSchema>;
