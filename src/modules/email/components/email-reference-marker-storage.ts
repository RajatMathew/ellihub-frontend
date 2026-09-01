export type EmailReferenceType =
  | 'project'
  | 'rfq'
  | 'rfi'
  | 'purchaseOrder'
  | 'changeOrder'
  | 'invoice'
  | 'other';

export type EmailReferenceEntityType =
  | 'project'
  | 'rfq'
  | 'purchaseOrder'
  | 'primeChangeOrder'
  | 'subChangeOrder'
  | 'invoice';

export type EmailThreadState = 'open' | 'open_our_court' | 'open_their_court' | 'closed';

export const EMAIL_THREAD_STATE_LABELS: Record<EmailThreadState, string> = {
  open: 'Open',
  open_our_court: 'Our court',
  open_their_court: 'Their court',
  closed: 'Closed',
};

export const isOpenEmailThreadState = (state: EmailThreadState) => state !== 'closed';

export type EmailThreadAssigneeInfo = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type EmailReference = {
  id?: string;
  type: EmailReferenceType;
  entityType?: EmailReferenceEntityType | null;
  entityId?: string | null;
  label: string;
  sortOrder?: number;
};

export type EmailReferenceMarkerState = {
  id?: string | null;
  conversationKey: string;
  threadId?: string | null;
  status: EmailThreadState;
  assignedTo?: EmailThreadAssigneeInfo | null;
  references: EmailReference[];
};

export type EmailReferenceOption = {
  type: EmailReferenceType;
  entityType: EmailReferenceEntityType | null;
  entityId: string | null;
  label: string;
  meta: string | null;
};

export const EMPTY_EMAIL_REFERENCE_MARKER_STATE: EmailReferenceMarkerState = {
  id: null,
  conversationKey: '',
  threadId: null,
  status: 'open',
  references: [],
};

export const EMAIL_REFERENCE_TYPES: Array<{
  type: EmailReferenceType;
  label: string;
  placeholder: string;
}> = [
  { type: 'project', label: 'Project', placeholder: 'Search projects' },
  { type: 'rfq', label: 'RFQ', placeholder: 'Search RFQs' },
  { type: 'rfi', label: 'RFI', placeholder: 'RFI-112' },
  { type: 'purchaseOrder', label: 'PO', placeholder: 'Search purchase orders' },
  { type: 'changeOrder', label: 'CO', placeholder: 'Search change orders' },
  { type: 'invoice', label: 'Invoice', placeholder: 'Search invoices' },
  { type: 'other', label: 'Other', placeholder: 'Other' },
];
