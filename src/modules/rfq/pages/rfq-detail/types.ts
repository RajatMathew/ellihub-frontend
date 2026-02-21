// ---------------------------------------------------------------------------
// Shared types for the RFQ detail page
// ---------------------------------------------------------------------------

export type VendorStatus = 'QUOTED' | 'WAITING' | 'DECLINED';

export interface VendorRow {
  id: string;
  name: string;
  email: string;
  status: VendorStatus;
  quoteAmount: number | null;
  leadTime: string | null;
}

export interface RfqDetail {
  rfqNumber: string;
  title: string;
  status: 'PUBLISHED';
  tradeCategory: string;
  issueDate: string;
  responseDue: string;
  createdBy: { name: string; role: string; initials: string };
  projectName: string;
  projectId: string;
  notice: string;
  vendorsInvited: number;
  quotesReceived: number;
  lowestQuote: number;
}
