import { quickBooksTransactionEntitySchema } from '@/modules/integrations/schemas/quickbooks.schema';
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
    rfq: poRfqRefSchema.nullable().optional(),
    tradeCategory: poTradeCategoryRefSchema.nullable().optional(),
    poNumber: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: poStatusNameSchema,
    leadTime: z.string().nullable().optional(),
    shipToAddress: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    expectedDate: z.string().nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    subtotal: z.string().nullable().optional(),
    markupAmount: z.string().nullable().optional(),
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
    markupAmount: z.string().nullable().optional(),
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
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type PODetail = z.infer<typeof poDetailSchema>;

// --- Line item input ---

export const poLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be > 0'),
  unitId: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0, 'Unit price must be >= 0'),
  costCodeId: z.string().optional(),
  notes: z.string().optional(),
});

export type POLineItemInput = z.infer<typeof poLineItemInputSchema>;

// --- Create input ---

export const createPOInputSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  rfqId: z.string().optional(),
  tradeCategoryId: z.string().min(1, 'Trade category is required'),
  description: z.string().optional(),
  leadTime: z.string().optional(),
  address: z.string().optional(),
  expectedDate: z.string().optional(),
  shipToAddress: z.string().optional(),
  markupAmount: z.number().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  paymentTerms: paymentTermsSchema,
  retainagePercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  lineItems: z.array(poLineItemInputSchema).min(1, 'At least one line item is required'),
});

export type CreatePOInput = z.infer<typeof createPOInputSchema>;

// --- QuickBooks PO payments ---

export const poQuickBooksPaymentSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  realmId: z.string(),
  entity: quickBooksTransactionEntitySchema,
  transactionId: z.string(),
  docNumber: z.string().nullable(),
  displayName: z.string(),
  txnDate: z.string().nullable(),
  totalAmount: z.string().nullable(),
  currency: z.string().nullable(),
  privateNote: z.string().nullable(),
  lastUpdatedTime: z.string().nullable(),
  linkedById: z.string().nullable(),
  removedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const poQuickBooksLinkedPurchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string().nullable(),
});

export const poQuickBooksPaymentOptionSchema = z.object({
  realmId: z.string(),
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
  linkedPurchaseOrder: poQuickBooksLinkedPurchaseOrderSchema.nullable(),
});

export const poQuickBooksPaymentOptionsSchema = z.object({
  realmId: z.string(),
  companyName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  fetchedAt: z.string(),
  transactions: z.array(poQuickBooksPaymentOptionSchema),
});

export const addPoQuickBooksPaymentInputSchema = z.object({
  entity: quickBooksTransactionEntitySchema,
  transactionId: z.string().min(1),
  realmId: z.string().min(1).optional(),
});

export const addPoQuickBooksPaymentsInputSchema = z.object({
  payments: z.array(addPoQuickBooksPaymentInputSchema).min(1).max(25),
});

export type POQuickBooksPayment = z.infer<typeof poQuickBooksPaymentSchema>;
export type POQuickBooksPaymentOption = z.infer<typeof poQuickBooksPaymentOptionSchema>;
export type POQuickBooksPaymentOptions = z.infer<typeof poQuickBooksPaymentOptionsSchema>;
export type AddPOQuickBooksPaymentInput = z.infer<typeof addPoQuickBooksPaymentInputSchema>;
export type AddPOQuickBooksPaymentsInput = z.infer<typeof addPoQuickBooksPaymentsInputSchema>;
