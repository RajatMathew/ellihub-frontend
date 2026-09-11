import type { Stage, Flag, SovStatus, DocStatus, CoStatus, Lifecycle } from './stages';

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────
export type TeamId = 'PL' | 'LO' | 'TB' | 'AC' | 'CA' | 'MI' | 'EV';

// Who at the GC gets what. One contact can carry several routes.
export type ContactRoute = 'requisition' | 'changeOrder' | 'documents' | 'payment';

export const CONTACT_ROUTE_META: Record<ContactRoute, { label: string }> = {
  requisition: { label: 'Requisitions' },
  changeOrder: { label: 'Change orders' },
  documents:   { label: 'Documents' },
  payment:     { label: 'Payment chase' },
};

export interface GcContact {
  id: string;
  name: string;
  role: string;                 // "Project Manager", "Billing Manager"
  email: string;
  phone?: string;
  routes: ContactRoute[];
}

// Per-project billing calendar. Every GC has its own rhythm — this is what
// the derived tasks read instead of a hardcoded 15th.
export interface BillingSchedule {
  startRule: 'secondMonday' | 'firstOfMonth' | number;  // when we start the month's requisition (number = day of month)
  dueDay: number;               // GC's due day for the pencil copy (15, 25 …)
  internalLeadDays: number;     // internal due = GC due − this many days
  netDays: number;              // payment terms in days (Net 45 → 45)
}

// Billing that happened before this system (or in Siteline). One lump so
// the project's totals are right without importing 30 old pay apps.
export interface PriorBilling {
  through: string;              // "2026-02" — last month covered
  billed: number;
  paid: number;
  retentionHeld: number;
  note: string;                 // "Pay apps #1–#29 billed in Siteline"
}

export interface Project {
  id: string;
  name: string;
  gc: string;
  gcProjectNumber?: string;     // GC's own job number, "#30600"
  contractValue: number;        // original contract — approved COs are added on top
  paymentTerms: string;         // "Net 60" (display) — billing.netDays is what the math uses
  channel: 'EMAIL' | 'TEXTURA' | 'SITELINE' | 'PROCORE';
  owner: TeamId;
  lifecycle: Lifecycle;         // onboarding · active · fullyBilled · archived
  retainagePct: number;         // 10 for most, 5 for Hollis — the G702 default
  billing: BillingSchedule;
  contacts: GcContact[];
  notes?: string;               // project bulletin — shown on every requisition
  priorBilling?: PriorBilling;
  archivedAt?: string;
}

export interface SovLine {
  id: string;
  code: string;                 // free text — GC dictates ("2-101", "L2-Rm214", "Labor")
  description: string;
  scheduled: number;
  groupId?: string;             // optional grouping — free (Floor 2 / Room 214 / Labor)
}

export interface SovGroup {
  id: string;
  label: string;                // "Floor 2", "Kitchen 214", "Labor", "Material"
}

export interface Sov {
  projectId: string;
  rev: number;                  // 1, 2, 3 — increments on each Sent
  status: SovStatus;
  source: 'excel-upload' | 'built-in-app';
  groups: SovGroup[];
  lines: SovLine[];
  sentAt?: string;
  approvedAt?: string;
  history: SovHistoryEntry[];
  fileUri?: string;             // "/reqs/489-state-street/SOV.xlsx"
  fileName?: string;
  fileSizeKb?: number;
}

export interface SovHistoryEntry {
  at: string;                   // ISO
  status: SovStatus;
  by: TeamId | 'system';
  note?: string;
}

export interface Requisition {
  id: string;
  projectId: string;
  month: string;                // "2026-07"
  seq: number;                  // #4, #5 — sequential per project
  amount: number;               // scheduled billing this month
  pctComplete?: number;         // 0-100 · rolled up from the SCA G702 file (optional in seed; UI falls back to stage-derived default)
  linePcts?: Record<string, number>;  // per-SOV-line cumulative % complete (0-100) — the column edited each month
  retainagePct?: number;        // usually 10; per-project override lives here if the GC uses a different %
  stage: Stage;
  flags: Flag[];                // never [] semantically — but stored as array
  history: ReqHistoryEntry[];
  linkedEmailThreadIds: string[];
  fileUri?: string;             // e.g. "/reqs/489-state-street/REQ-001.xlsx"
  fileName?: string;            // "REQ-001.xlsx"
  lineStored?: Record<string, number>;  // G702 column F — $ of material stored (not yet installed) per SOV line, to date
  storedTotal?: number;         // Σ lineStored — rolled up on save
  isRetentionBill?: boolean;    // the final "release retention" requisition on a fully billed job
  paidVia?: 'check' | 'ach' | 'textura' | 'procore';
}

export interface ReqHistoryEntry {
  at: string;
  stage: Stage;
  by: TeamId | 'system';
  cause?: string;               // "email t-boyland" or "manual"
}

// A Requirement is the TEMPLATE — the rule of what MUST ride with every
// month's final. Set once per project.
export interface DocRequirement {
  id: string;
  projectId: string;
  owner: 'us' | 'vendor';       // ours or a vendor's paperwork
  vendorName?: string;          // only when owner === 'vendor'
  form: string;                 // "Unconditional Lien Waiver", "CPR WE {week}", "MWBE Monthly"
  order: number;                // sort within project
  cadence?: 'monthly' | 'oneTime';  // monthly (default) rides with every req; oneTime (COI, W-9) is filed once and expires
}

// A DocRecord is the LEDGER row — instance of a requirement for a specific
// month. Same row appears on the requisition's checklist AND in the ledger.
export interface DocRecord {
  id: string;
  projectId: string;
  month: string;                // "2026-07"
  requirementId: string;
  status: DocStatus;
  filedAt?: string;
  fileUri?: string;             // where it landed in OneDrive (mock string for demo)
  sourceEmailId?: string;       // if it came in on requisitions@
  expiresOn?: string;           // oneTime docs only — COI expiry etc.
}

// A month we deliberately did not bill. One click on the pipeline cell.
export interface SkippedMonth {
  projectId: string;
  month: string;                // "2026-06"
  by: TeamId;
  at: string;
  reason?: string;
}

// Change Order (Elli → GC). Once approved, adds a line to the project's SOV
// and its amount rolls into the NEXT month's requisition amount.
// SCOs (Elli → sub) live on the vendor's record, not here.
export interface ChangeOrder {
  id: string;
  projectId: string;
  number: string;               // "CO#003" / "CO#004" / "CO#005"
  gcNumber?: string;            // GC's own code, e.g. "30600-0003"
  title: string;
  trigger: 'ASI' | 'field-mod' | 'AWP' | 'owner-directive' | 'code' | 'VE';
  triggerRef?: string;          // "ASI-22", "AK International cabinet mod"
  status: CoStatus;
  amount: number;               // +add or -deduct against contract value
  daysAdded?: number;           // schedule impact
  dateSubmitted?: string;
  dateApproved?: string;
  approvedBy?: string;          // "Gilbane / DDC"
  fileUri?: string;             // "/reqs/489-state-street/CO-003.pdf"
  fileName?: string;
  linkedReqId?: string;         // which req it first flows into
  history: CoHistoryEntry[];
}

export interface CoHistoryEntry {
  at: string;
  status: CoStatus;
  by: TeamId | 'system';
  note?: string;
}

// Photos — the physical evidence bundle (stored materials with project
// labels, sign-in sheets, jobsite condition shots). One row per photo file;
// grouped by project + category + optional month.
export type PhotoCategory =
  | 'stored-material'
  | 'project-label'
  | 'sign-in-sheet'
  | 'jobsite'
  | 'delivery'
  | 'other';

export const PHOTO_CATEGORY_META: Record<PhotoCategory, { label: string }> = {
  'stored-material': { label: 'Stored material' },
  'project-label':   { label: 'Project label'   },
  'sign-in-sheet':   { label: 'Sign-in sheet'   },
  'jobsite':         { label: 'Jobsite'         },
  'delivery':        { label: 'Delivery'        },
  'other':           { label: 'Other'           },
};

export interface Photo {
  id: string;
  projectId: string;
  category: PhotoCategory;
  month?: string;               // if tied to a specific req month
  caption: string;
  takenAt: string;              // ISO date
  fileUri: string;              // "/reqs/489-state-street/photos/stored-plywood-1.jpg"
  fileName: string;
  linkedRequirementId?: string; // e.g. links to "Pictures of Stored Materials" requirement
}

