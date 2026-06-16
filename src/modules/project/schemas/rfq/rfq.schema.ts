import {
  moneySchema,
  quantitySchema,
  rateSchema,
} from '@/modules/project/lib/commercial-validation';
import { z } from 'zod';

/* ---- Shared / lookup schemas ---- */

export const rfqStatusSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    label: z.string().optional(),
    color: z.string().optional(),
    order: z.number().optional(),
  })
  .passthrough();

export type RFQStatus = z.infer<typeof rfqStatusSchema>;

/* ---- List item (from GET /rfqs) ---- */

export const rfqListItemSchema = z
  .object({
    id: z.string(),
    rfqNumber: z.string().nullable().optional(),
    title: z.string(),
    status: z.union([rfqStatusSchema, z.string()]).nullable().optional(),
    track: z.string().nullable().optional(),
    type: z
      .object({
        id: z.string(),
        type: z.string(),
        label: z.string(),
      })
      .passthrough()
      .nullable()
      .optional(),
    bidDeadline: z.string().nullable().optional(),
    estimatedBudget: z.coerce.number().nullable().optional(),
    project: z
      .object({ id: z.string(), name: z.string(), jobNumber: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    _count: z
      .object({
        invites: z.number(),
        quotes: z.number(),
      })
      .nullable()
      .optional(),
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

export const rfqStatsSchema = z.object({
  totalRfqs: z.number(),
  draftRfqs: z.number(),
  activeRfqs: z.number(),
  awardedRfqs: z.number(),
  voidRfqs: z.number(),
});

export type RFQStats = z.infer<typeof rfqStatsSchema>;

/* ---- List query params ---- */

export const listRFQParamsSchema = z.object({
  projectId: z.string().optional(),
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
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    specifications: z.string().nullable().optional(),
    quantity: z.coerce.number().nullable().optional(),
    unit: z
      .union([z.string(), z.object({ id: z.string(), label: z.string() }).passthrough()])
      .nullable()
      .optional(),
    unitId: z.string().nullable().optional(),
    costCodeId: z.string().nullable().optional(),
    estimatedUnitPrice: z.coerce.number().nullable().optional(),
    estimatedTotal: z.coerce.number().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type RFQDeliverable = z.infer<typeof rfqDeliverableSchema>;

export const rfqVendorContactSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    email: z.string().nullable().optional(),
    isPrimary: z.boolean().optional(),
  })
  .passthrough();

export type RFQVendorContact = z.infer<typeof rfqVendorContactSchema>;

/* ---- Invite (from detail response) ---- */

export const rfqInviteSchema = z
  .object({
    id: z.string(),
    rfqId: z.string().optional(),
    vendorId: z.string().optional(),
    vendor: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        contacts: z.array(rfqVendorContactSchema).optional().default([]),
      })
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

export const rfqQuoteAttachmentSchema = z
  .object({
    id: z.string(),
    documentId: z.string().nullable().optional(),
    document: z
      .object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    name: z.string().optional(),
  })
  .passthrough();

export type RFQQuoteAttachment = z.infer<typeof rfqQuoteAttachmentSchema>;

/* ---- Quote (from detail response) ---- */

export const rfqQuoteSchema = z
  .object({
    id: z.string(),
    rfqId: z.string().optional(),
    vendorId: z.string().optional(),
    vendor: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        contacts: z.array(rfqVendorContactSchema).optional().default([]),
      })
      .passthrough()
      .nullable()
      .optional(),
    status: rfqStatusSchema.nullable().optional(),
    totalAmount: z.coerce.number().nullable().optional(),
    grandTotal: z.coerce.number().nullable().optional(),
    negotiationAmount: z.coerce.number().nullable().optional(),
    vendorCoupon: z.boolean().optional().default(false),
    isAwarded: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    leadTime: z.string().nullable().optional(),
    leadTimeDays: z.number().nullable().optional(),
    submittedAt: z.string().nullable().optional(),
    attachments: z.array(rfqQuoteAttachmentSchema).optional().default([]),
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
    status: z.union([rfqStatusSchema, z.string()]).nullable().optional(),
    statusId: z.string().optional(),
    typeId: z.string().optional(),
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
    track: z.string().nullable().optional(),
    type: z
      .object({
        id: z.string(),
        type: z.string(),
        label: z.string(),
      })
      .passthrough()
      .nullable()
      .optional(),

    bidDeadline: z.string().nullable().optional(),
    minimumVendors: z.number().optional(),
    deliverables: z.array(rfqDeliverableSchema).optional().default([]),
    invites: z.array(rfqInviteSchema).optional().default([]),
    quotes: z.array(rfqQuoteSchema).optional().default([]),
    attachments: z.array(rfqAttachmentSchema).optional().default([]),
    addendums: z.array(z.unknown()).optional().default([]),
    purchaseOrders: z
      .array(
        z
          .object({
            id: z.string(),
            poNumber: z.string().nullable().optional(),
            vendorId: z.string().nullable().optional(),
            rfqId: z.string().nullable().optional(),
            status: z.string().nullable().optional(),
            awardedQuoteId: z.string().nullable().optional(),
          })
          .passthrough()
      )
      .nullable()
      .optional()
      .default([]),
    generatedPO: z.unknown().nullable().optional(),
    awardedAmount: z.coerce.number().nullable().optional(),
    awardedVendorId: z.string().nullable().optional(),
    awardedVendor: z
      .object({ id: z.string(), name: z.string().nullable().optional() })
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

const optionalTextSchema = z.string().trim().optional();
const requiredTextSchema = (message: string) => z.string().trim().min(1, message);

export const rfqDeliverableInputSchema = z.object({
  name: optionalTextSchema,
  description: requiredTextSchema('Deliverable description is required'),
  specifications: optionalTextSchema,
  quantity: quantitySchema(),
  unit: optionalTextSchema,
  unitId: requiredTextSchema('Unit is required'),
  costCodeId: optionalTextSchema,
  estimatedUnitPrice: rateSchema('Estimated unit price').optional(),
});

export type RFQDeliverableInput = z.infer<typeof rfqDeliverableInputSchema>;

export const createRFQInputSchema = z.object({
  projectId: requiredTextSchema('Project is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: requiredTextSchema('Description is required'),
  typeId: z.string().min(1, 'Track is required'),
  bidDeadline: z.string().min(1, 'Bid deadline is required'),
  deliverables: z.array(rfqDeliverableInputSchema).min(1, 'At least one deliverable is required'),
});

export type CreateRFQInput = z.infer<typeof createRFQInputSchema>;

export const updateRFQInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: requiredTextSchema('Description is required'),
  typeId: z.string().min(1, 'Track is required'),
  bidDeadline: z.string().min(1, 'Bid deadline is required'),
  deliverables: z.array(rfqDeliverableInputSchema).min(1, 'At least one deliverable is required'),
});

export type UpdateRFQInput = z.infer<typeof updateRFQInputSchema>;

/* ---- Workflow input schemas ---- */

export const publishRFQInputSchema = z.object({
  vendorIds: z
    .array(z.string().min(1, 'Vendor is required'))
    .min(1, 'At least one vendor is required'),
  sendInviteEmails: z.boolean().optional(),
});

export type PublishRFQInput = z.infer<typeof publishRFQInputSchema>;

export const cancelRFQInputSchema = z.object({
  cancellationReason: z.string().min(1, 'Reason is required'),
});

export type CancelRFQInput = z.infer<typeof cancelRFQInputSchema>;

export const awardRFQInputSchema = z.object({
  awardedQuoteId: z.string().min(1, 'Quote is required'),
  awardedVendorId: z.string().min(1, 'Vendor is required'),
  awardedAmount: moneySchema('Awarded amount').refine((value) => value > 0, {
    message: 'Awarded amount must be greater than 0',
  }),
  autoGeneratePO: z.boolean().optional(),
  sendAwardEmail: z.boolean().optional(),
  sendRegretEmails: z.boolean().optional(),
});

export type AwardRFQInput = z.infer<typeof awardRFQInputSchema>;

export const voidAwardInputSchema = z.object({
  voidReason: z.string().min(1, 'Reason is required'),
});

export type VoidAwardInput = z.infer<typeof voidAwardInputSchema>;
