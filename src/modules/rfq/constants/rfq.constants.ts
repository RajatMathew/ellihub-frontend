import { RFQStatus, TradeCategory, type RFQListItem, type RfqDetail, type VendorRow } from '../types';

// ---------------------------------------------------------------------------
// List page constants
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;

export const SORT_OPTIONS = ['rfqNumber', 'title', 'quoteDeadline', 'status', 'createdAt'] as const;
export type SortField = (typeof SORT_OPTIONS)[number];

export const STATUS_LABELS: Record<string, string> = {
  [RFQStatus.DRAFT]: 'Draft',
  [RFQStatus.PUBLISHED]: 'Open',
  [RFQStatus.CLOSED]: 'Open',
  [RFQStatus.AWARDED]: 'Awarded',
  [RFQStatus.CANCELLED]: 'Cancelled',
};

export const STATUS_BADGE_VARIANT: Record<
  string,
  'secondary' | 'primary' | 'warning' | 'success' | 'destructive' | 'info'
> = {
  [RFQStatus.DRAFT]: 'secondary',
  [RFQStatus.PUBLISHED]: 'info',
  [RFQStatus.CLOSED]: 'warning',
  [RFQStatus.AWARDED]: 'success',
  [RFQStatus.CANCELLED]: 'destructive',
};

export const STATUS_BADGE_APPEARANCE: Record<string, 'default' | 'light' | 'outline' | 'ghost'> = {
  [RFQStatus.DRAFT]: 'outline',
  [RFQStatus.PUBLISHED]: 'light',
  [RFQStatus.CLOSED]: 'light',
  [RFQStatus.AWARDED]: 'light',
  [RFQStatus.CANCELLED]: 'light',
};

export const TRADE_CATEGORY_LABELS: Record<string, string> = {
  [TradeCategory.ELECTRICAL]: 'Electrical',
  [TradeCategory.PLUMBING]: 'Plumbing',
  [TradeCategory.HVAC]: 'HVAC',
  [TradeCategory.CARPENTRY]: 'Carpentry',
  [TradeCategory.MASONRY]: 'Masonry',
  [TradeCategory.PAINTING]: 'Painting',
  [TradeCategory.ROOFING]: 'Roofing',
  [TradeCategory.LANDSCAPING]: 'Landscaping',
  [TradeCategory.GENERAL_CONSTRUCTION]: 'General Construction',
  [TradeCategory.MECHANICAL]: 'Mechanical',
  [TradeCategory.CIVIL]: 'Civil',
  [TradeCategory.OTHER]: 'Other',
  MATERIAL: 'Material',
  FABRICATION: 'Fabrication',
  INSTALLATION: 'Installation',
};

export const TRACK_TABS = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'FABRICATION', label: 'Fabrication' },
  { value: 'INSTALLATION', label: 'Installation' },
] as const;
export type TrackFilter = (typeof TRACK_TABS)[number]['value'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isSortField(v: string | null): v is SortField {
  return SORT_OPTIONS.includes(v as SortField);
}

export function isValidStatus(v: string | null): v is string {
  return Object.values(RFQStatus).includes(v as never);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Mock / Hardcoded data (temporary)
// ---------------------------------------------------------------------------

export type MockRFQItem = RFQListItem & { awardedVendorName?: string };

export const HARDCODED_RFQS: MockRFQItem[] = [
  {
    id: '1',
    rfqNumber: '2025-101',
    title: 'Exterior Door Hardware Package',
    tradeCategory: 'MATERIAL' as TradeCategory,
    status: RFQStatus.AWARDED,
    quoteDeadline: '2025-02-15',
    vendorsInvitedCount: 3,
    quotesReceivedCount: 3,
    awardedVendorName: 'Mid-Island Doors',
  },
  {
    id: '2',
    rfqNumber: '2025-102',
    title: 'Custom Steel Door Frames',
    tradeCategory: 'FABRICATION' as TradeCategory,
    status: RFQStatus.PUBLISHED,
    quoteDeadline: '2025-02-28',
    vendorsInvitedCount: 5,
    quotesReceivedCount: 2,
  },
  {
    id: '3',
    rfqNumber: '2025-103',
    title: 'Glazing & Storefront Systems',
    tradeCategory: 'INSTALLATION' as TradeCategory,
    status: RFQStatus.PUBLISHED,
    quoteDeadline: '2025-03-10',
    vendorsInvitedCount: 2,
    quotesReceivedCount: 0,
  },
  {
    id: '4',
    rfqNumber: '2025-104',
    title: 'Pantry Millwork & Countertops',
    tradeCategory: 'FABRICATION' as TradeCategory,
    status: RFQStatus.PUBLISHED,
    quoteDeadline: '2025-02-10',
    vendorsInvitedCount: 4,
    quotesReceivedCount: 1,
  },
  {
    id: '5',
    rfqNumber: '2025-105',
    title: 'Acoustic Baffles - Auditorium',
    tradeCategory: 'MATERIAL' as TradeCategory,
    status: RFQStatus.DRAFT,
    quoteDeadline: '2025-03-01',
    vendorsInvitedCount: 0,
    quotesReceivedCount: 0,
  },
];

export const MOCK_RFQ: RfqDetail = {
  rfqNumber: '2025-001',
  title: 'Custom Millwork Package - Computer Lab Casework',
  status: 'PUBLISHED',
  tradeCategory: 'FABRICATION',
  issueDate: '2025-01-08',
  responseDue: '2025-02-10',
  createdBy: { name: 'John Martinez', role: 'ASSISTANT PM', initials: 'JM' },
  projectName: 'P.S. 397B',
  projectId: '14120 • SCA',
  notice: 'AWI Premium Grade required. Lead time critical.',
  vendorsInvited: 4,
  quotesReceived: 2,
  lowestQuote: 58792.5,
};

export const MOCK_VENDORS: VendorRow[] = [
  {
    id: '1',
    name: 'Mid-Island Millwork',
    email: 'quotes@midislandmillwork.com',
    status: 'QUOTED',
    quoteAmount: 58792.5,
    leadTime: '6 weeks',
  },
  {
    id: '2',
    name: 'Brooklyn Cabinet Co.',
    email: 'bid@brooklyncabinet.com',
    status: 'QUOTED',
    quoteAmount: 63400.0,
    leadTime: '8 weeks',
  },
  {
    id: '3',
    name: 'Queens Wood Products',
    email: 'info@queenswood.com',
    status: 'WAITING',
    quoteAmount: null,
    leadTime: null,
  },
  {
    id: '4',
    name: 'Metro Casework Inc.',
    email: 'rfq@metrocasework.com',
    status: 'DECLINED',
    quoteAmount: null,
    leadTime: null,
  },
];

export const MOCK_ATTACHMENTS = [
  { id: '1', name: 'RFQ-2025-001-Drawings.pdf', size: '2.4 MB' },
  { id: '2', name: 'Casework-Specs-AWI-Premium.pdf', size: '1.1 MB' },
];

export const MOCK_DELIVERABLES = [
  { id: '1', description: 'Instructor Station - Type L1', unit: 'EA', qty: 2 },
  { id: '2', description: 'Student Workstation - Type S4', unit: 'EA', qty: 12 },
  { id: '3', description: 'Storage Cabinet - Type C2 (Tall)', unit: 'EA', qty: 6 },
  { id: '4', description: 'Solid Surface Countertop - Black Pearl', unit: 'LF', qty: 112 },
  { id: '5', description: 'Hardware Kit (Premium Grade)', unit: 'SET', qty: 40 },
];