// ────────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────────
// Contact names/emails are placeholders (.example) — real ones come from the
// directory when Cofount wires persistence.
export const PROJECTS: Project[] = [
  // ── Onboarding ──────────────────────────────────────────────────────
  { id: '489-state', name: '489 State Street — School', gc: 'Hunter Roberts Construction', gcProjectNumber: 'HRC-24-118',
    contractValue: 996000, paymentTerms: 'Net 60', channel: 'EMAIL', owner: 'TB', lifecycle: 'onboarding', retainagePct: 10,
    billing: { startRule: 'secondMonday', dueDay: 25, internalLeadDays: 5, netDays: 60 },
    contacts: [
      { id: 'c-489-pm', name: 'Hunter Roberts PM desk', role: 'Project Manager', email: 'pm@hunterroberts.example', routes: ['requisition', 'changeOrder'] },
    ],
    notes: 'SCA job — bill on the SCA G702 workbook. Pencil to the PM by the 25th; final after markups.' },
  { id: 'ps508', name: 'PS 508Q — Casework', gc: 'SCA / Dematteis',
    contractValue: 420000, paymentTerms: 'Net 60', channel: 'PROCORE', owner: 'PL', lifecycle: 'onboarding', retainagePct: 10,
    billing: { startRule: 'firstOfMonth', dueDay: 15, internalLeadDays: 3, netDays: 60 },
    contacts: [] },

  // ── Active ──────────────────────────────────────────────────────────
  { id: 'hollis', name: 'Hollis Library Interior Renovation', gc: 'Stalco Construction, Inc.', gcProjectNumber: 'STC-2308',
    contractValue: 290000, paymentTerms: 'Net 60', channel: 'EMAIL', owner: 'LO', lifecycle: 'active', retainagePct: 5,
    billing: { startRule: 'firstOfMonth', dueDay: 15, internalLeadDays: 3, netDays: 60 },
    contacts: [
      { id: 'c-hollis-pm', name: 'Stalco PM desk', role: 'Project Manager', email: 'pm@stalco.example', routes: ['requisition', 'changeOrder', 'documents'] },
      { id: 'c-hollis-ap', name: 'Stalco accounts payable', role: 'Accounts Payable', email: 'ap@stalco.example', routes: ['payment'] },
    ],
    notes: 'Retention is 5% (not 10). MWBE report rides with every final.' },
  { id: 'boyland', name: 'Boyland Community Center — DDC', gc: 'Gilbane Building Company', gcProjectNumber: '#30600',
    contractValue: 2870000, paymentTerms: 'Net 45', channel: 'TEXTURA', owner: 'LO', lifecycle: 'active', retainagePct: 10,
    billing: { startRule: 'secondMonday', dueDay: 25, internalLeadDays: 5, netDays: 45 },
    contacts: [
      { id: 'c-boy-pm', name: 'Gilbane PM desk', role: 'Project Manager', email: 'pm@gilbane.example', routes: ['requisition', 'changeOrder'] },
      { id: 'c-boy-pa', name: 'Gilbane project accounting', role: 'Project Accountant', email: 'accounting@gilbane.example', routes: ['documents', 'payment'] },
    ],
    notes: 'Submit through Textura. Stored materials billed monthly — bailment, bill of sale, and photos ride with every final. DDC releases payment to Gilbane first; expect 60+ days.' },
  { id: 'sinai', name: 'Mount Sinai Tisch Cancer Hospital', gc: 'Gilbane Building Company',
    contractValue: 1240000, paymentTerms: 'Net 45', channel: 'TEXTURA', owner: 'LO', lifecycle: 'active', retainagePct: 10,
    billing: { startRule: 'secondMonday', dueDay: 20, internalLeadDays: 5, netDays: 45 },
    contacts: [
      { id: 'c-sinai-pm', name: 'Gilbane PM desk', role: 'Project Manager', email: 'pm.sinai@gilbane.example', routes: ['requisition', 'changeOrder', 'documents', 'payment'] },
    ],
    notes: 'Lien waiver signed inside Textura — no wet signature.' },
  { id: 'dcas', name: 'DCAS — Monthly Package', gc: 'Technico Construction',
    contractValue: 680000, paymentTerms: 'Net 30', channel: 'EMAIL', owner: 'EV', lifecycle: 'active', retainagePct: 10,
    billing: { startRule: 'firstOfMonth', dueDay: 10, internalLeadDays: 3, netDays: 30 },
    contacts: [
      { id: 'c-dcas-pm', name: 'Technico PM desk', role: 'Project Manager', email: 'pm@technico.example', routes: ['requisition', 'changeOrder'] },
      { id: 'c-dcas-bm', name: 'Technico billing', role: 'Billing Manager', email: 'billing@technico.example', routes: ['documents', 'payment'] },
    ],
    notes: 'DCAS package due the 10th — MWBE + SACS counts every month, no exceptions.' },
  { id: 'hiphop', name: 'The Hip Hop Museum', gc: 'JRM Construction',
    contractValue: 550000, paymentTerms: 'Net 45', channel: 'TEXTURA', owner: 'MI', lifecycle: 'active', retainagePct: 10,
    billing: { startRule: 'secondMonday', dueDay: 25, internalLeadDays: 5, netDays: 45 },
    contacts: [
      { id: 'c-hhm-pm', name: 'JRM PM desk', role: 'Project Manager', email: 'pm@jrm.example', routes: ['requisition', 'changeOrder', 'documents', 'payment'] },
    ] },
  { id: 'sa', name: 'Success Academy', gc: 'Dematteis',
    contractValue: 320000, paymentTerms: 'Net 30', channel: 'EMAIL', owner: 'LO', lifecycle: 'active', retainagePct: 10,
    billing: { startRule: 'firstOfMonth', dueDay: 15, internalLeadDays: 3, netDays: 30 },
    contacts: [
      { id: 'c-sa-pm', name: 'Dematteis PM desk', role: 'Project Manager', email: 'pm@dematteis.example', routes: ['requisition', 'changeOrder', 'documents', 'payment'] },
    ] },

  // ── Fully billed ────────────────────────────────────────────────────
  { id: 'kings', name: 'Kings County Civil Court', gc: 'Technico Construction', gcProjectNumber: 'TCS-1904',
    contractValue: 2633600, paymentTerms: 'Net 90', channel: 'EMAIL', owner: 'MI', lifecycle: 'fullyBilled', retainagePct: 5,
    billing: { startRule: 'firstOfMonth', dueDay: 10, internalLeadDays: 3, netDays: 90 },
    contacts: [
      { id: 'c-kings-pm', name: 'Technico PM desk', role: 'Project Manager', email: 'pm.kings@technico.example', routes: ['requisition', 'changeOrder'] },
      { id: 'c-kings-bm', name: 'Technico billing', role: 'Billing Manager', email: 'billing@technico.example', routes: ['documents', 'payment'] },
    ],
    priorBilling: { through: '2026-02', billed: 2387238.46, paid: 2387238.46, retentionHeld: 119361.92, note: 'Pay apps #1–#29 billed and paid before ELLI Hub (Siteline)' },
    notes: 'Net 90 — chase at day 75. Retention 5% billed on final acceptance.' },

  // ── Archived ────────────────────────────────────────────────────────
  { id: 'jfk-t6', name: 'JFK Terminal 6 — Cathay Lounge', gc: 'AECOM Tishman',
    contractValue: 410000, paymentTerms: 'Net 60', channel: 'PROCORE', owner: 'PL', lifecycle: 'archived', retainagePct: 10,
    billing: { startRule: 'firstOfMonth', dueDay: 20, internalLeadDays: 5, netDays: 60 },
    contacts: [],
    priorBilling: { through: '2026-02', billed: 410000, paid: 410000, retentionHeld: 0, note: 'Fully paid · retention released 2026-03' },
    archivedAt: '2026-03-31' },
];

