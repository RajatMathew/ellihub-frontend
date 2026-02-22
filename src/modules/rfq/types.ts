// Enums (as-const objects — compatible with erasableSyntaxOnly / isolatedDeclarations)

export const RFQStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
  AWARDED: "AWARDED",
  CANCELLED: "CANCELLED",
} as const;
export type RFQStatus = (typeof RFQStatus)[keyof typeof RFQStatus];

export const QuotationStatus = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];

export const TradeCategory = {
  ELECTRICAL: "ELECTRICAL",
  PLUMBING: "PLUMBING",
  HVAC: "HVAC",
  CARPENTRY: "CARPENTRY",
  MASONRY: "MASONRY",
  PAINTING: "PAINTING",
  ROOFING: "ROOFING",
  LANDSCAPING: "LANDSCAPING",
  GENERAL_CONSTRUCTION: "GENERAL_CONSTRUCTION",
  MECHANICAL: "MECHANICAL",
  CIVIL: "CIVIL",
  OTHER: "OTHER",
} as const;
export type TradeCategory = (typeof TradeCategory)[keyof typeof TradeCategory];

// Core entities

export interface RFQ {
  id: string;
  rfqNumber: string;
  projectId: string;
  title: string;
  description: string;
  tradeCategory: TradeCategory;
  status: RFQStatus;
  quoteDeadline: string;
  awardedVendorId?: string;
  awardedQuotationId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Populated by getRFQ (detail endpoint) */
  deliverables?: RFQDeliverable[];
  /** Populated by getRFQ (detail endpoint) */
  quotations?: VendorQuotation[];
}

export interface RFQListItem {
  id: string;
  rfqNumber: string;
  title: string;
  status: RFQStatus;
  tradeCategory: TradeCategory;
  quoteDeadline: string;
  vendorsInvitedCount: number;
  quotesReceivedCount: number;
}

export interface RFQDeliverable {
  id: string;
  rfqId: string;
  description: string;
  qty: number;
  unit: string;
  estimatedUnitPrice?: number;
  sequenceNumber: number;
}

export interface QuotationLineItem {
  id: string;
  quotationId: string;
  deliverableId: string;
  unitPrice: number;
  amount: number;
  notes?: string;
}

export interface VendorQuotation {
  id: string;
  rfqId: string;
  vendorId: string;
  vendorName: string;
  status: QuotationStatus;
  totalAmount: number;
  warrantyInfo?: string;
  deliveryDate?: string;
  notes?: string;
  lineItems: QuotationLineItem[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// BE-RFQ-06: Bid comparison — deliverables as rows, vendor quotes as columns

export interface BidComparisonCell {
  quotationId: string;
  lineItemId: string;
  unitPrice: number;
  amount: number;
  notes?: string;
}

export interface BidComparisonRow {
  deliverable: RFQDeliverable;
  /** Keyed by vendorQuotation.id */
  cells: Record<string, BidComparisonCell>;
}

export interface BidComparison {
  rfqId: string;
  /** Ordered list of quotation headers (columns) */
  quotations: Pick<
    VendorQuotation,
    "id" | "vendorId" | "vendorName" | "status" | "totalAmount" | "deliveryDate" | "warrantyInfo"
  >[];
  /** One row per deliverable */
  rows: BidComparisonRow[];
  /** Totals row keyed by quotation id */
  totals: Record<string, number>;
  generatedAt: string;
}

// Request payloads

export interface RFQCreateRequest {
  projectId: string;
  title: string;
  description: string;
  tradeCategory: TradeCategory;
  quoteDeadline: string;
  deliverables: Omit<RFQDeliverable, "id" | "rfqId">[];
  vendorIds?: string[];
}

export interface RFQUpdateRequest {
  title?: string;
  description?: string;
  tradeCategory?: TradeCategory;
  status?: RFQStatus;
  quoteDeadline?: string;
  awardedVendorId?: string;
  awardedQuotationId?: string;
  deliverables?: Omit<RFQDeliverable, "rfqId">[];
  vendorIds?: string[];
}
