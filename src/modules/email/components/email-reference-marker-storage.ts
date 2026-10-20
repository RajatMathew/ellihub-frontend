import type { EntityReference } from '@/app/components/entity-reference-marker-storage';

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

/**
 * Whose court a thread is in.
 *
 * `unset` is the state a thread starts in, and it is a real value rather than
 * an absence: the API reports it for a conversation nobody has filed, and the
 * court menu writes it back when a reader clears a court they set by mistake.
 *
 * It exists because `open` used to stand in for both. Every message in the
 * mailbox, back to the first one ever synced, therefore arrived carrying a red
 * "Open" pill that nobody had chosen — so the pill could not distinguish a
 * thread waiting on an answer from one no human had looked at.
 */
export type EmailThreadState = 'unset' | 'open' | 'open_our_court' | 'open_their_court' | 'closed';

/**
 * How a state reads on a pill. `unset` is phrased as the action, not the
 * state — on the one control that can change it, "Set court" is what the
 * reader is being offered. The menu spells the state out instead; see
 * `COURT_MENU_LABELS` in `email-reference-marker-parts.tsx`.
 */
export const EMAIL_THREAD_STATE_LABELS: Record<EmailThreadState, string> = {
  unset: 'Set court',
  open: 'Open',
  open_our_court: 'Our court',
  open_their_court: 'Their court',
  closed: 'Closed',
};

/**
 * The three colours a court is drawn in: needs an answer, settled, and nobody
 * has said. The third is the one this replaced a boolean to get — `unset` is
 * not closed, but drawing it as open was the bug.
 */
export type EmailThreadStateTone = 'unset' | 'open' | 'closed';

export const emailThreadStateTone = (state: EmailThreadState): EmailThreadStateTone => {
  if (state === 'unset') return 'unset';
  return state === 'closed' ? 'closed' : 'open';
};

/**
 * The court a row or thread actually has. The API always sends a `status`, but
 * a cache entry written by an older client may not, and the pin path builds a
 * classification of its own — so the absence resolves here, once, rather than
 * as a `?? 'open'` at each call site. That fallback is what made the old
 * default so hard to remove.
 */
export const resolveEmailThreadState = (
  status: EmailThreadState | null | undefined
): EmailThreadState => status ?? 'unset';

/** Whether anyone has given this thread a court. */
export const isEmailThreadStateSet = (state: EmailThreadState) => state !== 'unset';

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
  status: 'unset',
  references: [],
};