export const SOVS: Sov[] = [
  {
    projectId: '489-state', rev: 1, status: 'approved',
    source: 'excel-upload', sentAt: '2025-10-07', approvedAt: '2025-11-04',
    fileUri: '/reqs/489-state-street/SOV.xlsx',
    fileName: 'SOV.xlsx',
    fileSizeKb: 36,
    groups: [
      { id: 'g1', label: 'Prelims (Shop Dwg / Submittals / Mock-up / Mobilization)' },
      { id: 'g2', label: 'Cellar' },
      { id: 'g3', label: 'Floors 1–4' },
    ],
    lines: [
      { id: 'l1',  code: '06200', description: 'Shop Drawings',      scheduled:  50000, groupId: 'g1' },
      { id: 'l2',  code: '06200', description: 'Submittals / Samples', scheduled: 26000, groupId: 'g1' },
      { id: 'l3',  code: '06200', description: 'Mock Up Room',       scheduled:  14000, groupId: 'g1' },
      { id: 'l4',  code: '06200', description: 'Shop Mobilization',  scheduled:  18000, groupId: 'g1' },
      { id: 'l5',  code: '06200', description: 'Field Mobilization', scheduled:   8000, groupId: 'g1' },
      { id: 'l6',  code: '06200', description: 'Cellar: Stage / Proscenium Wood — Material', scheduled: 36000, groupId: 'g2' },
      { id: 'l7',  code: '06200', description: 'Cellar: Stage / Proscenium Wood — Labor',    scheduled: 14000, groupId: 'g2' },
      { id: 'l8',  code: '06410', description: 'Cellar: Lavatory Countertops + Bench + all floors casework (see file for full 132-row breakdown)', scheduled: 830000, groupId: 'g3' },
    ],
    history: [
      { at: '2025-10-07', status: 'sent',     by: 'TB' },
      { at: '2025-11-04', status: 'approved', by: 'system' },
    ],
  },
  {
    projectId: 'hollis', rev: 1, status: 'approved',
    source: 'excel-upload', sentAt: '2026-03-10', approvedAt: '2026-03-24',
    groups: [
      { id: 'g1', label: 'General Scope' },
      { id: 'g2', label: 'Mobilization + Closeout' },
    ],
    lines: [
      { id: 'l1', code: '1',  description: 'Shop Drawings and Submittals', scheduled: 14000, groupId: 'g2' },
      { id: 'l2', code: '2',  description: 'Shop Mobilization',            scheduled:  6000, groupId: 'g2' },
      { id: 'l3', code: '3',  description: 'Field Mobilization',           scheduled:  5000, groupId: 'g2' },
      { id: 'l4', code: '4',  description: 'Punchlist — Closeout',         scheduled:  5000, groupId: 'g2' },
      { id: 'l5', code: '5M', description: 'Customer Service Desk — Material', scheduled: 75000, groupId: 'g1' },
      { id: 'l6', code: '5L', description: 'Customer Service Desk — Labor',    scheduled:  7000, groupId: 'g1' },
      { id: 'l7', code: '6M', description: "Children's Librarian Desk — Material", scheduled: 28000, groupId: 'g1' },
      { id: 'l8', code: '6L', description: "Children's Librarian Desk — Labor",    scheduled:  5000, groupId: 'g1' },
      { id: 'l9', code: '7M', description: 'Multi-purpose Room — Material', scheduled: 20000, groupId: 'g1' },
      { id: 'l10',code: '7L', description: 'Multi-purpose Room — Labor',    scheduled:  3000, groupId: 'g1' },
      { id: 'l11',code: '8',  description: 'Solid Surface Windowsills',     scheduled:  9000, groupId: 'g1' },
      { id: 'l12',code: '9',  description: 'Balance — remaining scope',     scheduled:113000, groupId: 'g1' },
    ],
    history: [
      { at: '2026-03-10', status: 'sent',        by: 'LO' },
      { at: '2026-03-16', status: 'markedUp',    by: 'system', note: 'Stalco returned with % adjustments on lines 5-7' },
      { at: '2026-03-20', status: 'resubmitted', by: 'LO' },
      { at: '2026-03-24', status: 'approved',    by: 'system' },
    ],
  },
  {
    projectId: 'boyland', rev: 2, status: 'approved',
    source: 'built-in-app', sentAt: '2026-01-14', approvedAt: '2026-02-05',
    groups: [
      { id: 'g1', label: 'Floor 1' },
      { id: 'g2', label: 'Floor 2' },
      { id: 'g3', label: 'Floor 3' },
      { id: 'g4', label: 'Common areas' },
    ],
    lines: [
      { id: 'l1', code: 'F1-M',  description: 'Floor 1 casework — Material', scheduled: 620000, groupId: 'g1' },
      { id: 'l2', code: 'F1-L',  description: 'Floor 1 casework — Labor',    scheduled: 190000, groupId: 'g1' },
      { id: 'l3', code: 'F2-M',  description: 'Floor 2 casework — Material', scheduled: 480000, groupId: 'g2' },
      { id: 'l4', code: 'F2-L',  description: 'Floor 2 casework — Labor',    scheduled: 145000, groupId: 'g2' },
      { id: 'l5', code: 'F3-M',  description: 'Floor 3 casework — Material', scheduled: 520000, groupId: 'g3' },
      { id: 'l6', code: 'F3-L',  description: 'Floor 3 casework — Labor',    scheduled: 155000, groupId: 'g3' },
      { id: 'l7', code: 'CA-M',  description: 'Common areas — Material',     scheduled: 480000, groupId: 'g4' },
      { id: 'l8', code: 'CA-L',  description: 'Common areas — Labor',        scheduled: 145000, groupId: 'g4' },
      { id: 'l9', code: 'MOB',   description: 'Mobilization + closeout',     scheduled: 135000, groupId: 'g4' },
    ],
    history: [
      { at: '2026-01-14', status: 'sent',        by: 'LO' },
      { at: '2026-01-22', status: 'markedUp',    by: 'system', note: 'Gilbane requested Floor 2/3 split' },
      { at: '2026-01-30', status: 'resubmitted', by: 'LO' },
      { at: '2026-02-05', status: 'approved',    by: 'system' },
    ],
  },
  {
    projectId: 'sinai', rev: 1, status: 'approved',
    source: 'excel-upload', sentAt: '2026-04-01', approvedAt: '2026-04-18',
    groups: [
      { id: 'g1', label: 'Room-by-room' },
      { id: 'g2', label: 'Corridors + support' },
    ],
    lines: [
      { id: 'l1', code: 'Rm-2101', description: 'Room 2101 — nurse station',  scheduled: 145000, groupId: 'g1' },
      { id: 'l2', code: 'Rm-2103', description: 'Room 2103 — treatment',      scheduled:  92000, groupId: 'g1' },
      { id: 'l3', code: 'Rm-2110', description: 'Room 2110 — treatment',      scheduled:  92000, groupId: 'g1' },
      { id: 'l4', code: 'Rm-2115', description: 'Room 2115 — treatment',      scheduled:  92000, groupId: 'g1' },
      { id: 'l5', code: 'CORR-2',  description: 'Level 2 corridor casework',  scheduled: 240000, groupId: 'g2' },
      { id: 'l6', code: 'CORR-3',  description: 'Level 3 corridor casework',  scheduled: 240000, groupId: 'g2' },
      { id: 'l7', code: 'SUPP',    description: 'Supporting scope + closeout',scheduled: 339000, groupId: 'g2' },
    ],
    history: [
      { at: '2026-04-01', status: 'sent',        by: 'LO' },
      { at: '2026-04-10', status: 'markedUp',    by: 'system' },
      { at: '2026-04-15', status: 'resubmitted', by: 'LO' },
      { at: '2026-04-18', status: 'approved',    by: 'system' },
    ],
  },
  {
    projectId: 'sa', rev: 1, status: 'markedUp',
    source: 'built-in-app', sentAt: '2026-07-08',
    groups: [{ id: 'g1', label: 'Casework' }],
    lines: [
      { id: 'l1', code: '1', description: 'Classroom casework — 12 rooms', scheduled: 240000, groupId: 'g1' },
      { id: 'l2', code: '2', description: 'Admin office casework',         scheduled:  60000, groupId: 'g1' },
      { id: 'l3', code: '3', description: 'Mobilization + closeout',       scheduled:  20000, groupId: 'g1' },
    ],
    history: [
      { at: '2026-07-08', status: 'sent',     by: 'LO' },
      { at: '2026-07-14', status: 'markedUp', by: 'system', note: 'Pat sent revised % on classroom casework' },
    ],
  },
  {
    projectId: 'ps508', rev: 1, status: 'draft',
    source: 'built-in-app',
    groups: [{ id: 'g1', label: 'Draft build-up' }],
    lines: [
      { id: 'l1', code: 'DRAFT', description: 'Draft SOV pending Peter review', scheduled: 420000, groupId: 'g1' },
    ],
    history: [],
  },
  {
    projectId: 'dcas', rev: 1, status: 'approved',
    source: 'excel-upload', sentAt: '2025-11-04', approvedAt: '2025-11-18',
    groups: [{ id: 'g1', label: 'DCAS scope' }],
    lines: [
      { id: 'l1', code: '1', description: 'DCAS millwork package', scheduled: 680000, groupId: 'g1' },
    ],
    history: [{ at: '2025-11-18', status: 'approved', by: 'system' }],
  },
  {
    projectId: 'hiphop', rev: 1, status: 'approved',
    source: 'excel-upload', sentAt: '2025-09-20', approvedAt: '2025-10-02',
    groups: [{ id: 'g1', label: 'Hip Hop Museum' }],
    lines: [
      { id: 'l1', code: '1', description: 'Museum casework + display', scheduled: 550000, groupId: 'g1' },
    ],
    history: [{ at: '2025-10-02', status: 'approved', by: 'system' }],
  },
];

// TODAY anchor for the demo (matches mailbox convention). Requisitions module
// uses "2026-07" as the current cycle month.
export const CURRENT_MONTH = '2026-07';

