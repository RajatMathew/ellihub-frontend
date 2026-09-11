/**
 * Shared seed data for the three accounting mailboxes:
 *   requisitions@ellicorp.com · procurement@ellicorp.com · contracts@ellicorp.com
 *
 * Everything is keyed by `mailbox` so the same shell renders each inbox with
 * the right threads/calendar/tasks scoped in.
 */

import { deriveTasksFromRequisitionsModule } from '@/modules/requisitions/data';

export type Mailbox = 'requisitions' | 'procurement' | 'contracts';
export type Court = 'ours' | 'gc' | 'none';
export type ThreadFolder = 'inbox' | 'ours' | 'gc' | 'compliance' | 'flagged' | 'other' | 'sent' | 'deleted';

export type TeamId = 'PL' | 'LO' | 'TB' | 'AC' | 'CA' | 'MI' | 'EV';

export interface Member {
  id: TeamId;
  name: string;
  role: string;
  color: string;
  supervisor?: boolean; // Peek + assign
}

export const TEAM: Record<TeamId, Member> = {
  PL: { id: 'PL', name: 'Peter Ligas', role: 'Vice President', color: '#1a3a5f', supervisor: true },
  LO: { id: 'LO', name: 'Lissette Olivo', role: 'CEO · Head of Accounting', color: '#c75e40', supervisor: true },
  TB: { id: 'TB', name: 'Tomasz Bartosiak', role: 'COO', color: '#b8860b', supervisor: true },
  AC: { id: 'AC', name: 'Alejandra', role: 'Accounting — Contracts', color: '#2d6a4f' },
  CA: { id: 'CA', name: 'Cari', role: 'Accounting — Procurement', color: '#5e40c7' },
  MI: { id: 'MI', name: 'Michelle', role: 'Accounting — Contracts', color: '#8a6a10' },
  EV: { id: 'EV', name: 'Lilibell', role: 'Accounting — Procurement', color: '#4a9d8e' },
};

// For the demo the "logged-in" person is Alejandra (per Peter's request).
// Change this key to swap the whole Home / My Day / Tasks focus.
export const CURRENT_USER: TeamId = 'AC';

export const ACCOUNTING_STAFF: TeamId[] = ['AC', 'CA', 'MI', 'EV'];

// ────────────────────────────────────────────────────────────────────────
// THREADS
// ────────────────────────────────────────────────────────────────────────
export interface Message {
  who: string;
  email: string;
  when: string;
  body: string;
  external?: boolean;
  attachments?: string[];
}

export interface Thread {
  id: string;
  mailbox: Mailbox;
  owner: TeamId;
  from: string;
  when: string;
  subject: string;
  preview: string;
  unread: boolean;
  court: Court;
  folders: ThreadFolder[];
  project?: string;
  claudeActed?: string;
  linkedReq?: { label: string; amount?: string; status: string; note: string };
  messages: Message[];
}

