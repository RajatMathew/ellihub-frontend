/**
 * The generic project/RFQ/RFI/PO/CO/invoice/"Other" tagging types moved to
 * `@/app/components/entity-reference-marker-storage` so Tasks can share them
 * instead of duplicating this file — these are kept as aliases so every
 * existing `Email...` import in this module keeps working unchanged. Thread
 * open/closed status (below) is a genuinely email-specific concept and stays
 * here.
 */
export type {
  EntityReferenceType as EmailReferenceType,
  EntityReferenceEntityType as EmailReferenceEntityType,
  EntityReference as EmailReference,
  EntityReferenceOption as EmailReferenceOption,
} from '@/app/components/entity-reference-marker-storage';
export { ENTITY_REFERENCE_CATEGORIES as EMAIL_REFERENCE_TYPES } from '@/app/components/entity-reference-marker-storage';

import type { EntityReference } from '@/app/components/entity-reference-marker-storage';

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

export type EmailReferenceMarkerState = {
  id?: string | null;
  conversationKey: string;
  threadId?: string | null;
  status: EmailThreadState;
  assignedTo?: EmailThreadAssigneeInfo | null;
  references: EntityReference[];
};

export const EMPTY_EMAIL_REFERENCE_MARKER_STATE: EmailReferenceMarkerState = {
  id: null,
  conversationKey: '',
  threadId: null,
  status: 'open',
  references: [],
};
