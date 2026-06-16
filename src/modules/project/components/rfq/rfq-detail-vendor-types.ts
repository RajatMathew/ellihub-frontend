import type { RFQInvite, RFQQuote } from '@/modules/project/schemas/rfq';

export interface RfqPurchaseOrderLink {
  id: string;
  vendorId?: string | null;
}

export interface RFQVendorRowModel {
  invite: RFQInvite;
  vendorId?: string;
  vendorName: string;
  vendorEmail?: string | null;
  declined: boolean;
  hasQuote: boolean;
  quote?: RFQQuote;
  grandTotal?: number | null;
  isVendorAwarded: boolean;
  purchaseOrder?: RfqPurchaseOrderLink;
  leadTime?: string | null;
  emailSentAt?: string | null;
}

export interface RFQDetailVendorsCardProps {
  invites: RFQInvite[];
  quotes: RFQQuote[];
  purchaseOrders?: RfqPurchaseOrderLink[] | null;
  awardedVendorId?: string | null;
  isTerminal: boolean;
  isPublished: boolean;
  isEvaluation: boolean;
  isAwarded: boolean;
  isGeneratingVendorPdf: boolean;
  canManageVendors: boolean;
  canManageQuotes: boolean;
  canAwardQuotes: boolean;
  canUnawardQuotes: boolean;
  canCreatePurchaseOrder: boolean;
  canEmailVendors: boolean;
  onInviteVendor: () => void;
  onOpenQuote: (inviteId: string, vendorId: string, quoteId?: string, viewOnly?: boolean) => void;
  onGenerateVendorPdf: (inviteId: string, vendorName: string) => void;
  onEmailVendor: (inviteId: string) => void;
  onAwardQuote: (quoteId: string) => void;
  onUnaward: () => void;
  onGeneratePO: () => void;
  onRemoveQuote: (quoteId: string) => void;
  onRemoveVendor: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
}

export interface RFQVendorActionContext extends Pick<
  RFQDetailVendorsCardProps,
  | 'onOpenQuote'
  | 'onGenerateVendorPdf'
  | 'onEmailVendor'
  | 'onAwardQuote'
  | 'onUnaward'
  | 'onGeneratePO'
  | 'onRemoveQuote'
  | 'onRemoveVendor'
  | 'onDeclineInvite'
> {
  isPublished: boolean;
  isEvaluation: boolean;
  isAwarded: boolean;
  isGeneratingVendorPdf: boolean;
  canManageVendors: boolean;
  canManageQuotes: boolean;
  canAwardQuotes: boolean;
  canUnawardQuotes: boolean;
  canCreatePurchaseOrder: boolean;
  canEmailVendors: boolean;
}