export const THREADS: Thread[] = [
  // ── REQUISITIONS@ ── (matched to the V2 prototype)
  {
    id: 't-skanska', mailbox: 'requisitions', owner: 'LO',
    from: 'Manjit Kaur — Skanska', when: '4:40 PM',
    subject: 'RE: EDC - Public Health Lab - MONTHLY DOCUMENTS - MAY 26 REQUISITION',
    preview: 'The payroll numberings are incorrect — WE 06/07 should start with 179…',
    unread: true, court: 'ours', folders: ['inbox', 'ours', 'compliance'],
    project: 'EDC — Public Health Lab',
    claudeActed:
      'Applied Lily’s markups to the MWBE report’s award-amount and payment-data fields — corrected report is queued for Lissette’s sign-off. The CPR numbering was flagged back to the payroll system with the corrected sequence; I’ll attach the reissued CPRs the moment they land.',
    linkedReq: { label: 'May Requisition', amount: '$96,370.00', status: 'Pencil — with GC', note: 'MWBE + CPR corrections in progress' },
    messages: [
      { who: 'Lily O’Hara', email: 'Lily.OHara@skanska.com', when: 'Jul 6, 4:32 PM', external: true,
        body: 'Hi Lissette,\n\nThank you for completing the EDC MWBE Compliance Report for Elli’s June 2026 requisition on the Public Health Lab project. A few edits to Elli’s Contract Award Amount and Payment Data fields are required before saving this report for record.\n\nPlease see attached for corrections to Elli’s May 2026 Compliance Report, which had similar revisions noted.',
        attachments: ['EDC_MWBE_Report_MAY26_markup.pdf', 'EDC_MWBE_Report_JUN26_markup.pdf'] },
      { who: 'Manjit Kaur', email: 'manjit.kaur@skanska.com', when: 'Jul 6, 4:40 PM', external: true,
        body: 'The payroll numberings are incorrect. Please correct — WE 06/07 should start with 179.\n\nManjit Kaur\nSenior Project Accountant\nSkanska USA Building Inc.' },
      { who: 'Lissette Olivo', email: 'requisitions@ellicorp.com', when: 'Jul 6, 4:41 PM',
        body: 'Please see attached Elli’s CPR for June 2026.\n\nThank you,\nLissette Olivo\nChief Executive Officer',
        attachments: ['ELLI_CPR_JUN26.pdf'] },
    ],
  },
  {
    id: 't-sa', mailbox: 'requisitions', owner: 'LO',
    from: 'Pat — Dematteis', when: '4:34 PM',
    subject: 'Success Academy Elli — June Final Req & Waiver',
    preview: 'Please make the below changes and add change orders at below percentages…',
    unread: true, court: 'ours', folders: ['inbox', 'ours'],
    project: 'Success Academy',
    claudeActed: 'Pat’s table changes the base-contract percentage and adds CO #4 at 100% and CO #5 at 60%. Applied — new total $38,240 — G702/G703 regenerated, final waiver prepared, filed under Success Academy → Requisitions → 2026-06.',
    linkedReq: { label: 'June Final Req', amount: '$38,240.00', status: 'Pencil — with GC', note: 'Pat’s % changes applied — revised req + final waiver ready to return' },
    messages: [
      { who: 'Pat', email: 'pat@dematteisorg.com', when: 'Jul 6, 4:34 PM', external: true,
        body: 'Requisitions,\n\nPlease make the below changes and add change orders at below percentages:\n\nMillwork Base Contract | $591,360 | 92% | 5% ret\nCO #4 — Reception revisions | $18,400 | 100% | 5% ret\nCO #5 — AV wall blocking | $6,900 | 60% | 5% ret\n\nPlease return the revised requisition with the final waiver.',
        attachments: ['SA_June_Req_Changes.xlsx'] },
    ],
  },
  {
    id: 't-dcas', mailbox: 'requisitions', owner: 'EV',
    from: 'Awa Diallo — Technico', when: 'Jul 6',
    subject: 'RE: DCAS Monthly Requisition Package (June 2026)',
    preview: 'Kindly prepare the monthly payment package for DCAS. Period 6/1/2026 – 7/5/2026…',
    unread: false, court: 'ours', folders: ['inbox', 'ours'],
    project: 'DCAS — Monthly Package',
    claudeActed: 'Package assembled: period 6/1–7/5, monthly forms filled from the SOV, CPRs #24–28 attached from the payroll system. Filed and queued for review; reminder set for Thursday morning if it hasn’t gone out.',
    linkedReq: { label: 'June Requisition', amount: '$41,220.00', status: 'Draft', note: 'Package assembled — due to Technico Jul 10' },
    messages: [
      { who: 'Awa Diallo', email: 'adiallo@technico-csi.com', when: 'Jul 6, 9:05 AM', external: true,
        body: 'Good Morning,\n\nKindly prepare the monthly payment package for DCAS.\nThe payment period is 6/1/2026 up to 7/5/2026.\nPlease send the monthly forms along with the CPRs for review by July 10th.\n\nThank you,\nAwa Diallo\nProject Accountant' },
    ],
  },
  {
    id: 't-boyland', mailbox: 'requisitions', owner: 'CA',
    from: 'Textura System', when: 'Jun 30',
    subject: '[Textura] Boyland — Invoice Details Rejected · Sign Lien Waiver',
    preview: 'The payment and invoice details entered for Draw 38 have not been accepted by Gilbane…',
    unread: true, court: 'ours', folders: ['inbox', 'ours', 'compliance'],
    project: 'Boyland Community Center — DDC',
    claudeActed: 'Gilbane rejected Draw 38 with a note that stored materials must move to previously-billed. Correction staged; unconditional lien waiver open for signature. Two clicks left for a human.',
    linkedReq: { label: 'Draw 38', amount: '$367,854.25', status: 'Returned by GC', note: 'Corrected, ready to resubmit' },
    messages: [
      { who: 'Textura System', email: 'textura-system@texturacorp.com', when: 'Jun 30, 5:10 PM', external: true,
        body: 'The payment and invoice details entered by Elli NY Design Corp for Draw 38, to be conducted on 25-Jun-2026, for the Project Boyland Community Center have not been accepted by Gilbane Building Company.\n\nContract: J09856.000-0059' },
      { who: 'Textura System', email: 'textura-system@texturacorp.com', when: 'Jul 1, 3:17 PM', external: true,
        body: 'You are requested to sign an unconditional lien waiver for:\n\nProject: Boyland Community Center\nDraw: 38 June 2026, ending 30-Jun-2026\nContract: J09856.000-0059\nSubcontract of: Gilbane Building Company' },
    ],
  },
  {
    id: 't-sinai', mailbox: 'requisitions', owner: 'CA',
    from: 'Textura System', when: 'Jul 2',
    subject: '[Textura] Mount Sinai Tisch — Invoice Approved · Sign Lien Waiver',
    preview: 'Draw 4 details have been approved by Gilbane Building Company…',
    unread: true, court: 'ours', folders: ['inbox', 'ours', 'compliance'],
    project: 'Mount Sinai Tisch Cancer Hospital',
    claudeActed: 'Draw 4 approved — $46,812. The lien waiver is the only thing between us and payment release. Staged for signature; forecast updated to mid-August on Net 45.',
    linkedReq: { label: 'Draw 4', amount: '$46,812.00', status: 'GC Approved', note: 'Sign lien waiver to release' },
    messages: [
      { who: 'Textura System', email: 'textura-system@texturacorp.com', when: 'Jul 2, 7:12 AM', external: true,
        body: 'The payment and invoice details entered by Elli NY Design Corp for Draw 4, dated 06-Jul-2026, for the Project Mount Sinai Tisch Cancer Hospital have been approved by Gilbane Building Company.' },
    ],
  },
  {
    id: 't-hiphop', mailbox: 'requisitions', owner: 'MI',
    from: 'Textura System', when: 'Jun 30 – Jul 6',
    subject: '[Textura] Hip Hop Museum — Compliance Hold · Stored Materials Hold · Draw 19 Closes Jul 17',
    preview: 'A Document Compliance Hold has been placed upon payment application 18…',
    unread: true, court: 'ours', folders: ['inbox', 'ours', 'compliance'],
    project: 'The Hip Hop Museum',
    claudeActed: 'Two holds on PA #18 ($112,480). Matched the missing items — updated COI and stored-materials inventory sheet — pulled both from Files and uploaded them to Textura. Draw 19 closes Jul 17; the draft will be ready once the holds clear.',
    linkedReq: { label: 'Req #18', amount: '$112,480.00', status: 'On hold', note: 'Doc hold + stored-materials hold' },
    messages: [
      { who: 'Textura System', email: 'textura-system@texturacorp.com', when: 'Jun 30, 9:16 AM', external: true,
        body: 'A Document Compliance Hold has been placed upon payment application 18 (June 2026) from Pavarini McGovern, LLC. on the Project The Hip Hop Museum. Contract: 51000090006.\n\nThis may result in delayed payment.' },
    ],
  },
  {
    id: 't-ps508', mailbox: 'requisitions', owner: 'PL',
    from: 'Procore — Steve Pitarresi', when: '6:39 PM',
    subject: 'Break down your Schedule of Values — PS 508Q · CASEWORK',
    preview: 'Please provide us with a detailed breakdown of your Schedule of Values…',
    unread: true, court: 'ours', folders: ['inbox', 'ours'],
    project: 'PS 508Q — Casework',
    claudeActed: 'New project entering the pipeline. Drafted the PS 508Q SOV from our estimate. Review it under Requisitions → PS 508Q → SOV, then it goes into Procore.',
    linkedReq: { label: 'SOV setup', status: 'Draft SOV ready', note: 'Review before entering into Procore' },
    messages: [
      { who: 'Procore Notifications', email: 'notifications@procoretech.com', when: 'Jul 6, 6:39 PM', external: true,
        body: 'PS 508Q\n\nSteve Pitarresi invites you to break down your Schedule of Values for this Commitment.\n\nCommitment Details\nTitle: CASEWORK\n\nPlease provide us with a detailed breakdown of your Schedule of Values.' },
    ],
  },
  {
    id: 't-payment', mailbox: 'requisitions', owner: 'TB',
    from: 'Tomasz → G. Liu (Gilbane)', when: 'Jun 30', subject: 'Re: Payment Status',
    preview: 'Checking in to see if you have a transfer date yet for this week?',
    unread: false, court: 'gc', folders: ['inbox', 'gc'],
    project: 'Boyland Community Center — DDC',
    claudeActed: 'Tomasz chased Gilbane Jun 30 — no reply in 7 days. Nudged G. Liu this morning and cc’d G. Zach. If nothing lands by Thursday, next step is a call.',
    messages: [
      { who: 'Tomasz Bartosiak', email: 'tomasz@ellicorp.com', when: 'Jun 30, 10:29 AM',
        body: 'Checking in to see if you have a transfer date yet for this week?\n\nRegards,\nTomasz Bartosiak\nChief Operating Officer' },
      { who: 'Claude — follow-up cadence', email: 'requisitions@ellicorp.com', when: 'Today, 8:02 AM',
        body: 'Good morning G. Liu,\n\nFollowing up on the below — could you confirm the transfer date for the Boyland Draw 37 payment this week?\n\nThank you,\nElli NY Design — Requisitions' },
    ],
  },
  {
    id: 't-bnl', mailbox: 'requisitions', owner: 'MI',
    from: 'Textura System', when: 'Jul 1',
    subject: '[Textura] BNL-SUSC — Compliance requirements have expired',
    preview: 'Worker’s Compensation Insurance of BK TILE & STONE, INC. — expired…',
    unread: false, court: 'ours', folders: ['inbox', 'ours', 'compliance'],
    project: 'BNL-SUSC',
    claudeActed: 'Our sub BK Tile & Stone’s workers’ comp expired on BNL-SUSC — blocks their portion of the next draw. Emailed their office for the renewed certificate and flagged it on the vendor record.',
    messages: [
      { who: 'Textura System', email: 'textura-system@texturacorp.com', when: 'Jul 1, 1:38 AM', external: true,
        body: 'The following compliance requirements for Elli NY Design Corp have expired on project BNL-SUSC for the contract 14-2134-18:\n\n• Worker’s Compensation Insurance of BK TILE & STONE, INC.' },
    ],
  },
  {
    id: 't-sacs', mailbox: 'requisitions', owner: 'EV',
    from: 'Corinne — Dematteis', when: 'Jul 2', subject: 'SACS (Bronx)',
    preview: 'The owner is requesting a count of how many workers were on site for May and June…',
    unread: false, court: 'ours', folders: ['inbox', 'ours'],
    project: 'SACS (Bronx)',
    claudeActed: 'Worker counts: May — 6 workers, June — 0 (no site work billed). Reply drafted.',
    messages: [
      { who: 'Corinne', email: 'cg@dematteisorg.com', when: 'Jul 2, 8:58 AM', external: true,
        body: 'Good morning,\n\nThe owner is requesting a count of how many workers were on site for May and June. Please let me know how many were on site for each month separately.\n\nThank you,\nCorinne' },
    ],
  },

  // ── PROCUREMENT@ ─────────────────────────────────────────────────
  {
    id: 'p-brooklyn-ss', mailbox: 'procurement', owner: 'CA',
    from: 'Brooklyn Solid Surface Co.', when: 'Today, 11:42 AM',
    subject: 'Invoice #10488 — Corian tops for Hollis Library',
    preview: 'Attached is our invoice for the solid-surface tops shipped Jul 3…',
    unread: true, court: 'ours', folders: ['inbox', 'ours'],
    project: 'Hollis Library Interior Renovation',
    claudeActed: 'Invoice matched to PO-2026-118 ($14,500.00, Hollis SOV line 5-Material). Delivery receipt found — quantities and freight tie out. Queued for Cari’s 2-way match approval; on approve, it flows to Monthly Bills.',
    linkedReq: { label: 'PO-2026-118', amount: '$14,500.00', status: 'Awaiting approval', note: '2-way match complete — approve to pay' },
    messages: [
      { who: 'Brooklyn Solid Surface Co.', email: 'ap@brooklynsolidsurface.com', when: 'Jul 7, 11:42 AM', external: true,
        body: 'Hello,\n\nAttached is our invoice for the solid-surface tops shipped on July 3 for Hollis Library.\n\nInvoice #10488 — $14,500.00\nPayment terms: Net 30\n\nThank you,\nBrooklyn Solid Surface Co.',
        attachments: ['INV-10488.pdf', 'Delivery-Receipt-7-3-26.pdf'] },
    ],
  },
  {
    id: 'p-apex', mailbox: 'procurement', owner: 'EV',
    from: 'Apex Architectural Hardware', when: 'Jul 6',
    subject: 'RE: PO-2026-131 — Hardware for Boyland cabinets — ready to ship',
    preview: 'All items in stock, will ship Wed 7/9 via freight. ETA at your shop 7/11…',
    unread: true, court: 'ours', folders: ['inbox', 'ours'],
    project: 'Boyland Community Center — DDC',
    claudeActed: 'Vendor confirmed the full PO ships Wed 7/9 — I updated the Boyland production schedule with the 7/11 shop receipt date. Delivery window matches installation crew schedule.',
    linkedReq: { label: 'PO-2026-131', amount: '$8,240.00', status: 'PO issued', note: 'Ship 7/9, receive at shop 7/11' },
    messages: [
      { who: 'Apex Architectural Hardware', email: 'sales@apexhardware.com', when: 'Jul 6, 2:18 PM', external: true,
        body: 'Peter,\n\nAll items on PO-2026-131 are in stock. Will ship Wednesday 7/9 via freight. ETA at your shop 7/11.\n\nInvoice will follow shipment.\n\nBest,\nApex' },
    ],
  },
  {
    id: 'p-w9', mailbox: 'procurement', owner: 'EV',
    from: 'Ridgewood Install Crew LLC', when: 'Jul 3',
    subject: 'Updated W-9 attached — Ridgewood Install Crew',
    preview: 'Per your request, attached is our current W-9 and updated COI…',
    unread: false, court: 'ours', folders: ['inbox', 'ours', 'compliance'],
    claudeActed: 'W-9 + COI received and filed. Vendor record updated — COI now valid thru 8/1/26 (was expiring). Green-flagged for any project.',
    messages: [
      { who: 'Ridgewood Install Crew', email: 'office@ridgewoodinstall.com', when: 'Jul 3, 4:20 PM', external: true,
        body: 'Peter,\n\nPer your request, attached is our current W-9 and our updated Certificate of Insurance.\n\nThank you,\nRidgewood Install Crew LLC',
        attachments: ['Ridgewood-W9-2026.pdf', 'Ridgewood-COI-2026.pdf'] },
    ],
  },
  {
    id: 'p-bktile', mailbox: 'procurement', owner: 'MI',
    from: 'Peter → BK Tile & Stone', when: 'Today, 8:15 AM',
    subject: 'Urgent: renewed workers’ comp certificate — expired on BNL-SUSC',
    preview: 'Your workers’ comp expired and is blocking the sub portion of BNL-SUSC…',
    unread: false, court: 'gc', folders: ['inbox', 'gc', 'compliance'],
    project: 'BNL-SUSC',
    claudeActed: 'Sent this morning by Michelle. On Textura’s expired-cert flag → chase cadence: nudge Wed if no reply.',
    messages: [
      { who: 'Peter Ligas', email: 'peter@ellicorp.com', when: 'Today, 8:15 AM',
        body: 'Please send over your renewed workers’ compensation certificate. Your current one expired and it is now blocking our BNL-SUSC draw for your portion of the work.\n\nThanks,\nPeter' },
    ],
  },

  // ── CONTRACTS@ ───────────────────────────────────────────────────
  {
    id: 'c-gilbane-mst', mailbox: 'contracts', owner: 'AC',
    from: 'Gilbane Contracts', when: 'Today, 10:12 AM',
    subject: 'Executed subcontract — Mount Sinai Tisch, Contract J10952.000-0027',
    preview: 'Please find attached the fully executed subcontract. Please return signed insurance requirements exhibit…',
    unread: true, court: 'ours', folders: ['inbox', 'ours'],
    project: 'Mount Sinai Tisch Cancer Hospital',
    claudeActed: 'Contract filed to Contracts / Mount Sinai Tisch. Extracted key terms — Net 45, 5% retention, $830,000 contract value — and cross-checked against the estimate: matches. Insurance-requirements exhibit needs your signature and return.',
    messages: [
      { who: 'Gilbane Contracts', email: 'contracts@gilbaneco.com', when: 'Jul 7, 10:12 AM', external: true,
        body: 'Please find attached the fully executed subcontract for Mount Sinai Tisch Cancer Hospital, Contract J10952.000-0027.\n\nPlease sign and return the Insurance Requirements Exhibit by end of week.\n\nBest,\nGilbane Contracts',
        attachments: ['MST-Subcontract-Executed.pdf', 'Insurance-Requirements-Exhibit.pdf'] },
    ],
  },
  {
    id: 'c-co-boyland', mailbox: 'contracts', owner: 'AC',
    from: 'Gilbane — Contract CO', when: 'Jul 6',
    subject: 'Contract Change Order #4 — Boyland Community Center',
    preview: 'Attached is CCO-4 for signature. $22,180.00 net add to base subcontract…',
    unread: true, court: 'ours', folders: ['inbox', 'ours'],
    project: 'Boyland Community Center — DDC',
    claudeActed: 'Boyland CCO-4 received — $22,180 net add for the millwork scope additions. Cross-checked against our COR log: matches COR-11 through COR-13. Ready for signature.',
    messages: [
      { who: 'Gilbane Contracts', email: 'contracts@gilbaneco.com', when: 'Jul 6, 3:45 PM', external: true,
        body: 'Please find attached Contract Change Order #4 for Boyland Community Center.\n\nNet add: $22,180.00\nContract sum to date after CCO-4: $2,892,180.00\n\nPlease sign and return.',
        attachments: ['CCO-4-Boyland.pdf'] },
    ],
  },
  {
    id: 'c-bond', mailbox: 'contracts', owner: 'MI',
    from: 'Berkshire Hathaway Bonds', when: 'Jul 5',
    subject: 'Performance bond renewal — Elli NY Design Corp',
    preview: 'Your performance bond program renews Aug 1. Attached is the renewal quote and application…',
    unread: false, court: 'ours', folders: ['inbox', 'ours', 'compliance'],
    claudeActed: 'Bond renewal quote is 4% higher than last year on the same limits. Application is pre-filled from our records; needs Lissette’s signature and a fresh interim financial. Deadline is Aug 1.',
    messages: [
      { who: 'Berkshire Hathaway Bonds', email: 'bonds@berkshirebonds.com', when: 'Jul 5, 11:00 AM', external: true,
        body: 'Your performance bond program renews August 1. Please review the attached renewal quote and complete the application.\n\nWe’ll need an interim financial as of 6/30 to finalize.\n\nThank you,\nBHHB',
        attachments: ['Renewal-Quote-2026.pdf', 'Bond-Application.pdf'] },
    ],
  },
  {
    id: 'c-nda', mailbox: 'contracts', owner: 'MI',
    from: 'Whiting-Turner — Prequalification', when: 'Jul 2',
    subject: 'Elli NY Design Corp — Prequalification packet request',
    preview: 'To be considered for our upcoming bid list, please complete the attached prequalification packet…',
    unread: false, court: 'ours', folders: ['inbox', 'ours'],
    claudeActed: 'Prequal packet started — pulled financials, EMR, bond limits, and 3 recent projects from our records. NDA is standard mutual, safe to sign. Whole thing needs Peter’s sign-off before it goes back.',
    messages: [
      { who: 'Whiting-Turner Preq', email: 'preq@whiting-turner.com', when: 'Jul 2, 9:30 AM', external: true,
        body: 'To be considered for our upcoming bid list, please complete the attached prequalification packet and return with an executed NDA.\n\nDeadline: July 25.\n\nThank you.',
        attachments: ['WT-Prequal-2026.pdf', 'Mutual-NDA.pdf'] },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────
// CALENDAR EVENTS
// ────────────────────────────────────────────────────────────────────────
export type EventType = 'deadline' | 'window' | 'reminder' | 'cadence' | 'meeting';
export interface CalEvent {
  id: string;
  mailbox: Mailbox | 'all';
  owner?: TeamId;
  date: string;
  time?: string;
  title: string;
  type: EventType;
  project?: string;
  detail?: string;
  amount?: string;
}

export const EVENTS: CalEvent[] = [
  // Requisitions
  { id: 'e1', mailbox: 'requisitions', owner: 'LO', date: '2026-07-08', title: 'Payroll — reissue CPRs for Skanska (WE 06/07 → #179)', type: 'reminder', project: 'EDC — Public Health Lab' },
  { id: 'e2', mailbox: 'requisitions', owner: 'EV', date: '2026-07-10', title: 'DCAS monthly package due to Technico', type: 'deadline', project: 'DCAS — Monthly Package', amount: '$41,220.00' },
  { id: 'e3', mailbox: 'requisitions', date: '2026-07-13', title: 'Billing opens — 2nd Monday reminder', type: 'cadence', detail: 'Claude drafts each project’s next pay app from field reports' },
  { id: 'e4', mailbox: 'requisitions', owner: 'LO', date: '2026-07-15', title: 'Sign 2 lien waivers — Boyland Draw 38 + Mount Sinai Draw 4', type: 'reminder', amount: '~$414,666' },
  { id: 'e5', mailbox: 'requisitions', owner: 'MI', date: '2026-07-17', title: 'Hip Hop Museum — Draw 19 closes', type: 'deadline', project: 'The Hip Hop Museum' },
  { id: 'e6', mailbox: 'requisitions', owner: 'CA', date: '2026-07-21', title: 'BPL CP1 #8 — payment reminder (7d before due)', type: 'cadence', project: 'BPL: Central Library Ph 2 — CP1', amount: '$170,677.80' },
  { id: 'e7', mailbox: 'requisitions', owner: 'CA', date: '2026-07-23', title: 'Hollis #3 — payment reminder', type: 'cadence', project: 'Hollis Library Interior Renovation', amount: '$71,250.00' },
  { id: 'e8', mailbox: 'requisitions', owner: 'CA', date: '2026-07-28', title: 'BPL CP1 #8 — payment due (Net 45)', type: 'deadline', project: 'BPL: Central Library Ph 2 — CP1', amount: '$170,677.80' },
  { id: 'e9', mailbox: 'requisitions', owner: 'CA', date: '2026-07-30', title: 'Hollis #3 — payment due (Net 60)', type: 'deadline', project: 'Hollis Library Interior Renovation', amount: '$71,250.00' },
  { id: 'e10', mailbox: 'requisitions', date: '2026-08-01', title: 'Monthly report — Claude compiles + emails to Peter, Lissette, Tomasz', type: 'cadence' },
  { id: 'e11', mailbox: 'requisitions', owner: 'CA', date: '2026-08-29', title: 'Hollis #4 — payment due (Net 60)', type: 'deadline', project: 'Hollis Library Interior Renovation', amount: '$13,300.00' },
  { id: 'e12', mailbox: 'requisitions', owner: 'LO', date: '2026-07-09', time: '10:00', title: 'Weekly requisitions review — Tomasz + Lissette', type: 'meeting', detail: 'Review Open Requisition Report + this cycle drafts' },
  // Procurement
  { id: 'e13', mailbox: 'procurement', owner: 'CA', date: '2026-07-11', title: 'Receive at shop — Apex hardware for Boyland (PO-131)', type: 'deadline', amount: '$8,240.00' },
  { id: 'e14', mailbox: 'procurement', owner: 'CA', date: '2026-07-08', title: 'Approve Brooklyn Solid Surface invoice (2-way match ready)', type: 'reminder', amount: '$14,500.00' },
  { id: 'e15', mailbox: 'procurement', owner: 'EV', date: '2026-07-15', title: 'Quarterly vendor COI sweep — 4 vendors flagged', type: 'cadence' },
  // Contracts
  { id: 'e16', mailbox: 'contracts', owner: 'AC', date: '2026-07-11', title: 'Return signed Insurance Requirements Exhibit — Mount Sinai', type: 'deadline', project: 'Mount Sinai Tisch Cancer Hospital' },
  { id: 'e17', mailbox: 'contracts', owner: 'MI', date: '2026-07-25', title: 'Whiting-Turner prequalification packet due', type: 'deadline' },
  { id: 'e18', mailbox: 'contracts', owner: 'MI', date: '2026-08-01', title: 'Performance bond renewal — decision day', type: 'deadline' },
  { id: 'e19', mailbox: 'contracts', owner: 'AC', date: '2026-07-09', time: '14:00', title: 'Contract review — CCO-4 Boyland with Peter', type: 'meeting', project: 'Boyland Community Center — DDC' },
];

// ────────────────────────────────────────────────────────────────────────
// TASKS
// ────────────────────────────────────────────────────────────────────────
// V20 tasks board — five columns, worst-first. Status is derived from
// dueDate + done, with an explicit override for the ones that logically
// belong in a different bucket (e.g. a chase that's overdue but blocked).
export type TaskStatus = 'overdue' | 'today' | 'tomorrow' | 'week' | 'done';

export interface Task {
  id: string;
  mailbox: Mailbox | 'general';
  assignee: TeamId;
  assignedBy?: TeamId; // supervisor who dropped it in
  title: string;
  status: TaskStatus;
  due?: string;            // human "due today", "was due Jun 12 · 25 days late", "Fri Jul 10"
  project?: string;
  linkedThread?: string;
  linkedReq?: string;
  from: 'claude' | 'gc' | 'internal';
  detail?: string;
  // V20 additions
  source?: string;         // "from email · Manjit Kaur, Skanska"
  synced?: 'textura' | 'procore' | 'siteline' | 'quickbooks';
  sla?: string;            // "4th request"
  waiting?: boolean;       // waiting on someone else
  noDate?: boolean;        // flag: task exists with no date
  // Manual-PM controls per Peter (2026-07-13):
  //  - court: whose court is the ball in
  //  - dueAt: absolute due timestamp — starts at emailReceivedAt + 24h; +1 day
  //    button pushes it 24h at a time (unlimited pushes; every push is logged)
  //  - scheduledOn: ISO date if the PM added this task to the Shop Calendar
  court?: 'ours' | 'theirs';
  dueAt?: string;          // ISO datetime, e.g. "2026-07-08T16:40:00"
  scheduledOn?: string;    // ISO date "2026-07-09"
  scheduledBy?: TeamId;    // PM who put it on the calendar (initials show up)
}

// TODAY = 2026-07-07 · 09:00. All dueAt values below are set to the email's
// arrival timestamp + 24 hours (Peter's rule). The +1 day button in the UI
// pushes dueAt by another 24 h. `court` is the PM-set state: ours / theirs.
const STATIC_SEED_TASKS: Task[] = [
  // ── OVERDUE ── things whose due date has PASSED. Waiting-on-others still lands here.
  { id: 'k9',  mailbox: 'requisitions', title: 'Chase — JFK T6 Cathay #10 payment',      status: 'overdue', assignee: 'TB', due: 'was due Jun 27 · 11 days late', dueAt: '2026-06-27T09:00:00', court: 'theirs', project: 'JFK T6 — Cathay Pacific',   linkedReq: 'Req #10 · $91,399', from: 'gc', detail: 'Follow-up sent this morning; if no reply Thursday → call.', source: 'from email · JRM AP', waiting: true, sla: '3rd request', synced: 'siteline' },
  { id: 'k10', mailbox: 'requisitions', title: 'Chase — JFK T6 Proseguer #5',            status: 'overdue', assignee: 'TB', due: 'was due Jun 11 · 27 days late', dueAt: '2026-06-11T09:00:00', court: 'theirs', project: 'JFK T6 — Proseguer Change', linkedReq: 'Req #5 · $5,700',   from: 'gc', source: 'from email · JRM AP', waiting: true, sla: '4th request', synced: 'siteline' },
  { id: 'k11', mailbox: 'requisitions', title: 'Chase — Boyland transfer date (Gilbane)', status: 'overdue', assignee: 'TB', due: 'was due Jul 1 · 6 days late',  dueAt: '2026-07-01T10:30:00', court: 'theirs', project: 'Boyland Community Center — DDC', linkedThread: 't-payment', from: 'gc', source: 'from email · Tomasz → G. Liu', waiting: true },
  { id: 'p4',  mailbox: 'procurement',  title: 'Chase BK Tile — renewed workers’ comp',   status: 'overdue', assignee: 'MI', due: 'was due Jul 2 · 5 days late',  dueAt: '2026-07-02T02:00:00', court: 'theirs', project: 'BNL-SUSC',                    linkedThread: 'p-bktile',  from: 'gc', detail: 'Blocks their portion of the next draw.', source: 'from Textura · expired cert', waiting: true, synced: 'textura' },

  // ── TODAY · Tue Jul 7 ──
  { id: 'k1', mailbox: 'requisitions', title: 'Sign unconditional lien waiver — Mount Sinai Draw 4', status: 'today', assignee: 'LO', due: 'due today',       dueAt: '2026-07-07T17:33:00', court: 'ours', project: 'Mount Sinai Tisch Cancer Hospital', linkedThread: 't-sinai',   linkedReq: 'Draw 4 · $46,812',   from: 'gc', detail: 'Sign in Textura — the only thing blocking release.', source: 'from Textura · sign lien waiver', synced: 'textura' },
  { id: 'k2', mailbox: 'requisitions', title: 'Sign unconditional lien waiver — Boyland Draw 38',    status: 'today', assignee: 'LO', due: 'due today',       dueAt: '2026-07-07T15:17:00', court: 'ours', project: 'Boyland Community Center — DDC',    linkedThread: 't-boyland', linkedReq: 'Draw 38 · $367,854', from: 'gc', detail: 'Correction staged; sign the waiver and I resubmit to Textura.', source: 'from Textura · resubmit + waiver', synced: 'textura' },
  { id: 'k3', mailbox: 'requisitions', title: 'Sign off — EDC MWBE corrected report',                status: 'today', assignee: 'LO', due: 'due today',       dueAt: '2026-07-07T16:32:00', court: 'ours', project: 'EDC — Public Health Lab',           linkedThread: 't-skanska', from: 'gc', detail: 'Lily’s markups applied. Review + sign, return to Skanska.', source: 'from email · Lily O’Hara, Skanska' },
  { id: 'k4', mailbox: 'requisitions', title: 'Approve — Hollis Req #5 draft',                    status: 'today', assignee: 'TB', due: 'due today',       dueAt: '2026-07-07T07:15:00', court: 'ours', project: 'Hollis Library Interior Renovation', linkedReq: 'Req #5 · $25,840', from: 'internal', detail: 'Pre-filled from field reports. Tomasz + Lissette approve → pencil to Brianna.', source: 'from Siteline · monthly draft', synced: 'siteline' },
  { id: 'k5', mailbox: 'requisitions', title: 'Approve — Hollis Req #5 draft',                    status: 'today', assignee: 'LO', due: 'due today',       dueAt: '2026-07-07T07:15:00', court: 'ours', project: 'Hollis Library Interior Renovation', linkedReq: 'Req #5 · $25,840', from: 'internal', source: 'from Siteline · monthly draft', synced: 'siteline' },
  { id: 'p1', mailbox: 'procurement',  title: 'Approve Brooklyn Solid Surface invoice — 2-way match', status: 'today', assignee: 'CA', due: 'due today',       dueAt: '2026-07-07T11:42:00', court: 'ours', project: 'Hollis Library Interior Renovation', linkedThread: 'p-brooklyn-ss', linkedReq: 'PO-2026-118 · $14,500', from: 'gc', detail: 'Match against PO-118 and delivery receipt — quantities and freight tie out.', source: 'from email · Brooklyn Solid Surface Co.', synced: 'quickbooks' },

  // ── TOMORROW · Wed Jul 8 ──
  { id: 'c5', mailbox: 'contracts',    title: 'Contract review meeting — CCO-4 with Peter',           status: 'tomorrow', assignee: 'AC', due: 'Wed Jul 9', dueAt: '2026-07-09T14:00:00', court: 'ours', project: 'Boyland Community Center — DDC',   from: 'internal', source: 'from calendar · standing meeting' },

  // ── THIS WEEK · Wed–Fri ──
  { id: 'c2', mailbox: 'contracts',    title: 'Route Boyland CCO-4 for signature',                    status: 'week', assignee: 'AC', due: 'Wed Jul 9',   dueAt: '2026-07-09T15:45:00', court: 'ours', project: 'Boyland Community Center — DDC',   linkedThread: 'c-co-boyland', from: 'gc', detail: 'CCO matches COR-11 through COR-13. Peter signs, Alejandra returns.', source: 'from email · Gilbane Contracts', sla: '$22,180 net add' },
  { id: 'k6', mailbox: 'requisitions', title: 'Send DCAS June package to Technico',                   status: 'week', assignee: 'EV', due: 'Thu Jul 10',  dueAt: '2026-07-07T09:05:00', court: 'ours', project: 'DCAS — Monthly Package',           linkedThread: 't-dcas',      linkedReq: 'June Req · $41,220', from: 'gc', detail: 'Package assembled and filed. One click to send.', source: 'from email · Awa Diallo, Technico' },
  { id: 'p2', mailbox: 'procurement',  title: 'Confirm Boyland hardware receipt on 7/11',             status: 'week', assignee: 'CA', due: 'Fri Jul 11',  dueAt: '2026-07-07T14:18:00', court: 'theirs', project: 'Boyland Community Center — DDC',   linkedThread: 'p-apex',      linkedReq: 'PO-2026-131 · $8,240', from: 'gc', source: 'from email · Apex Hardware' },
  { id: 'c1', mailbox: 'contracts',    title: 'Sign + return Mount Sinai Insurance Requirements Exhibit', status: 'week', assignee: 'AC', due: 'Fri Jul 11', dueAt: '2026-07-08T10:12:00', court: 'ours', project: 'Mount Sinai Tisch Cancer Hospital', linkedThread: 'c-gilbane-mst', from: 'gc', detail: 'Deadline end of week per Gilbane.', source: 'from email · Gilbane Contracts' },

  // ── Later this month ──
  { id: 'p5', mailbox: 'procurement',  title: 'Quarterly vendor COI sweep — 4 vendors flagged',       status: 'week', assignee: 'EV', due: 'Tue Jul 15',  dueAt: '2026-07-15T09:00:00', court: 'ours', from: 'internal', source: 'from cadence · quarterly sweep' },
  { id: 'k7', mailbox: 'requisitions', title: 'Return Success Academy revised req + final waiver',    status: 'week', assignee: 'LO', due: 'NO DATE — set one', court: 'ours', project: 'Success Academy', linkedThread: 't-sa', from: 'gc', detail: 'Pat’s % changes applied — new total $38,240.', source: 'from email · Pat, Dematteis', noDate: true },
  { id: 'k8', mailbox: 'requisitions', title: 'Enter PS 508Q SOV in Procore (after review)',          status: 'week', assignee: 'PL', due: 'NO DATE — set one', court: 'ours', project: 'PS 508Q — Casework', linkedThread: 't-ps508', from: 'gc', detail: 'Draft SOV built from the estimate. Peter reviews, I enter it.', source: 'from Procore · SOV invite', noDate: true, synced: 'procore' },
  { id: 'c3', mailbox: 'contracts',    title: 'Whiting-Turner prequalification packet',               status: 'week', assignee: 'MI', due: 'Fri Jul 25',  dueAt: '2026-07-25T17:00:00', court: 'ours', linkedThread: 'c-nda',  from: 'gc', detail: 'Financials + EMR + bond + 3 recent projects pulled. Peter signs off.', source: 'from email · Whiting-Turner Preq' },
  { id: 'c4', mailbox: 'contracts',    title: 'Bond renewal — interim 6/30 financial for BHHB',       status: 'week', assignee: 'MI', due: 'Fri Aug 1',   dueAt: '2026-08-01T17:00:00', court: 'ours', linkedThread: 'c-bond', from: 'gc', detail: '4% quote increase on same limits. Lissette decides re-shopping.', source: 'from email · Berkshire Hathaway Bonds' },

  // ── COMPLETED ──
  { id: 'k13', mailbox: 'requisitions', title: 'Filed — SACS worker counts reply',                              status: 'done', assignee: 'EV', due: 'done',         court: 'ours', project: 'SACS (Bronx)', linkedThread: 't-sacs', from: 'gc', detail: 'May: 6 workers, June: 0. Filed + replied.', source: 'from email · Corinne, Dematteis' },
  { id: 'k14', mailbox: 'requisitions', title: 'Filed — Hip Hop Museum COI + stored-materials uploaded to Textura', status: 'done', assignee: 'MI', due: 'done',   court: 'ours', project: 'The Hip Hop Museum', linkedThread: 't-hiphop', from: 'gc', source: 'from Textura · compliance hold', synced: 'textura' },
  { id: 'p3',  mailbox: 'procurement',  title: 'Ridgewood W-9 + COI filed — vendor record updated',            status: 'done', assignee: 'EV', due: 'done this wk', court: 'ours', from: 'gc', linkedThread: 'p-w9', source: 'from email · Ridgewood Install' },
];

/**
 * Returns every task the mailbox should render for a given box: the static
 * seed tasks (hand-written for the demo) plus any derived from live module
 * state (Requisitions module produces cards that die when their state
 * advances — no manual grooming).
 *
 * Callers should invoke this inside render(); the mailbox listens to
 * 'reqs-changed' + 'tasks-changed' and re-renders, so new derived tasks
 * appear as module state changes.
 */
export function getMailboxTasks(mailbox: Mailbox | 'all' = 'all'): Task[] {
  const derived = deriveTasksFromRequisitionsModule().map(d => ({
    id: d.id,
    mailbox: d.mailbox,
    assignee: d.assignee,
    title: d.title,
    status: d.status,
    due: d.due,
    dueAt: d.dueAt,
    project: d.project,
    linkedReq: d.linkedReq,
    from: 'internal' as const,
    detail: d.detail,
    source: d.source,
    court: d.court,
    synced: d.synced,
  }));
  const all = [...STATIC_SEED_TASKS, ...derived];
  return mailbox === 'all' ? all : all.filter(t => t.mailbox === mailbox);
}

// Backwards-compat re-export for existing consumers; will be removed once
// callers migrate to getMailboxTasks(mailbox).
export const TASKS = STATIC_SEED_TASKS;

// ────────────────────────────────────────────────────────────────────────
// MAILBOX META
// ────────────────────────────────────────────────────────────────────────
export const MAILBOX_META: Record<
  Mailbox,
  { address: string; headline: { when: string; message: string } }
> = {
  requisitions: {
    address: 'requisitions@ellicorp.com',
    headline: {
      when: 'Tuesday, July 7',
      message:
        '7 threads in our court. Two clocks ticking: DCAS package due Jul 10 · Hip Hop Draw 19 closes Jul 17. Clear the signatures first — two waivers release ~$414K.',
    },
  },
  procurement: {
    address: 'procurement@ellicorp.com',
    headline: {
      when: 'Tuesday, July 7',
      message:
        '2 invoices ready for 2-way match approval — clear those and Monthly Bills has $22,740 queued to pay. Boyland hardware lands Friday.',
    },
  },
  contracts: {
    address: 'contracts@ellicorp.com',
    headline: {
      when: 'Tuesday, July 7',
      message:
        '2 signatures due this week — Mount Sinai insurance exhibit + Boyland CCO-4. Bond renewal decision by Aug 1. Whiting-Turner prequal due Jul 25.',
    },
  },
};