export const REQUISITIONS: Requisition[] = [
  // 489 State Street — real file from Peter's Downloads. Req #001 is the SOV
  // with all percentages at 0 (initial state). Sub-approval is Draft (has not
  // gone out yet).
  { id: 'r-489-01',  projectId: '489-state', month: '2026-01', seq: 1,  amount:      0,   pctComplete:  0, stage: 'draft',    flags: [], history: [{ at: '2026-01-15', stage: 'draft', by: 'TB' }], linkedEmailThreadIds: [],
    fileUri: '/reqs/489-state-street/REQ-001.xlsx', fileName: 'REQ-001.xlsx' },

  // Hollis — approved earlier months, current at Pencil
  { id: 'r-hollis-05', projectId: 'hollis', month: '2026-07', seq: 5, amount: 25840, stage: 'pencil',   flags: [],           history: [{ at: '2026-07-11', stage: 'draft', by: 'AC' }, { at: '2026-07-12', stage: 'pencil', by: 'TB' }], linkedEmailThreadIds: [] },
  { id: 'r-hollis-04', projectId: 'hollis', month: '2026-06', seq: 4, amount: 32100, stage: 'paid',     flags: [],           history: [{ at: '2026-06-15', stage: 'pencil', by: 'TB' }, { at: '2026-06-24', stage: 'approved', by: 'system' }, { at: '2026-07-05', stage: 'paid', by: 'system' }], linkedEmailThreadIds: [] },
  { id: 'r-hollis-03', projectId: 'hollis', month: '2026-05', seq: 3, amount: 41200, stage: 'paid',     flags: [],           history: [{ at: '2026-06-01', stage: 'paid', by: 'system' }], linkedEmailThreadIds: [] },
  // Boyland — big month, Returned + almost past-due
  { id: 'r-boyland-38', projectId: 'boyland', month: '2026-07', seq: 38, amount: 367854, stage: 'returned', flags: [],       history: [{ at: '2026-07-01', stage: 'pencil', by: 'LO' }, { at: '2026-07-08', stage: 'returned', by: 'system', cause: 'email t-boyland' }], linkedEmailThreadIds: ['t-boyland'] },
  { id: 'r-boyland-37', projectId: 'boyland', month: '2026-06', seq: 37, amount: 412000, stage: 'paid',     flags: [],       history: [{ at: '2026-06-12', stage: 'pencil', by: 'LO' }, { at: '2026-06-24', stage: 'final', by: 'LO' }, { at: '2026-07-05', stage: 'paid', by: 'system', cause: 'Textura' }], linkedEmailThreadIds: [] },
  // Boyland April + May — approved in Textura, money not in yet (the real pattern: DDC pays Gilbane first)
  { id: 'r-boyland-36', projectId: 'boyland', month: '2026-05', seq: 36, amount: 271688, stage: 'approved', flags: [],       history: [{ at: '2026-05-14', stage: 'pencil', by: 'LO' }, { at: '2026-05-22', stage: 'final', by: 'LO' }, { at: '2026-06-03', stage: 'approved', by: 'system', cause: 'Textura' }], linkedEmailThreadIds: [] },
  { id: 'r-boyland-35', projectId: 'boyland', month: '2026-04', seq: 35, amount: 133237, stage: 'approved', flags: [],       history: [{ at: '2026-04-14', stage: 'pencil', by: 'LO' }, { at: '2026-04-24', stage: 'final', by: 'LO' }, { at: '2026-05-06', stage: 'approved', by: 'system', cause: 'Textura' }], linkedEmailThreadIds: [] },
  // Mount Sinai — approved, awaiting lien waiver signature
  { id: 'r-sinai-04',  projectId: 'sinai',   month: '2026-07', seq:  4, amount:  46812, stage: 'approved', flags: [],        history: [{ at: '2026-07-02', stage: 'approved', by: 'system' }], linkedEmailThreadIds: ['t-sinai'] },
  { id: 'r-sinai-03',  projectId: 'sinai',   month: '2026-06', seq:  3, amount:  52400, stage: 'paid',     flags: [],        history: [], linkedEmailThreadIds: [] },
  // DCAS — draft package assembled
  { id: 'r-dcas-jun',  projectId: 'dcas',    month: '2026-07', seq:  8, amount:  41220, stage: 'draft',    flags: [],        history: [{ at: '2026-07-06', stage: 'draft', by: 'EV' }], linkedEmailThreadIds: ['t-dcas'] },
  // Hip Hop Museum — Final, on hold for docs
  { id: 'r-hhm-18',    projectId: 'hiphop',  month: '2026-07', seq: 18, amount: 112480, stage: 'final',    flags: ['hold'],  history: [{ at: '2026-07-04', stage: 'final', by: 'MI' }], linkedEmailThreadIds: ['t-hiphop'] },
  // Success Academy — awaiting revised
  { id: 'r-sa-jun',    projectId: 'sa',      month: '2026-07', seq:  6, amount:  38240, stage: 'returned', flags: [],        history: [{ at: '2026-07-09', stage: 'returned', by: 'system', cause: 'email t-sa' }], linkedEmailThreadIds: ['t-sa'] },
  // Kings County Civil Court — fully billed. #1–#29 are in priorBilling; these
  // three close the contract. #31/#32 are out on Net 90 — the close-out step
  // reads "Waiting for payment" until they land, then "Bill for retention".
  { id: 'r-kings-32',  projectId: 'kings',   month: '2026-06', seq: 32, amount: 157947.61, stage: 'approved', flags: [],     history: [{ at: '2026-06-10', stage: 'final', by: 'MI' }, { at: '2026-06-20', stage: 'approved', by: 'system' }], linkedEmailThreadIds: [] },
  { id: 'r-kings-31',  projectId: 'kings',   month: '2026-04', seq: 31, amount:  19025.51, stage: 'approved', flags: [],     history: [{ at: '2026-04-02', stage: 'final', by: 'MI' }, { at: '2026-04-16', stage: 'approved', by: 'system' }], linkedEmailThreadIds: [] },
  { id: 'r-kings-30',  projectId: 'kings',   month: '2026-03', seq: 30, amount:  69388.42, stage: 'paid',     flags: [],     history: [{ at: '2026-03-04', stage: 'final', by: 'MI' }, { at: '2026-03-18', stage: 'approved', by: 'system' }, { at: '2026-06-01', stage: 'paid', by: 'system', cause: 'check' }], linkedEmailThreadIds: [] },
];

// Per-project TEMPLATE of required forms. Set once at job start.
export const DOC_REQUIREMENTS: DocRequirement[] = [
  // Hollis (Stalco) — ours only, no installer visible
  { id: 'dr-hollis-1', projectId: 'hollis',  owner: 'us',     form: 'Unconditional Lien Waiver — Elli', order: 1 },
  { id: 'dr-hollis-2', projectId: 'hollis',  owner: 'us',     form: 'MWBE Monthly Report',              order: 2 },
  // Boyland (Gilbane) — includes installer
  { id: 'dr-boy-1',    projectId: 'boyland', owner: 'us',     form: 'Unconditional Lien Waiver — Elli', order: 1 },
  { id: 'dr-boy-2',    projectId: 'boyland', owner: 'vendor', vendorName: 'Ridgewood Install',           form: 'Unconditional Lien Waiver — Ridgewood', order: 2 },
  { id: 'dr-boy-3',    projectId: 'boyland', owner: 'vendor', vendorName: 'Ridgewood Install',           form: 'CPR (weekly, month total)',              order: 3 },
  { id: 'dr-boy-4',    projectId: 'boyland', owner: 'us',     form: 'MWBE Monthly Report',              order: 4 },
  { id: 'dr-boy-5',    projectId: 'boyland', owner: 'us',     form: 'Stored Materials Log',             order: 5 },
  { id: 'dr-boy-6',    projectId: 'boyland', owner: 'us',     form: 'COI — Elli (annual)',              order: 6, cadence: 'oneTime' },
  // Mount Sinai (Gilbane) — ours + Textura sign
  { id: 'dr-sinai-1',  projectId: 'sinai',   owner: 'us',     form: 'Unconditional Lien Waiver — Elli (Textura sign)', order: 1 },
  { id: 'dr-sinai-2',  projectId: 'sinai',   owner: 'us',     form: 'Insurance Requirements Exhibit',   order: 2 },
  // DCAS (Technico) — heavy MWBE
  { id: 'dr-dcas-1',   projectId: 'dcas',    owner: 'us',     form: 'DCAS Monthly Package',             order: 1 },
  { id: 'dr-dcas-2',   projectId: 'dcas',    owner: 'us',     form: 'MWBE Monthly (DCAS format)',       order: 2 },
  { id: 'dr-dcas-3',   projectId: 'dcas',    owner: 'us',     form: 'SACS Worker Counts',               order: 3 },
  // Hip Hop Museum (JRM) — installer + COI
  { id: 'dr-hhm-1',    projectId: 'hiphop',  owner: 'us',     form: 'Unconditional Lien Waiver — Elli', order: 1 },
  { id: 'dr-hhm-2',    projectId: 'hiphop',  owner: 'vendor', vendorName: 'BK Tile',                     form: 'COI — BK Tile',                          order: 2, cadence: 'oneTime' },
  { id: 'dr-hhm-3',    projectId: 'hiphop',  owner: 'vendor', vendorName: 'BK Tile',                     form: "Workers' comp cert",                     order: 3, cadence: 'oneTime' },
  { id: 'dr-hhm-4',    projectId: 'hiphop',  owner: 'us',     form: 'Stored Materials Log',             order: 4 },
];

// Ledger — one record per (requirement × month). This seed reflects the state
// of July 2026 requisitions: some filed, some received, some missing.
export const DOC_RECORDS: DocRecord[] = [
  // Hollis July — clean
  { id: 'dc-1', projectId: 'hollis',  month: '2026-07', requirementId: 'dr-hollis-1', status: 'filed',    filedAt: '2026-07-10', fileUri: 'OneDrive://Hollis/2026-07/waiver.pdf' },
  { id: 'dc-2', projectId: 'hollis',  month: '2026-07', requirementId: 'dr-hollis-2', status: 'filed',    filedAt: '2026-07-10', fileUri: 'OneDrive://Hollis/2026-07/mwbe.pdf' },
  // Boyland July — installer missing docs (blocks final)
  { id: 'dc-3', projectId: 'boyland', month: '2026-07', requirementId: 'dr-boy-1',    status: 'received', filedAt: '2026-07-08' },
  { id: 'dc-4', projectId: 'boyland', month: '2026-07', requirementId: 'dr-boy-2',    status: 'missing' },
  { id: 'dc-5', projectId: 'boyland', month: '2026-07', requirementId: 'dr-boy-3',    status: 'missing' },
  { id: 'dc-6', projectId: 'boyland', month: '2026-07', requirementId: 'dr-boy-4',    status: 'filed',    filedAt: '2026-07-11', fileUri: 'OneDrive://Boyland/2026-07/mwbe.pdf' },
  { id: 'dc-7', projectId: 'boyland', month: '2026-07', requirementId: 'dr-boy-5',    status: 'filed',    filedAt: '2026-07-11', fileUri: 'OneDrive://Boyland/2026-07/stored.pdf' },
  // Sinai July — waiver pending sign (received but not filed = not fully done)
  { id: 'dc-8', projectId: 'sinai',   month: '2026-07', requirementId: 'dr-sinai-1',  status: 'received', filedAt: '2026-07-07' },
  { id: 'dc-9', projectId: 'sinai',   month: '2026-07', requirementId: 'dr-sinai-2',  status: 'filed',    filedAt: '2026-06-24', fileUri: 'OneDrive://Sinai/insurance.pdf' },
  // DCAS July — mostly done
  { id: 'dc-10',projectId: 'dcas',    month: '2026-07', requirementId: 'dr-dcas-1',   status: 'filed',    filedAt: '2026-07-08', fileUri: 'OneDrive://DCAS/2026-07/package.pdf' },
  { id: 'dc-11',projectId: 'dcas',    month: '2026-07', requirementId: 'dr-dcas-2',   status: 'filed',    filedAt: '2026-07-09', fileUri: 'OneDrive://DCAS/2026-07/mwbe.pdf' },
  { id: 'dc-12',projectId: 'dcas',    month: '2026-07', requirementId: 'dr-dcas-3',   status: 'received', filedAt: '2026-07-10' },
  // Hip Hop Museum July — hold: vendor certs expired
  { id: 'dc-13',projectId: 'hiphop',  month: '2026-07', requirementId: 'dr-hhm-1',    status: 'filed',    filedAt: '2026-07-04', fileUri: 'OneDrive://HHM/2026-07/waiver.pdf' },
  { id: 'dc-16',projectId: 'hiphop',  month: '2026-07', requirementId: 'dr-hhm-4',    status: 'filed',    filedAt: '2026-07-05', fileUri: 'OneDrive://HHM/2026-07/stored.pdf' },
  // One-time docs — filed once, valid until expiry. Boyland's COI is good to
  // Dec 3; BK Tile's COI expired Jun 30 — that is why Hip Hop is on hold.
  { id: 'dc-17',projectId: 'boyland', month: '2025-12', requirementId: 'dr-boy-6',    status: 'filed',    filedAt: '2025-12-03', expiresOn: '2026-12-03', fileUri: 'OneDrive://Boyland/Insurance/COI-2026.pdf' },
  { id: 'dc-18',projectId: 'hiphop',  month: '2025-07', requirementId: 'dr-hhm-2',    status: 'filed',    filedAt: '2025-06-28', expiresOn: '2026-06-30', fileUri: 'OneDrive://HHM/Insurance/BK-Tile-COI-2025.pdf' },
];

