import { z } from 'zod';

import { QuotationStatus, RFQStatus, TradeCategory } from '../types';

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

export const DeliverableSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty: z.number({ error: 'Quantity is required' }).positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  estimatedUnitPrice: z.number().nonnegative('Estimated unit price must be 0 or greater').optional(),
  sequenceNumber: z.number().int().nonnegative().optional().default(0),
});

export type DeliverableFormValues = z.infer<typeof DeliverableSchema>;

export const QuotationLineItemSchema = z.object({
  deliverableId: z.string().min(1, 'Deliverable is required'),
  unitPrice: z
    .number({ error: 'Unit price is required' })
    .nonnegative('Unit price must be 0 or greater'),
  amount: z
    .number({ error: 'Amount is required' })
    .nonnegative('Amount must be 0 or greater'),
  notes: z.string().optional(),
});

export type QuotationLineItemFormValues = z.infer<typeof QuotationLineItemSchema>;

// ---------------------------------------------------------------------------
// RFQCreateSchema
// ---------------------------------------------------------------------------

export const RFQCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
  tradeCategory: z.enum(TradeCategory, {
    error: 'Trade category is required',
  }),
  quoteDeadline: z
    .string({ error: 'Quote deadline is required' })
    .min(1, 'Quote deadline is required'),
  deliverables: z
    .array(DeliverableSchema)
    .min(1, 'At least one deliverable is required'),
  vendorIds: z.array(z.string()).optional(),
});

export type RFQCreateFormValues = z.infer<typeof RFQCreateSchema>;

// ---------------------------------------------------------------------------
// RFQUpdateSchema (all fields optional except title when provided)
// ---------------------------------------------------------------------------

export const RFQUpdateSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  tradeCategory: z.enum(TradeCategory).optional(),
  status: z.enum(RFQStatus).optional(),
  quoteDeadline: z.string().min(1, 'Quote deadline cannot be empty').optional(),
  awardedVendorId: z.string().optional(),
  awardedQuotationId: z.string().optional(),
  vendorIds: z.array(z.string()).optional(),
});

export type RFQUpdateFormValues = z.infer<typeof RFQUpdateSchema>;

// ---------------------------------------------------------------------------
// QuotationSchema
// ---------------------------------------------------------------------------

export const QuotationSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  totalAmount: z
    .number({ error: 'Total amount is required' })
    .nonnegative('Total amount must be 0 or greater'),
  warrantyInfo: z.string().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(QuotationStatus).optional().default(QuotationStatus.SUBMITTED),
  lineItems: z
    .array(QuotationLineItemSchema)
    .min(1, 'At least one line item with pricing is required')
    .refine(
      (items) => items.every((item) => item.unitPrice >= 0 && item.amount >= 0),
      { message: 'All line items must have valid pricing' },
    ),
});

export type QuotationFormValues = z.infer<typeof QuotationSchema>;

// ---------------------------------------------------------------------------
// AwardSchema
// ---------------------------------------------------------------------------

export const AwardSchema = z.object({
  quotationId: z.string().min(1, 'Quotation is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  notes: z.string().optional(),
});

export type AwardFormValues = z.infer<typeof AwardSchema>;
