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

// --- Enums ---

export const poStatusNameSchema = z.enum([
  'DRAFT',
  'ISSUED',
  'DELIVERED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
]);
export type POStatusName = z.infer<typeof poStatusNameSchema>;

export const tradeCategorySchema = z.enum([
  'MATERIAL',
  'FABRICATION',
  'INSTALLATION',
  'LABOR',
  'EQUIPMENT',
]);
export type TradeCategory = z.infer<typeof tradeCategorySchema>;

export const paymentTermsSchema = z.enum([
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  'DUE_ON_RECEIPT',
]);
export type PaymentTerms = z.infer<typeof paymentTermsSchema>;

// --- Status object (nested in list + detail) ---

export const poStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    color: z.string(),
  })
  .passthrough();

export type POStatus = z.infer<typeof poStatusSchema>;

const poVendorRefSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().nullable().optional(),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    status: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
  })
  .passthrough();

const poRfqRefSchema = z
  .object({
    id: z.string().optional(),
    rfqNumber: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
  })
  .passthrough();

const poTradeCategoryRefSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
  })
  .passthrough();

const poProjectRefSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    jobNumber: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough();

const poSubChangeOrderRefSchema = z
  .object({
    id: z.string(),
    amount: z.coerce.number().nullable().optional(),
    negotiatedDiscount: z.coerce.number().nullable().optional(),
    shippingHandlingFee: z.coerce.number().nullable().optional(),
    taxPercent: z.coerce.number().nullable().optional(),
    taxAmount: z.coerce.number().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough();

const poAttachmentSchema = z
  .object({
    id: z.string(),
    purchaseOrderId: z.string().optional(),
    documentId: z.string().nullable().optional(),
    document: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

// --- List item ---

export const poListItemSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    vendorId: z.string(),
    rfqId: z.string().nullable().optional(),
    tradeCategoryId: z.string().nullable().optional(),
    vendor: poVendorRefSchema.nullable().optional(),
    project: poProjectRefSchema.nullable().optional(),
    rfq: poRfqRefSchema.nullable().optional(),
    tradeCategory: poTradeCategoryRefSchema.nullable().optional(),
    subChangeOrders: z.array(poSubChangeOrderRefSchema).optional().default([]),
    poNumber: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: poStatusNameSchema,
    leadTime: z.string().nullable().optional(),
    shipToAddress: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    expectedDate: z.string().nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    subtotal: z.string().nullable().optional(),
    negotiatedDiscount: z.string().nullable().optional(),
    shippingHandlingFee: z.string().nullable().optional(),
    taxPercent: z.string().nullable().optional(),
    taxAmount: z.string().nullable().optional(),
    total: z.string().nullable().optional(),
    retainagePercent: z.string().nullable().optional(),
    paymentTerms: paymentTermsSchema.optional(),
    notes: z.string().nullable().optional(),
    issuedBy: z.string().nullable().optional(),
    issuedAt: z.string().nullable().optional(),
    cancelledBy: z.string().nullable().optional(),
    cancelledAt: z.string().nullable().optional(),
    cancellationReason: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deletedAt: z.string().nullable().optional(),
  })
  .passthrough();

export type POListItem = z.infer<typeof poListItemSchema>;

// --- Paginated response ---

export const poPaginatedResponseSchema = z.object({
  data: z.array(poListItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type POPaginatedResponse = z.infer<typeof poPaginatedResponseSchema>;

export const poStatsSchema = z.object({
  totalPurchaseOrders: z.number(),
  draftPurchaseOrders: z.number(),
  issuedPurchaseOrders: z.number(),
  deliveredPurchaseOrders: z.number(),
  cancelledPurchaseOrders: z.number(),
  totalCommitted: z.coerce.number(),
});

export type POStats = z.infer<typeof poStatsSchema>;

// --- List params ---

export const listPOsParamsSchema = z.object({
  projectId: z.string().optional(),
  status: poStatusNameSchema.optional(),
  tradeCategoryId: z.string().optional(),
  vendorId: z.string().optional(),
  rfqId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  overdue: z.literal('true').optional(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListPOsParams = z.infer<typeof listPOsParamsSchema>;

// --- Detail ---

export const poLineItemSchema = z
  .object({
    id: z.string(),
    purchaseOrderId: z.string(),
    lineNumber: z.number(),
    description: z.string(),
    unitId: z.string().nullable().optional(),
    quantity: z.string(),
    unit: z.preprocess((value) => {
      if (typeof value === 'object' && value !== null) {
        const ref = value as { label?: unknown; name?: unknown; id?: unknown };
        return ref.label ?? ref.name ?? ref.id ?? undefined;
      }
      return value;
    }, z.string().nullable().optional()),
    unitPrice: z.string(),
    amount: z.string(),
    costCodeId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type POLineItem = z.infer<typeof poLineItemSchema>;

export const poPaymentSchema = z
  .object({
    id: z.string(),
    purchaseOrderId: z.string(),
    amount: z.coerce.number(),
    qbVendorId: z.string().nullable().optional(),
    bankAccountId: z.string().nullable().optional(),
    txnDate: z.string().nullable().optional(),
    transactionId: z.string().nullable().optional(),
    transactionUrl: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type POPayment = z.infer<typeof poPaymentSchema>;

export const poDetailSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    vendorId: z.string(),
    rfqId: z.string().nullable().optional(),
    tradeCategoryId: z.string().nullable().optional(),
    rfq: poRfqRefSchema.nullable().optional(),
    poNumber: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    tradeCategory: tradeCategorySchema.nullable().optional(),
    tradeCategoryLabel: z.string().nullable().optional(),
    status: poStatusSchema,
    contactName: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    contactPhone: z.string().nullable().optional(),
    leadTime: z.string().nullable().optional(),
    issueDate: z.string().nullable().optional(),
    expectedDate: z.string().nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    shipToAddress: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    subtotal: z.string().nullable().optional(),
    negotiatedDiscount: z.string().nullable().optional(),
    shippingHandlingFee: z.string().nullable().optional(),
    taxPercent: z.string().nullable().optional(),
    taxAmount: z.string().nullable().optional(),
    total: z.string().nullable().optional(),
    totalCommitment: z.string().nullable().optional(),
    retainagePercent: z.string().nullable().optional(),
    paymentTerms: paymentTermsSchema.optional(),
    notes: z.string().nullable().optional(),
    vendorNotes: z.string().nullable().optional(),
    isOverdue: z.boolean().optional(),
    issuedBy: z.string().nullable().optional(),
    issuedAt: z.string().nullable().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    rejectedBy: z.string().nullable().optional(),
    rejectedAt: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    cancelledBy: z.string().nullable().optional(),
    cancelledAt: z.string().nullable().optional(),
    cancellationReason: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    project: z
      .object({ id: z.string(), name: z.string(), jobNumber: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    vendor: z.object({ id: z.string(), name: z.string() }).passthrough().nullable().optional(),
    lineItems: z.array(poLineItemSchema).optional().default([]),
    attachments: z.array(poAttachmentSchema).optional().default([]),
    poPayments: z.array(poPaymentSchema).optional().default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type PODetail = z.infer<typeof poDetailSchema>;

// --- Line item input ---

export const poLineItemInputSchema = z.object({
  rfqDeliverableId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: quantitySchema(),
  unitId: z.string().min(1, 'Unit is required'),
  unitPrice: rateSchema(),
  costCodeId: z.string().min(1, 'Cost code is required'),
  notes: z.string().optional(),
});

export type POLineItemInput = z.infer<typeof poLineItemInputSchema>;

// --- Create input ---

export const createPOInputSchema = z
  .object({
    projectId: z.string().min(1, 'Project is required'),
    vendorId: z.string().min(1, 'Vendor is required'),
    rfqId: z.string().optional(),
    tradeCategoryId: z.string().min(1, 'Trade category is required'),
    description: z.string().optional(),
    leadTime: z.string().optional(),
    address: z.string().optional(),
    expectedDate: z.string().optional(),
    shipToAddress: z.string().optional(),
    negotiatedDiscount: moneySchema('Negotiated discount').optional(),
    shippingHandlingFee: moneySchema('Shipping and handling fee').optional(),
    taxPercent: percentSchema('Tax percent').optional(),
    paymentTerms: paymentTermsSchema,
    retainagePercent: percentSchema('Retainage percent').optional(),
    notes: z.string().optional(),
    lineItems: z.array(poLineItemInputSchema).min(1, 'At least one line item is required'),
  })
  .superRefine((value, ctx) => {
    const subtotal = sumRoundedLineAmountsDecimal(value.lineItems);
    if (toCommercialDecimal(value.negotiatedDiscount).greaterThan(subtotal)) {
      ctx.addIssue({
        code: 'custom',
        path: ['negotiatedDiscount'],
        message: 'Negotiated discount cannot exceed subtotal',
      });
    }
  });

export type CreatePOInput = z.infer<typeof createPOInputSchema>;

export const generatePOPdfInputSchema = z.object({
  addWarningNotice: z.boolean().optional(),
  warningNoticeTitle: z.string().optional(),
  warningNoticeHtml: z.string().optional(),
  addTermsAndConditions: z.boolean().optional(),
  termsAndConditionsHtml: z.string().optional(),
});

export type GeneratePOPdfInput = z.infer<typeof generatePOPdfInputSchema>;

export const poPdfDefaultTermsSchema = z.object({
  html: z.string(),
});

export type POPdfDefaultTerms = z.infer<typeof poPdfDefaultTermsSchema>;

export const poPdfTermsOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  html: z.string(),
  isDefault: z.boolean(),
});

export const poPdfTermsOptionsSchema = z.array(poPdfTermsOptionSchema);

export type POPdfTermsOption = z.infer<typeof poPdfTermsOptionSchema>;