// Months we chose not to bill — the "Not billing this month" click.
export const SKIPPED_MONTHS: SkippedMonth[] = [
  { projectId: 'boyland', month: '2026-03', by: 'LO', at: '2026-03-09', reason: 'Waiting on ASI-22 pricing' },
  { projectId: 'sa',      month: '2026-06', by: 'LO', at: '2026-06-02', reason: 'No progress — SOV still marked up' },
  { projectId: 'dcas',    month: '2026-06', by: 'EV', at: '2026-06-01' },
];

// ────────────────────────────────────────────────────────────────────────
// Change Orders — seeded from the real Boyland examples Peter shared
// (COs #003 based on ASI-22, #004 cabinet mod via AK International,
// #005 AWP-1 material increase). Approved ones flow into the SOV.
// ────────────────────────────────────────────────────────────────────────
export const CHANGE_ORDERS: ChangeOrder[] = [
  {
    id: 'co-boy-002', projectId: 'boyland', number: 'CO#002', gcNumber: '30600-0002',
    title: 'Miscellaneous field changes through April 2026',
    trigger: 'field-mod', triggerRef: 'Various field directives',
    status: 'approved', amount: 18400, daysAdded: 0,
    dateSubmitted: '2026-04-08', dateApproved: '2026-04-22', approvedBy: 'Gilbane / DDC',
    fileUri: '/reqs/boyland/CO-002.pdf', fileName: 'SCO#2-Elli-Misc-Changes-Through-Apr-2026.pdf',
    history: [
      { at: '2026-04-08', status: 'submitted', by: 'TB' },
      { at: '2026-04-15', status: 'partiallyExecuted', by: 'system', note: 'Partial signatures received' },
      { at: '2026-04-22', status: 'approved', by: 'system' },
    ],
  },
  {
    id: 'co-boy-003', projectId: 'boyland', number: 'CO#003', gcNumber: '30600-0003',
    title: 'Change based on ASI-22 — corridor casework revision',
    trigger: 'ASI', triggerRef: 'ASI-22',
    status: 'approved', amount: 22180, daysAdded: 5,
    dateSubmitted: '2026-05-12', dateApproved: '2026-06-04', approvedBy: 'Gilbane / DDC',
    fileUri: '/reqs/boyland/CO-003-ASI-22.pdf', fileName: '2026-Change-Order-30600-0003-Based-on-ASI-22.pdf',
    history: [
      { at: '2026-05-12', status: 'submitted', by: 'TB' },
      { at: '2026-05-20', status: 'inReview', by: 'system' },
      { at: '2026-06-04', status: 'approved', by: 'system' },
    ],
  },
  {
    id: 'co-boy-004', projectId: 'boyland', number: 'CO#004', gcNumber: '30600-0004',
    title: 'Cabinet modification on site — AK International',
    trigger: 'field-mod', triggerRef: 'AK International RFI-014',
    status: 'partiallyExecuted', amount: 8940, daysAdded: 0,
    dateSubmitted: '2026-06-18', approvedBy: undefined,
    fileUri: '/reqs/boyland/CO-004-cabinet-mod.pdf', fileName: '2026-Change-Order-30600-0004-Modification-of-Cabinets-on-site-AK-International.pdf',
    history: [
      { at: '2026-06-18', status: 'submitted', by: 'TB' },
      { at: '2026-06-30', status: 'partiallyExecuted', by: 'system', note: 'PM signed, awaiting DDC' },
    ],
  },
  {
    id: 'co-boy-005', projectId: 'boyland', number: 'CO#005', gcNumber: '30600-0005',
    title: 'Increase in AWP-1 material scope',
    trigger: 'AWP', triggerRef: 'AWP-1',
    status: 'inReview', amount: 41200, daysAdded: 12,
    dateSubmitted: '2026-07-09',
    fileUri: '/reqs/boyland/CO-005-AWP-1.pdf', fileName: '2026-Change-Order-30600-0005-Increase-in-AWP-1-Material.pdf',
    history: [
      { at: '2026-07-09', status: 'submitted', by: 'TB' },
      { at: '2026-07-14', status: 'inReview', by: 'system' },
    ],
  },
  // Other projects — a couple to keep the pipeline lively
  {
    id: 'co-hollis-001', projectId: 'hollis', number: 'CO#001', gcNumber: 'STC-0011',
    title: 'Substitution — solid surface tops (VE)',
    trigger: 'VE', triggerRef: 'VE-03',
    status: 'approved', amount: -6200, daysAdded: 0,
    dateSubmitted: '2026-04-01', dateApproved: '2026-04-14', approvedBy: 'Stalco',
    fileUri: '/reqs/hollis/CO-001-ve.pdf', fileName: 'Hollis-CO-001-Solid-Surface-VE.pdf',
    history: [
      { at: '2026-04-01', status: 'submitted', by: 'LO' },
      { at: '2026-04-14', status: 'approved', by: 'system' },
    ],
  },
  {
    id: 'co-sinai-001', projectId: 'sinai', number: 'CO#001', gcNumber: 'MST-CCO-04',
    title: 'Additional treatment room casework — Room 2115',
    trigger: 'owner-directive', triggerRef: 'Owner directive 2026-06',
    status: 'draft', amount: 34500, daysAdded: 3,
    fileUri: '/reqs/sinai/CO-001-draft.pdf', fileName: 'Sinai-CO-001-Rm-2115-Casework.pdf',
    history: [
      { at: '2026-07-10', status: 'draft', by: 'AC' },
    ],
  },
];

// Photos — seeded from the real stored-material shots Peter shared plus
// the project labels that go on every stack of plywood.
export const PHOTOS: Photo[] = [
  {
    id: 'ph-boy-1', projectId: 'boyland', category: 'stored-material', month: '2026-06',
    caption: 'Hardwood plywood pallet in shop — awaiting install',
    takenAt: '2026-06-05', fileUri: '/reqs/boyland/photos/stored-plywood-1.jpg',
    fileName: 'stored-plywood-1.jpg', linkedRequirementId: 'dr-boy-5',
  },
  {
    id: 'ph-boy-2', projectId: 'boyland', category: 'project-label', month: '2026-06',
    caption: 'Elli NY Design label on hardwood — DDC Boyland CC',
    takenAt: '2026-06-05', fileUri: '/reqs/boyland/photos/project-label.jpg',
    fileName: 'project-label.jpg', linkedRequirementId: 'dr-boy-5',
  },
  {
    id: 'ph-boy-3', projectId: 'boyland', category: 'stored-material', month: '2026-07',
    caption: 'Second shipment — plywood next to forklift',
    takenAt: '2026-07-02', fileUri: '/reqs/boyland/photos/stored-plywood-2.jpg',
    fileName: 'stored-plywood-2.jpg', linkedRequirementId: 'dr-boy-5',
  },
  {
    id: 'ph-boy-4', projectId: 'boyland', category: 'delivery', month: '2026-07',
    caption: 'Casework crates staged — bay 3',
    takenAt: '2026-07-08', fileUri: '/reqs/boyland/photos/casework-crates.jpg',
    fileName: 'casework-crates.jpg',
  },
  {
    id: 'ph-hhm-1', projectId: 'hiphop', category: 'stored-material', month: '2026-07',
    caption: 'Stored millwork — display cabinets',
    takenAt: '2026-07-01', fileUri: '/reqs/hiphop/photos/display-cabinets.jpg',
    fileName: 'display-cabinets.jpg',
  },
];

// ────────────────────────────────────────────────────────────────────────
// Selectors — pure, called during render
// ────────────────────────────────────────────────────────────────────────
export function getChangeOrdersForProject(projectId: string): ChangeOrder[] {
  return CHANGE_ORDERS.filter(co => co.projectId === projectId);
}
export function getAllChangeOrdersByProject(): Map<string, ChangeOrder[]> {
  const m = new Map<string, ChangeOrder[]>();
  for (const co of CHANGE_ORDERS) {
    const arr = m.get(co.projectId) ?? [];
    arr.push(co);
    m.set(co.projectId, arr);
  }
  return m;
}
export function getApprovedCoValueForProject(projectId: string): number {
  return CHANGE_ORDERS
    .filter(co => co.projectId === projectId && co.status === 'approved')
    .reduce((s, co) => s + co.amount, 0);
}
export function getPendingCoValueForProject(projectId: string): number {
  return CHANGE_ORDERS
    .filter(co => co.projectId === projectId && (co.status === 'inReview' || co.status === 'submitted' || co.status === 'partiallyExecuted'))
    .reduce((s, co) => s + co.amount, 0);
}
export function getPhotosForProject(projectId: string, category?: PhotoCategory): Photo[] {
  return PHOTOS.filter(p => p.projectId === projectId && (!category || p.category === category));
}
// The prior-cumulative-% for a given SOV line as of `beforeMonth` — used
// by the G702 editor's "Total from Previous" column. Reads the most recent
// requisition for this project + line whose month is strictly before the one
// being edited, and returns its cumulative % (or 0 if none).
export function priorLinePct(projectId: string, lineId: string, beforeMonth: string): number {
  const priors = REQUISITIONS
    .filter(r => r.projectId === projectId && r.month < beforeMonth)
    .sort((a, b) => b.month.localeCompare(a.month));
  for (const r of priors) {
    const p = r.linePcts?.[lineId];
    if (typeof p === 'number') return p;
  }
  return 0;
}

