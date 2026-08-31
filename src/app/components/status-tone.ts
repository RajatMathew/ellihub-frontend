/**
 * What a status *means*, separately from what it is called.
 *
 * Five modules were each maintaining their own status → badge-variant map, with
 * overlapping vocabularies and different fallbacks. The tone is the shared idea;
 * the vocabulary below is the shared translation.
 *
 * Its own module because `StatusBadge` is a component, and a component file that
 * also exports functions breaks fast refresh.
 */
export type StatusTone = 'neutral' | 'active' | 'info' | 'positive' | 'caution' | 'negative';

/**
 * The shared vocabulary, normalised — case, spaces, hyphens and underscores are
 * stripped before lookup, so `Pending Approval`, `PENDING_APPROVAL` and
 * `pendingApproval` all land in the same place.
 */
const TONE_BY_STATUS: Record<string, StatusTone> = {
  ACTIVE: 'positive',
  APPROVED: 'positive',
  AWARDED: 'positive',
  COMPLETE: 'positive',
  COMPLETED: 'positive',
  CONNECTED: 'positive',
  DONE: 'positive',
  ENABLED: 'positive',
  PAID: 'positive',
  SUCCESS: 'positive',
  SYNCED: 'positive',

  DELIVERED: 'positive',

  // In flight: handed to the other side, nothing owed back yet. Distinct from
  // `active`, which is work still on our side, and from `caution`, which is
  // waiting on someone. The per-module maps all painted these `info`.
  ISSUED: 'info',
  SENT: 'info',
  SUBMITTED: 'info',

  EVALUATION: 'caution',
  PARTIALLYPAID: 'caution',
  INREVIEW: 'caution',
  ONHOLD: 'caution',
  PARTIAL: 'caution',
  PENDING: 'caution',
  PENDINGAPPROVAL: 'caution',
  PENDINGREVISION: 'caution',
  PROCESSING: 'caution',
  REQUESTED: 'caution',
  REVIEW: 'caution',
  WAITING: 'caution',

  CANCELED: 'negative',
  CANCELLED: 'negative',
  DISCONNECTED: 'negative',
  ERROR: 'negative',
  EXPIRED: 'negative',
  FAILED: 'negative',
  OVERDUE: 'negative',
  REJECTED: 'negative',

  INPROGRESS: 'active',
  OPEN: 'active',
  PUBLISHED: 'active',
  // A draft is a record someone is working on, not one that has been put away.
  // It reads as live for the same reason `OPEN` does. The per-module maps this
  // vocabulary absorbed all said `primary` here, which is what `active` renders.
  DRAFT: 'active',

  // Explicit rather than defaulted: these are known statuses that genuinely mean
  // "nothing has happened yet", not statuses the vocabulary failed to recognise.
  ARCHIVED: 'neutral',
  CLOSED: 'neutral',
  INACTIVE: 'neutral',
  NEW: 'neutral',
  // Withdrawn rather than failed — nothing went wrong, so it does not take the
  // negative tone that `REJECTED` and `CANCELLED` do. Every module map agreed.
  VOID: 'neutral',
  VOIDED: 'neutral',
};

function normalise(status: string): string {
  return status.replace(/[\s_-]+/g, '').toUpperCase();
}

/**
 * The tone for a status, falling back to `neutral`.
 *
 * `overrides` is for a module whose vocabulary genuinely differs — a status that
 * reads as a warning in one domain and a success in another. Prefer extending
 * the shared map when the meaning is the same everywhere.
 */
export function statusTone(
  status: string | null | undefined,
  overrides?: Record<string, StatusTone>
): StatusTone {
  if (!status) return 'neutral';

  const key = normalise(status);

  return overrides?.[status] ?? overrides?.[key] ?? TONE_BY_STATUS[key] ?? 'neutral';
}

/** `PENDING_APPROVAL` → `Pending Approval`. Leaves already-cased labels alone. */
export function humaniseStatus(status: string): string {
  if (/[a-z]/.test(status) && !status.includes('_')) return status;

  return status
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
