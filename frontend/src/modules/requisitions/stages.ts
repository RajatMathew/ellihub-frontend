// The six monthly requisition stages (Draft → Paid). This is the pipeline.
// "Hold" and "Past due" are FLAGS, not stages — they layer on top and can
// coexist with any stage. This matters: a req can be Final and past-due.
export type Stage =
  | 'draft'
  | 'pencil'
  | 'returned'
  | 'final'
  | 'approved'
  | 'paid';

export type Flag = 'hold' | 'pastDue';

export const STAGE_ORDER: Stage[] = [
  'draft',
  'pencil',
  'returned',
  'final',
  'approved',
  'paid',
];

export const STAGE_META: Record<Stage, { label: string; tone: 'neutral' | 'warning' | 'clay' | 'primary' | 'success' | 'ok' }> = {
  draft:     { label: 'Draft',            tone: 'neutral' },
  pencil:    { label: 'Pencil — with GC', tone: 'warning' },
  returned:  { label: 'Returned by GC',   tone: 'clay'    },
  final:     { label: 'Final — submitted',tone: 'primary' },
  approved:  { label: 'Approved',         tone: 'success' },
  paid:      { label: 'Paid',             tone: 'ok'      },
};

export const FLAG_META: Record<Flag, { label: string; tone: 'warning' | 'danger' }> = {
  hold:    { label: 'On hold',   tone: 'warning' },
  pastDue: { label: 'Past due',  tone: 'danger'  },
};

// The four SOV states — this is a separate small pipeline that gates billing.
export type SovStatus =
  | 'draft'
  | 'sent'
  | 'markedUp'
  | 'resubmitted'
  | 'approved';

export const SOV_STATUS_META: Record<SovStatus, { label: string; tone: 'neutral' | 'warning' | 'clay' | 'primary' | 'success' }> = {
  draft:       { label: 'Draft',              tone: 'neutral' },
  sent:        { label: 'Sent to GC',         tone: 'primary' },
  markedUp:    { label: 'Marked up by GC',    tone: 'clay'    },
  resubmitted: { label: 'Resubmitted',        tone: 'warning' },
  approved:    { label: 'Approved · locked',  tone: 'success' },
};

// The three document-record states — the row lifecycle in the ledger.
export type DocStatus = 'missing' | 'received' | 'filed';

export const DOC_STATUS_META: Record<DocStatus, { label: string; tone: 'danger' | 'warning' | 'success' }> = {
  missing:  { label: 'Missing',  tone: 'danger'  },
  received: { label: 'Received', tone: 'warning' },
  filed:    { label: 'Filed',    tone: 'success' },
};

// Change Order lifecycle — Elli → GC, the ones that ADD to Elli's contract
// value and therefore create a new SOV revision that flows into future
// monthly requisitions. Not to be confused with SCOs (Elli → sub, which
// belong to the vendor's file, not Elli's monthly billing).
export type CoStatus =
  | 'draft'
  | 'submitted'
  | 'inReview'
  | 'partiallyExecuted'
  | 'approved'
  | 'rejected';

export const CO_STATUS_ORDER: CoStatus[] = [
  'draft',
  'submitted',
  'inReview',
  'partiallyExecuted',
  'approved',
  'rejected',
];

export const CO_STATUS_META: Record<CoStatus, { label: string; tone: 'neutral' | 'primary' | 'warning' | 'clay' | 'success' | 'danger' }> = {
  draft:             { label: 'Draft',              tone: 'neutral' },
  submitted:         { label: 'Submitted to GC',    tone: 'primary' },
  inReview:          { label: 'In GC review',       tone: 'warning' },
  partiallyExecuted: { label: 'Partially executed', tone: 'clay'    },
  approved:          { label: 'Approved · flows to SOV', tone: 'success' },
  rejected:          { label: 'Rejected',           tone: 'danger'  },
};

// Project lifecycle — the four buckets of the project registry. A project
// moves Onboarding → Active on its first pencil, Active → Fully billed when
// the contract is 100% billed, Fully billed → Archived once retention is paid.
export type Lifecycle = 'onboarding' | 'active' | 'fullyBilled' | 'archived';

export const LIFECYCLE_ORDER: Lifecycle[] = ['onboarding', 'active', 'fullyBilled', 'archived'];

export const LIFECYCLE_META: Record<Lifecycle, { label: string; tone: 'neutral' | 'warning' | 'primary' | 'success'; hint: string }> = {
  onboarding:  { label: 'Onboarding',   tone: 'warning', hint: 'Set up before the first requisition goes out' },
  active:      { label: 'Active',       tone: 'primary', hint: 'Billing monthly' },
  fullyBilled: { label: 'Fully billed', tone: 'success', hint: '100% billed — collect and close out' },
  archived:    { label: 'Archived',     tone: 'neutral', hint: 'Paid in full, retention released' },
};

// Close-out — the one next step on a fully billed project.
export type CloseoutStep = 'waitingForPayment' | 'billRetention' | 'archive';

export const CLOSEOUT_META: Record<CloseoutStep, { label: string; tone: 'warning' | 'primary' | 'success' }> = {
  waitingForPayment: { label: 'Waiting for payment', tone: 'warning' },
  billRetention:     { label: 'Bill for retention',  tone: 'primary' },
  archive:           { label: 'Archive project',     tone: 'success' },
};