// Same idea for stored material — the $ stored (G702 column F) on the most
// recent prior requisition for this line. Stored is a to-date balance: when
// the material is installed it moves out of F into "% completed".
export function priorLineStored(projectId: string, lineId: string, beforeMonth: string): number {
  const priors = REQUISITIONS
    .filter(r => r.projectId === projectId && r.month < beforeMonth)
    .sort((a, b) => b.month.localeCompare(a.month));
  for (const r of priors) {
    const s = r.lineStored?.[lineId];
    if (typeof s === 'number') return s;
  }
  return 0;
}

// Save the per-line % Completed (and optionally $ stored) for a requisition.
// Recomputes the aggregate amount from SOV × line math — this period's work
// (Δ% × scheduled) plus this period's change in stored material. That is
// what lands in the G702 certificate's "current payment due" before retainage.
export function saveReqLinePcts(
  reqId: string,
  linePcts: Record<string, number>,
  by: TeamId = 'AC',
  lineStored?: Record<string, number>,
) {
  const req = REQUISITIONS.find(r => r.id === reqId);
  if (!req) return;
  req.linePcts = { ...(req.linePcts ?? {}), ...linePcts };
  if (lineStored) req.lineStored = { ...(req.lineStored ?? {}), ...lineStored };
  const sov = SOVS.find(s => s.projectId === req.projectId);
  if (sov) {
    let total = 0;
    let stored = 0;
    let cumulativePct = 0;
    let cumulativeScheduled = 0;
    for (const line of sov.lines) {
      const thisPct = req.linePcts[line.id] ?? 0;
      const priorPct = priorLinePct(req.projectId, line.id, req.month);
      const delta = Math.max(0, thisPct - priorPct);
      total += line.scheduled * (delta / 100);
      const storedNow = req.lineStored?.[line.id] ?? 0;
      const storedPrior = priorLineStored(req.projectId, line.id, req.month);
      total += storedNow - storedPrior;
      stored += storedNow;
      cumulativePct += thisPct * line.scheduled;
      cumulativeScheduled += line.scheduled;
    }
    req.amount = Math.round(total * 100) / 100;
    req.storedTotal = Math.round(stored * 100) / 100;
    req.pctComplete = cumulativeScheduled > 0
      ? Math.round((cumulativePct / cumulativeScheduled) * 10) / 10
      : 0;
  }
  req.history.push({
    at: new Date().toISOString().slice(0, 10),
    stage: req.stage,
    by,
    cause: lineStored ? 'edited % completed + stored material' : 'edited % completed',
  });
  window.dispatchEvent(new Event('reqs-changed'));
}

// Create a new draft change order. Numbers auto-increment per project
// based on the highest existing CO number.
export function createDraftCo(input: {
  projectId: string;
  title: string;
  trigger: ChangeOrder['trigger'];
  triggerRef?: string;
  amount: number;
  daysAdded?: number;
  by?: TeamId;
}): ChangeOrder {
  const existing = CHANGE_ORDERS.filter(c => c.projectId === input.projectId);
  const nextSeq = existing.reduce((max, c) => {
    const n = parseInt((c.number.match(/\d+/) ?? ['0'])[0], 10);
    return Math.max(max, n);
  }, 0) + 1;
  const at = new Date().toISOString().slice(0, 10);
  const co: ChangeOrder = {
    id: `co-${input.projectId}-${Date.now()}`,
    projectId: input.projectId,
    number: `CO#${String(nextSeq).padStart(3, '0')}`,
    title: input.title,
    trigger: input.trigger,
    triggerRef: input.triggerRef,
    status: 'draft',
    amount: input.amount,
    daysAdded: input.daysAdded,
    history: [{ at, status: 'draft', by: input.by ?? 'AC' }],
  };
  CHANGE_ORDERS.push(co);
  window.dispatchEvent(new Event('reqs-changed'));
  return co;
}

export function advanceCoStatus(coId: string, next: CoStatus, by: TeamId | 'system' = 'AC', note?: string) {
  const co = CHANGE_ORDERS.find(c => c.id === coId);
  if (!co) return;
  co.status = next;
  if (next === 'approved') co.dateApproved = new Date().toISOString().slice(0, 10);
  co.history.push({ at: new Date().toISOString().slice(0, 10), status: next, by, note });
  window.dispatchEvent(new Event('reqs-changed'));
}

// ────────────────────────────────────────────────────────────────────────
// Original selectors continue below
// ────────────────────────────────────────────────────────────────────────
export function getProject(id: string): Project | undefined {
  return PROJECTS.find(p => p.id === id);
}
export function getSov(projectId: string): Sov | undefined {
  return SOVS.find(s => s.projectId === projectId);
}
export function getReqsForMonth(month: string): Requisition[] {
  return REQUISITIONS.filter(r => r.month === month);
}
export function getReqsForProject(projectId: string): Requisition[] {
  return REQUISITIONS.filter(r => r.projectId === projectId).sort((a, b) => b.seq - a.seq);
}
export function getReq(id: string): Requisition | undefined {
  return REQUISITIONS.find(r => r.id === id);
}
export function sovTotal(sov: Sov): number {
  return sov.lines.reduce((sum, l) => sum + l.scheduled, 0);
}
export function getRequirementsForProject(projectId: string): DocRequirement[] {
  return DOC_REQUIREMENTS.filter(r => r.projectId === projectId).sort((a, b) => a.order - b.order);
}
// One-time docs (COI, W-9) are not per month: the newest filed record counts
// for every requisition until it expires. Past expiry it reads as missing —
// with the expiry date carried so the UI can say "expired Jun 30".
export function latestOneTimeRecord(requirementId: string): DocRecord | undefined {
  return DOC_RECORDS
    .filter(dc => dc.requirementId === requirementId && dc.status === 'filed')
    .sort((a, b) => (b.filedAt ?? '').localeCompare(a.filedAt ?? ''))[0];
}

export function getRecordsForReq(req: Requisition): Array<{ requirement: DocRequirement; record: DocRecord }> {
  const requirements = getRequirementsForProject(req.projectId);
  return requirements.map(requirement => {
    if (requirement.cadence === 'oneTime') {
      const latest = latestOneTimeRecord(requirement.id);
      const valid = !!latest && (!latest.expiresOn || latest.expiresOn >= todayIso());
      const record: DocRecord = latest
        ? { ...latest, status: valid ? 'filed' : 'missing' }
        : { id: `${requirement.id}-once`, projectId: req.projectId, month: req.month, requirementId: requirement.id, status: 'missing' };
      return { requirement, record };
    }
    const record = DOC_RECORDS.find(dc => dc.requirementId === requirement.id && dc.month === req.month) ?? {
      id: `${requirement.id}-${req.month}`,
      projectId: req.projectId,
      month: req.month,
      requirementId: requirement.id,
      status: 'missing' as DocStatus,
    };
    return { requirement, record };
  });
}
export function missingDocsForReq(req: Requisition): number {
  return getRecordsForReq(req).filter(({ record }) => record.status !== 'filed').length;
}

export function pctForReq(req: Requisition): number {
  if (typeof req.pctComplete === 'number') return req.pctComplete;
  switch (req.stage) {
    case 'draft':    return 0;
    case 'pencil':   return 40;
    case 'returned': return 45;
    case 'final':    return 70;
    case 'approved': return 90;
    case 'paid':     return 100;
    default:         return 0;
  }
}

export function getAllReqsSortedByMonthDesc(projectId?: string): Requisition[] {
  return REQUISITIONS
    .filter(r => !projectId || r.projectId === projectId)
    .slice()
    .sort((a, b) => b.month.localeCompare(a.month) || b.seq - a.seq);
}

export function monthsOnFile(): string[] {
  const months = new Set<string>([...REQUISITIONS.map(r => r.month), ...SKIPPED_MONTHS.map(s => s.month), CURRENT_MONTH]);
  return Array.from(months).sort();
}

// ────────────────────────────────────────────────────────────────────────
// Mutations (in-memory; Cofount wires persistence)
// ────────────────────────────────────────────────────────────────────────
const bump = () => window.dispatchEvent(new Event('reqs-changed'));

export function advanceReqStage(reqId: string, next: Stage, by: TeamId | 'system' = 'AC', cause?: string) {
  const req = REQUISITIONS.find(r => r.id === reqId);
  if (!req) return;
  req.stage = next;
  req.history.push({ at: todayIso(), stage: next, by, cause });
  // First pencil out the door ends onboarding.
  const project = getProject(req.projectId);
  if (project && project.lifecycle === 'onboarding' && next !== 'draft') project.lifecycle = 'active';
  bump();
}

export function markReqPaid(reqId: string, via: NonNullable<Requisition['paidVia']> = 'check', by: TeamId | 'system' = 'AC') {
  const req = REQUISITIONS.find(r => r.id === reqId);
  if (!req) return;
  req.paidVia = via;
  advanceReqStage(reqId, 'paid', by, `paid via ${via}`);
}

export function toggleReqFlag(reqId: string, flag: Flag) {
  const req = REQUISITIONS.find(r => r.id === reqId);
  if (!req) return;
  const i = req.flags.indexOf(flag);
  if (i >= 0) req.flags.splice(i, 1);
  else req.flags.push(flag);
  bump();
}

