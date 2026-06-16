import { z } from 'zod';

/* ---- Shared / lookup schemas ---- */

export const invoiceStatusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    color: z.string(),
    order: z.number(),
    isDefault: z.boolean().optional(),
  })
  .passthrough();

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

/* ---- Line item ---- */

export const invoiceLineItemSchema = z
  .object({
    id: z.string(),
    invoiceId: z.string().optional(),
    description: z.string(),
    qty: z.coerce.number(),
    unit: z.string(),
    unitPrice: z.coerce.number(),
    amount: z.coerce.number(),
    poLineItemId: z.string().nullable().optional(),
    costCodeId: z.string().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const invoiceRelatedSCOSchema = z
  .object({
    id: z.string(),
    scoNumber: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    amount: z.coerce.number().nullable().optional(),
    negotiatedDiscount: z.coerce.number().nullable().optional(),
    shippingHandlingFee: z.coerce.number().nullable().optional(),
    status: z.string().nullable().optional(),
    changeType: z
      .object({
        id: z.string().optional(),
        label: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    lineItems: z.array(z.unknown()).optional().default([]),
    attachments: z.array(z.unknown()).optional().default([]),
  })
  .passthrough();

export type InvoiceRelatedSCO = z.infer<typeof invoiceRelatedSCOSchema>;

export const invoiceAttachmentSchema = z
  .object({
    id: z.string(),
    documentId: z.string().nullable().optional(),
    document: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        displayName: z.string().nullable().optional(),
        mimeType: z.string().nullable().optional(),
        size: z.coerce.number().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type InvoiceAttachment = z.infer<typeof invoiceAttachmentSchema>;

/* ---- List item (from GET /invoices) ---- */

export const invoiceListItemSchema = z
  .object({
    id: z.string(),
    projectId: z.string().nullable().optional(),
    vendorId: z.string().nullable().optional(),
    purchaseOrderId: z.string().nullable().optional(),
    invoiceNumber: z.string().nullable().optional(),
    invoiceDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    totalAmount: z.coerce.number(),
    taxAmount: z.coerce.number().nullable().optional(),
    taxRate: z.coerce.number().nullable().optional(),
    isPaid: z.boolean().optional(),
    isDisputed: z.boolean().optional(),
    paidDate: z.string().nullable().optional(),
    paymentReference: z.string().nullable().optional(),
    paymentMethodId: z.string().nullable().optional(),
    paymentMethod: z.unknown().optional(),
    paymentNotes: z.string().nullable().optional(),
    disputeReason: z.string().nullable().optional(),
    disputedAt: z.string().nullable().optional(),
    resolvedAt: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    relatedSCOIds: z.array(z.string()).optional().default([]),
    vendor: z.object({ id: z.string(), name: z.string() }).passthrough().nullable().optional(),
    purchaseOrder: z
      .object({ id: z.string(), poNumber: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    attachments: z.array(invoiceAttachmentSchema).optional().default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deletedAt: z.string().nullable().optional(),
  })
  .passthrough();

export type InvoiceListItem = z.infer<typeof invoiceListItemSchema>;

/* ---- Detail (from GET /invoices/:id) ---- */

export const invoiceDetailSchema = z
  .object({
    id: z.string(),
    projectId: z.string().nullable().optional(),
    vendorId: z.string().nullable().optional(),
    purchaseOrderId: z.string().nullable().optional(),
    invoiceNumber: z.string().nullable().optional(),
    invoiceDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    totalAmount: z.coerce.number(),
    status: invoiceStatusSchema.nullable().optional(),
    invoiceType: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    isPaid: z.boolean().optional(),
    isDisputed: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    lineItems: z.array(invoiceLineItemSchema).optional().default([]),
    retainagePercent: z.coerce.number().optional(),
    retainageAmount: z.coerce.number().optional(),
    netPaymentAmount: z.coerce.number().optional(),
    taxAmount: z.coerce.number().nullable().optional(),
    taxRate: z.coerce.number().nullable().optional(),
    relatedSCOIds: z.array(z.string()).optional().default([]),
    relatedSCOs: z.array(invoiceRelatedSCOSchema).optional().default([]),
    paidAmount: z.coerce.number().nullable().optional(),
    paidDate: z.string().nullable().optional(),
    paymentReference: z.string().nullable().optional(),
    paymentMethodId: z.string().nullable().optional(),
    paymentMethod: z
      .object({
        id: z.string().optional(),
        name: z.string().nullable().optional(),
        label: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    paymentNotes: z.string().nullable().optional(),
    disputeReason: z.string().nullable().optional(),
    disputeDate: z.string().nullable().optional(),
    disputeResolution: z.string().nullable().optional(),
    disputeResolvedDate: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    invoiceDocumentId: z.string().nullable().optional(),
    disputedAt: z.string().nullable().optional(),
    resolvedAt: z.string().nullable().optional(),
    vendor: z.object({ id: z.string(), name: z.string() }).passthrough().nullable().optional(),
    purchaseOrder: z
      .object({
        id: z.string(),
        poNumber: z.string(),
        vendorId: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        paymentTerms: z.string().nullable().optional(),
        total: z.coerce.number().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    project: z
      .object({ id: z.string(), name: z.string(), jobNumber: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    invoiceDocument: z
      .object({ id: z.string(), name: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    daysOverdue: z.number().optional(),
    isPastDue: z.boolean().optional(),
    agingBucket: z.string().nullable().optional(),
    attachments: z.array(invoiceAttachmentSchema).optional().default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;

/* ---- Paginated list response ---- */

export const invoicePaginatedResponseSchema = z.object({
  data: z.array(invoiceListItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type InvoicePaginatedResponse = z.infer<typeof invoicePaginatedResponseSchema>;

export const invoiceStatsSchema = z.object({
  totalInvoices: z.number(),
  paidInvoices: z.number(),
  unpaidInvoices: z.number(),
  disputedInvoices: z.number(),
  overdueInvoices: z.number(),
  totalAmount: z.coerce.number(),
  paidAmount: z.coerce.number(),
  unpaidAmount: z.coerce.number(),
});

export type InvoiceStats = z.infer<typeof invoiceStatsSchema>;

/* ---- Summary (from GET /projects/:id/invoice-summary) ---- */

export const statusSummarySchema = z.object({
  count: z.number().default(0),
  totalAmount: z.coerce.number().default(0),
});

export const invoiceSummarySchema = z
  .object({
    totalCount: z.number().default(0),
    totalInvoiced: z.coerce.number().default(0),
    totalApproved: z.coerce.number().default(0),
    totalPaid: z.coerce.number().default(0),
    totalOutstanding: z.coerce.number().default(0),
    byStatus: z
      .object({
        pending: statusSummarySchema.optional().default({ count: 0, totalAmount: 0 }),
        approved: statusSummarySchema.optional().default({ count: 0, totalAmount: 0 }),
        rejected: statusSummarySchema.optional().default({ count: 0, totalAmount: 0 }),
      })
      .passthrough()
      .optional(),
    byType: z
      .object({
        preliminary: statusSummarySchema.optional(),
        final: statusSummarySchema.optional(),
        revision: statusSummarySchema.optional(),
      })
      .passthrough()
      .optional(),
    disputedCount: z.number().default(0),
    overdueCount: z.number().default(0),
    avgDaysToApproval: z.coerce.number().default(0),
    avgDaysToPayment: z.coerce.number().default(0),
  })
  .passthrough();

export type InvoiceSummary = z.infer<typeof invoiceSummarySchema>;

/* ---- List query params ---- */

export const listInvoiceParamsSchema = z.object({
  projectId: z.string().optional(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  vendorId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  isPaid: z.boolean().optional(),
});

export type ListInvoiceParams = z.infer<typeof listInvoiceParamsSchema>;

/* ---- Input schemas ---- */

export const invoiceLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty: z.number().gt(0, 'Quantity must be > 0'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0, 'Unit price must be >= 0'),
  poLineItemId: z.string().optional(),
  costCodeId: z.string().optional(),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemInputSchema>;

export const createInvoiceInputSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  purchaseOrderId: z.string().min(1, 'Purchase order is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  totalAmount: z.number().gt(0, 'Invoice amount must be greater than 0'),
  taxAmount: z.number().min(0, 'Tax amount must be >= 0'),
  taxRate: z.number().min(0, 'Tax rate must be >= 0'),
  notes: z.string(),
  relatedSCOIds: z.array(z.string()),
  attachments: z.array(z.string()),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

export const updateInvoiceInputSchema = createInvoiceInputSchema
  .omit({ attachments: true })
  .extend({ id: z.string().optional() });

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

export const invoiceRejectInputSchema = z.object({
  reason: z.string().min(20, 'Reason must be at least 20 characters'),
});

export type InvoiceRejectInput = z.infer<typeof invoiceRejectInputSchema>;

export const invoiceMarkPaidInputSchema = z.object({
  paidDate: z.string().min(1, 'Payment date is required'),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  paymentReference: z.string().optional(),
  paymentNotes: z.string().optional(),
});

export type InvoiceMarkPaidInput = z.infer<typeof invoiceMarkPaidInputSchema>;

export const invoiceDisputeInputSchema = z.object({
  disputeReason: z.string().min(1, 'Dispute reason is required'),
  notifyVendor: z.boolean().optional(),
});

export type InvoiceDisputeInput = z.infer<typeof invoiceDisputeInputSchema>;

export const invoiceResolveDisputeInputSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
});

export type InvoiceResolveDisputeInput = z.infer<typeof invoiceResolveDisputeInputSchema>;