export function markDocFiled(recordOrRequirementId: string, month: string, projectId: string, by: TeamId = 'AC') {
  const requirement = DOC_REQUIREMENTS.find(r => r.id === recordOrRequirementId);
  if (!requirement) return;
  const at = new Date().toISOString().slice(0, 10);
  if (requirement.cadence === 'oneTime') {
    // A fresh COI/W-9 — new record, good for a year from today
    DOC_RECORDS.push({
      id: `dc-${Date.now()}`,
      projectId,
      month,
      requirementId: requirement.id,
      status: 'filed',
      filedAt: at,
      expiresOn: addDays(at, 365),
      fileUri: `OneDrive://${projectId}/Insurance/${requirement.form.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    });
    void by;
    bump();
    return;
  }
  const existing = DOC_RECORDS.find(dc => dc.requirementId === requirement.id && dc.month === month);
  if (existing) {
    existing.status = 'filed';
    existing.filedAt = at;
    existing.fileUri = existing.fileUri ?? `OneDrive://${projectId}/${month}/${requirement.form.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  } else {
    DOC_RECORDS.push({
      id: `dc-${Date.now()}`,
      projectId,
      month,
      requirementId: requirement.id,
      status: 'filed',
      filedAt: at,
      fileUri: `OneDrive://${projectId}/${month}/${requirement.form.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    });
  }
  // Silence unused-var warning for the recorder role — logged when persistence lands
  void by;
  bump();
}

export function addRequirement(projectId: string, owner: 'us' | 'vendor', form: string, vendorName?: string, cadence: DocRequirement['cadence'] = 'monthly') {
  const order = 1 + DOC_REQUIREMENTS.filter(r => r.projectId === projectId).length;
  DOC_REQUIREMENTS.push({
    id: `dr-${Date.now()}`,
    projectId,
    owner,
    vendorName: owner === 'vendor' ? vendorName : undefined,
    form,
    order,
    cadence,
  });
  bump();
}

export function setRequirementCadence(requirementId: string, cadence: NonNullable<DocRequirement['cadence']>) {
  const r = DOC_REQUIREMENTS.find(x => x.id === requirementId);
  if (!r) return;
  r.cadence = cadence;
  bump();
}

export function removeRequirement(requirementId: string) {
  const i = DOC_REQUIREMENTS.findIndex(r => r.id === requirementId);
  if (i >= 0) DOC_REQUIREMENTS.splice(i, 1);
  bump();
}

// ────────────────────────────────────────────────────────────────────────
// Skip a month — "Not billing this month"
// ────────────────────────────────────────────────────────────────────────
export function getSkippedMonth(projectId: string, month: string): SkippedMonth | undefined {
  return SKIPPED_MONTHS.find(s => s.projectId === projectId && s.month === month);
}
export function isMonthSkipped(projectId: string, month: string): boolean {
  return !!getSkippedMonth(projectId, month);
}
// Returns false when a requisition already exists for that month.
export function skipMonth(projectId: string, month: string, by: TeamId = 'AC', reason?: string): boolean {
  if (getSkippedMonth(projectId, month)) return true;
  if (REQUISITIONS.some(r => r.projectId === projectId && r.month === month)) return false;
  SKIPPED_MONTHS.push({ projectId, month, by, at: todayIso(), reason });
  bump();
  return true;
}
export function unskipMonth(projectId: string, month: string) {
  const i = SKIPPED_MONTHS.findIndex(s => s.projectId === projectId && s.month === month);
  if (i >= 0) SKIPPED_MONTHS.splice(i, 1);
  bump();
}

// ────────────────────────────────────────────────────────────────────────
// Project registry mutations — lifecycle, contacts, notes, start billing
// ────────────────────────────────────────────────────────────────────────
export function setLifecycle(projectId: string, lifecycle: Lifecycle) {
  const p = getProject(projectId);
  if (!p) return;
  p.lifecycle = lifecycle;
  p.archivedAt = lifecycle === 'archived' ? todayIso() : undefined;
  bump();
}

// Create this month's draft requisition (the first one ends onboarding once
// it goes to pencil). Returns the req so the UI can open the G702 editor.
export function createDraftReq(projectId: string, month: string = CURRENT_MONTH, by: TeamId = 'AC'): Requisition {
  const existing = REQUISITIONS.find(r => r.projectId === projectId && r.month === month);
  if (existing) return existing;
  const seq = REQUISITIONS.filter(r => r.projectId === projectId).reduce((m, r) => Math.max(m, r.seq), 0) + 1;
  const req: Requisition = {
    id: `r-${projectId}-${month}`,
    projectId, month, seq,
    amount: 0,
    stage: 'draft', flags: [],
    history: [{ at: todayIso(), stage: 'draft', by }],
    linkedEmailThreadIds: [],
  };
  REQUISITIONS.push(req);
  unskipMonth(projectId, month);       // bumps
  return req;
}

// The last requisition on a fully billed job — bills the retention held.
export function createRetentionBill(projectId: string, amount: number, by: TeamId = 'AC'): Requisition {
  const existing = REQUISITIONS.find(r => r.projectId === projectId && r.isRetentionBill);
  if (existing) return existing;
  const seq = REQUISITIONS.filter(r => r.projectId === projectId).reduce((m, r) => Math.max(m, r.seq), 0) + 1;
  const req: Requisition = {
    id: `r-${projectId}-retention`,
    projectId, month: CURRENT_MONTH, seq,
    amount: Math.round(amount * 100) / 100,
    pctComplete: 100,
    stage: 'draft', flags: [],
    history: [{ at: todayIso(), stage: 'draft', by, cause: 'retention bill' }],
    linkedEmailThreadIds: [],
    isRetentionBill: true,
  };
  REQUISITIONS.push(req);
  bump();
  return req;
}

export function addContact(projectId: string, contact: Omit<GcContact, 'id'>): GcContact | undefined {
  const p = getProject(projectId);
  if (!p) return undefined;
  const c: GcContact = { ...contact, id: `c-${projectId}-${Date.now()}` };
  p.contacts.push(c);
  bump();
  return c;
}
export function removeContact(projectId: string, contactId: string) {
  const p = getProject(projectId);
  if (!p) return;
  const i = p.contacts.findIndex(c => c.id === contactId);
  if (i >= 0) p.contacts.splice(i, 1);
  bump();
}
export function toggleContactRoute(projectId: string, contactId: string, route: ContactRoute) {
  const c = getProject(projectId)?.contacts.find(x => x.id === contactId);
  if (!c) return;
  const i = c.routes.indexOf(route);
  if (i >= 0) c.routes.splice(i, 1);
  else c.routes.push(route);
  bump();
}
// Who gets this kind of thing on this project — first contact carrying the route.
export function contactFor(projectId: string, route: ContactRoute): GcContact | undefined {
  return getProject(projectId)?.contacts.find(c => c.routes.includes(route));
}
export function setProjectNotes(projectId: string, notes: string) {
  const p = getProject(projectId);
  if (!p) return;
  p.notes = notes.trim() || undefined;
  bump();
}
export function setRetainagePct(projectId: string, pct: number) {
  const p = getProject(projectId);
  if (!p) return;
  p.retainagePct = Math.max(0, Math.min(100, pct));
  bump();
}
export function setBillingSchedule(projectId: string, patch: Partial<BillingSchedule>) {
  const p = getProject(projectId);
  if (!p) return;
  p.billing = { ...p.billing, ...patch };
  bump();
}

// ────────────────────────────────────────────────────────────────────────
// Dates — billing calendar + aging. All ISO "YYYY-MM-DD"; "today" is the
// demo anchor (todayIso) so the numbers on screen stay stable.
// ────────────────────────────────────────────────────────────────────────
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoOf(y, m - 1, d + days);
}
export function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
function isoOf(y: number, mIndex: number, d: number): string {
  const dt = new Date(y, mIndex, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export interface BillingDates {
  start: string;                // when we start the month's requisition
  internalDue: string;          // our own deadline (GC due − lead days)
  gcDue: string;                // GC's due date for the pencil copy
}
export function billingDatesForMonth(project: Project, month: string): BillingDates {
  const [y, m] = month.split('-').map(Number);
  const mIndex = m - 1;
  const daysInMonth = new Date(y, m, 0).getDate();
  const rule = project.billing.startRule;
  let startDay: number;
  if (rule === 'firstOfMonth') startDay = 1;
  else if (rule === 'secondMonday') {
    const dow = new Date(y, mIndex, 1).getDay();      // 0 = Sun
    startDay = 1 + ((8 - dow) % 7) + 7;               // first Monday + 7
  } else startDay = Math.min(rule, daysInMonth);
  const gcDay = Math.min(project.billing.dueDay, daysInMonth);
  return {
    start: isoOf(y, mIndex, startDay),
    internalDue: isoOf(y, mIndex, gcDay - project.billing.internalLeadDays),
    gcDue: isoOf(y, mIndex, gcDay),
  };
}
export function startRuleLabel(rule: BillingSchedule['startRule']): string {
  if (rule === 'firstOfMonth') return '1st of the month';
  if (rule === 'secondMonday') return '2nd Monday';
  return `the ${rule}${ordinal(rule)}`;
}
function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

// When did the final go to the GC, when is the money due, how late is it.
export interface ReqAging {
  submittedOn?: string;         // first Final (or Approved) entry in history
  dueOn?: string;               // submittedOn + net days
  paidOn?: string;
  daysOut: number;              // days since submitted (or submitted → paid)
  daysLate: number;             // today − dueOn; 0 if not yet due or already paid
  predictedPaidOn?: string;     // submittedOn + this project's average days-to-paid (falls back to dueOn)
}
export function reqSubmittedOn(req: Requisition): string | undefined {
  return req.history.find(h => h.stage === 'final')?.at
    ?? req.history.find(h => h.stage === 'approved')?.at;
}
export function reqPaidOn(req: Requisition): string | undefined {
  return req.history.find(h => h.stage === 'paid')?.at;
}
export function avgDaysToPaid(projectId: string): number | undefined {
  const samples = REQUISITIONS
    .filter(r => r.projectId === projectId && r.stage === 'paid')
    .map(r => { const s = reqSubmittedOn(r); const p = reqPaidOn(r); return s && p ? daysBetween(s, p) : undefined; })
    .filter((n): n is number => typeof n === 'number' && n >= 0);
  if (!samples.length) return undefined;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}
export function reqAging(req: Requisition): ReqAging {
  const project = getProject(req.projectId);
  const submittedOn = reqSubmittedOn(req);
  const paidOn = reqPaidOn(req);
  if (!submittedOn || !project) return { submittedOn, paidOn, daysOut: 0, daysLate: 0 };
  const today = todayIso();
  const dueOn = addDays(submittedOn, project.billing.netDays);
  const avg = avgDaysToPaid(project.id);
  const open = req.stage === 'final' || req.stage === 'approved';
  return {
    submittedOn, dueOn, paidOn,
    daysOut: paidOn ? daysBetween(submittedOn, paidOn) : Math.max(0, daysBetween(submittedOn, today)),
    daysLate: open ? Math.max(0, daysBetween(dueOn, today)) : 0,
    predictedPaidOn: avg !== undefined ? addDays(submittedOn, avg) : dueOn,
  };
}
export function isReqPastDue(req: Requisition): boolean {
  return reqAging(req).daysLate > 0;
}
// Flags as the UI should show them: the manual ones plus the computed past-due.
export function effectiveFlags(req: Requisition): Flag[] {
  const flags = req.flags.slice();
  if (isReqPastDue(req) && !flags.includes('pastDue')) flags.push('pastDue');
  return flags;
}

// ────────────────────────────────────────────────────────────────────────
// Derived tasks — the mailbox Tasks board reads these
// ────────────────────────────────────────────────────────────────────────
export interface DerivedTask {
  id: string;                   // stable: `req:{reqId}:pencil-due`, etc.
  mailbox: 'requisitions';
  title: string;
  status: 'overdue' | 'today' | 'tomorrow' | 'week';
  assignee: TeamId;
  dueAt: string;                // ISO
  due: string;                  // human string
  project: string;
  linkedReq: string;            // req id
  from: 'module';
  source: string;
  detail?: string;
  court: 'ours' | 'theirs';
  synced?: 'textura' | 'siteline' | 'quickbooks' | 'procore';
}

/**
 * Compute the current Tasks-board cards from the requisitions module's live
 * state. Every card is born from a specific condition (pencil due, returned,
 * blocked-by-doc, past-due-payment) and its id is derived from that condition,
 * so when the condition clears the card disappears — no manual grooming.
 */
export function deriveTasksFromRequisitionsModule(): DerivedTask[] {
  const out: DerivedTask[] = [];
  const now = new Date(`${todayIso()}T09:00:00`);
  const todayMs = now.getTime();

  for (const req of REQUISITIONS) {
    const project = getProject(req.projectId);
    if (!project) continue;

    // 1) Pencil deadline when still Draft in current cycle — the project's own
    //    calendar (GC due day − internal lead), not a hardcoded 15th
    if (req.stage === 'draft' && req.month === CURRENT_MONTH && !req.isRetentionBill) {
      const dates = billingDatesForMonth(project, req.month);
      const due = new Date(`${dates.internalDue}T17:00:00`);
      out.push({
        id: `req:${req.id}:pencil-due`,
        mailbox: 'requisitions',
        title: `Send pencil — ${project.name.split('—')[0].trim()} ${fmtMonthShort(req.month)}`,
        status: bucketFromDue(due, todayMs),
        assignee: project.owner,
        dueAt: due.toISOString(),
        due: humanDue(due, todayMs),
        project: project.name,
        linkedReq: req.id,
        from: 'module',
        source: `from Requisitions module · GC due ${fmtShortDate(dates.gcDue)} · internal ${project.billing.internalLeadDays}d before`,
        detail: `${usd(req.amount)} billed against approved SOV`,
        court: 'ours',
        synced: mapChannel(project.channel),
      });
    }

    // 2) Returned by GC — revise + resubmit final
    if (req.stage === 'returned') {
      const due = new Date(todayMs + 2 * 24 * 3600 * 1000); // 2 days out
      out.push({
        id: `req:${req.id}:revise-final`,
        mailbox: 'requisitions',
        title: `Revise + resubmit final — ${project.name.split('—')[0].trim()}`,
        status: bucketFromDue(due, todayMs),
        assignee: project.owner,
        dueAt: due.toISOString(),
        due: humanDue(due, todayMs),
        project: project.name,
        linkedReq: req.id,
        from: 'module',
        source: 'from Requisitions module · returned by GC',
        detail: `Req ${req.seq} · ${usd(req.amount)}`,
        court: 'ours',
        synced: mapChannel(project.channel),
      });
    }

    // 3) Missing docs blocking Final — one card per missing doc
    if (req.stage === 'pencil' || req.stage === 'draft') {
      const missing = getRecordsForReq(req).filter(({ record }) => record.status === 'missing');
      for (const { requirement } of missing) {
        const due = new Date(todayMs + 1 * 24 * 3600 * 1000);
        const whose = requirement.owner === 'vendor'
          ? `${requirement.vendorName}`
          : 'Elli';
        out.push({
          id: `req:${req.id}:doc:${requirement.id}`,
          mailbox: 'requisitions',
          title: `Collect ${requirement.form} — ${whose}`,
          status: bucketFromDue(due, todayMs),
          assignee: project.owner,
          dueAt: due.toISOString(),
          due: humanDue(due, todayMs),
          project: project.name,
          linkedReq: req.id,
          from: 'module',
          source: `blocks ${project.name.split('—')[0].trim()} final`,
          court: requirement.owner === 'vendor' ? 'theirs' : 'ours',
        });
      }
    }

    // 4) Submitted and past terms — chase payment. Aging math: final date +
    //    net days → due date → days late. Goes to the GC's payment contact.
    if (req.stage === 'final' || req.stage === 'approved') {
      const aging = reqAging(req);
      if (aging.daysLate > 0 && aging.dueOn && aging.submittedOn) {
        const dueDate = new Date(`${aging.dueOn}T09:00:00`);
        const who = contactFor(project.id, 'payment');
        out.push({
          id: `req:${req.id}:chase-payment`,
          mailbox: 'requisitions',
          title: `Chase payment — ${project.name.split('—')[0].trim()} #${req.seq}`,
          status: 'overdue',
          assignee: project.owner,
          dueAt: dueDate.toISOString(),
          due: humanDue(dueDate, todayMs),
          project: project.name,
          linkedReq: req.id,
          from: 'module',
          source: `from Requisitions module · Net ${project.billing.netDays} · due ${fmtShortDate(aging.dueOn)}`,
          detail: `${usd(req.amount)} · submitted ${fmtShortDate(aging.submittedOn)}${who ? ` · ask ${who.name}` : ''}`,
          court: 'theirs',
          synced: mapChannel(project.channel),
        });
      }
    }
  }

  // 5) Active projects with nothing started this month — the "which projects
  //    are we billing" driver. One card per project, due on its start day.
  //    Skipping the month in the pipeline clears it.
  for (const project of PROJECTS) {
    if (project.lifecycle !== 'active') continue;
    if (REQUISITIONS.some(r => r.projectId === project.id && r.month === CURRENT_MONTH)) continue;
    if (isMonthSkipped(project.id, CURRENT_MONTH)) continue;
    const dates = billingDatesForMonth(project, CURRENT_MONTH);
    const due = new Date(`${dates.start}T09:00:00`);
    out.push({
      id: `project:${project.id}:start-billing:${CURRENT_MONTH}`,
      mailbox: 'requisitions',
      title: `Start ${fmtMonthShort(CURRENT_MONTH)} requisition — ${project.name.split('—')[0].trim()}`,
      status: bucketFromDue(due, todayMs),
      assignee: project.owner,
      dueAt: due.toISOString(),
      due: humanDue(due, todayMs),
      project: project.name,
      linkedReq: '',
      from: 'module',
      source: `from Requisitions module · starts ${startRuleLabel(project.billing.startRule)} · GC due ${fmtShortDate(dates.gcDue)}`,
      detail: 'Not billing this month? Skip it in the pipeline and this card clears.',
      court: 'ours',
      synced: mapChannel(project.channel),
    });
  }

  return out;
}

function bucketFromDue(due: Date, todayMs: number): DerivedTask['status'] {
  const dayMs = 24 * 3600 * 1000;
  const diffDays = Math.floor((due.getTime() - todayMs) / dayMs);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return 'week';
}

function humanDue(due: Date, todayMs: number): string {
  const diffDays = Math.round((due.getTime() - todayMs) / (24 * 3600 * 1000));
  const label = due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (diffDays < 0) return `was due ${label} · ${Math.abs(diffDays)}d late`;
  if (diffDays === 0) return `due today · ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return `${label} · ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function fmtMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

function fmtShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapChannel(channel: Project['channel']): DerivedTask['synced'] {
  if (channel === 'TEXTURA') return 'textura';
  if (channel === 'SITELINE') return 'siteline';
  if (channel === 'PROCORE') return 'procore';
  return undefined;
}

// re-export usd for convenience since derived-task rendering uses it
import { usd, fmtMonth } from './format';
export { usd, fmtMonth };
// Demo anchor — every "today" in this module. Cofount: replace with the clock.
export function todayIso(): string {
  return '2026-07-13';
}
