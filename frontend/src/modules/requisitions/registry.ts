// Project registry — the front door of the module. Everything here is
// DERIVED from data.ts (reqs, SOVs, COs, docs, skipped months); nothing is
// stored twice. Cofount: these become the server-side aggregates behind a
// projects-list endpoint.
import {
  PROJECTS, REQUISITIONS, DOC_REQUIREMENTS, DOC_RECORDS, SKIPPED_MONTHS, CURRENT_MONTH,
  getProject, getSov, getSkippedMonth, getRecordsForReq, getChangeOrdersForProject,
  getApprovedCoValueForProject, getPendingCoValueForProject,
  billingDatesForMonth, reqAging, avgDaysToPaid, latestOneTimeRecord, todayIso, daysBetween,
  type Project, type Requisition, type SkippedMonth, type DocRecord,
} from './data';
import {
  LIFECYCLE_ORDER, STAGE_META, SOV_STATUS_META, CO_STATUS_META, CLOSEOUT_META,
  type Lifecycle, type Stage, type CloseoutStep,
} from './stages';
import { usd } from './format';

const BILLED: Stage[] = ['final', 'approved', 'paid'];
const OPEN: Stage[] = ['final', 'approved'];
const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (rows: Requisition[]) => rows.reduce((s, r) => s + r.amount, 0);

// ────────────────────────────────────────────────────────────────────────
// Money — all figures gross of retainage (the way the team reads a G702)
// ────────────────────────────────────────────────────────────────────────
export interface ProjectFinancials {
  originalContract: number;
  approvedCos: number;
  pendingCos: number;
  currentContract: number;      // original + approved COs
  billedToDate: number;         // prior billing + every progress req that went Final or beyond
  paidToDate: number;           // prior paid + paid progress reqs
  outstanding: number;          // submitted, not paid — progress + retention bills
  leftToBill: number;           // currentContract − billedToDate
  pctBilled: number;            // 0–100, one decimal
  retentionHeld: number;        // what the GC holds: prior + retainage% × new billing − retention already billed
  retentionBilled: number;      // retention bills that have gone out
  avgDaysToPaid?: number;
}

export function projectFinancials(projectId: string): ProjectFinancials {
  const p = getProject(projectId);
  const reqs = REQUISITIONS.filter(r => r.projectId === projectId);
  const progress = reqs.filter(r => !r.isRetentionBill);
  const retention = reqs.filter(r => r.isRetentionBill);
  const prior = p?.priorBilling;
  const pct = p?.retainagePct ?? 10;

  const originalContract = p?.contractValue ?? 0;
  const approvedCos = getApprovedCoValueForProject(projectId);
  const pendingCos = getPendingCoValueForProject(projectId);
  const currentContract = originalContract + approvedCos;
  const newBilled = sum(progress.filter(r => BILLED.includes(r.stage)));
  const billedToDate = (prior?.billed ?? 0) + newBilled;
  const paidToDate = (prior?.paid ?? 0) + sum(progress.filter(r => r.stage === 'paid'));
  const retentionBilled = sum(retention.filter(r => r.stage !== 'draft'));
  const retentionHeld = Math.max(0, (prior?.retentionHeld ?? 0) + (newBilled * pct) / 100 - retentionBilled);
  const outstanding = Math.max(0, (prior ? prior.billed - prior.paid : 0) + sum(reqs.filter(r => OPEN.includes(r.stage))));

  return {
    originalContract, approvedCos, pendingCos, currentContract,
    billedToDate: round2(billedToDate),
    paidToDate: round2(paidToDate),
    outstanding: round2(outstanding),
    leftToBill: round2(Math.max(0, currentContract - billedToDate)),
    pctBilled: currentContract > 0 ? Math.min(100, Math.round((billedToDate / currentContract) * 1000) / 10) : 0,
    retentionHeld: round2(retentionHeld),
    retentionBilled: round2(retentionBilled),
    avgDaysToPaid: avgDaysToPaid(projectId),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Onboarding — six things a project needs before the first pencil goes out.
// All derived: tick one by doing the thing, not by clicking a checkbox.
// ────────────────────────────────────────────────────────────────────────
export type OnboardingKey = 'gc' | 'forms' | 'sov' | 'team' | 'submitTo' | 'startBilling';
export type GoTo = 'project' | 'sov' | 'docs' | 'reqs';
export interface OnboardingStep { key: OnboardingKey; label: string; done: boolean; hint: string; goTo: GoTo }

export function onboardingSteps(projectId: string): OnboardingStep[] {
  const p = getProject(projectId);
  const sov = getSov(projectId);
  const contacts = p?.contacts ?? [];
  const forms = DOC_REQUIREMENTS.filter(r => r.projectId === projectId).length;
  const sent = REQUISITIONS.some(r => r.projectId === projectId && r.stage !== 'draft');
  const submitTo = contacts.find(c => c.routes.includes('requisition'));
  return [
    { key: 'gc',           label: 'GC + contacts',      done: !!p?.gc && contacts.length > 0, hint: contacts.length ? `${p?.gc} · ${contacts.length} contact${contacts.length === 1 ? '' : 's'}` : 'Add who gets the requisition', goTo: 'project' },
    { key: 'forms',        label: 'Required documents', done: forms > 0,                       hint: forms ? `${forms} form${forms === 1 ? '' : 's'} ride with every final` : 'Set the monthly forms', goTo: 'docs' },
    { key: 'sov',          label: 'SOV approved',       done: sov?.status === 'approved',      hint: sov ? SOV_STATUS_META[sov.status].label : "No SOV yet — upload the GC's Excel", goTo: 'sov' },
    { key: 'team',         label: 'Owner assigned',     done: !!p?.owner,                      hint: p?.owner ? `Owner ${p.owner}` : 'Assign an owner', goTo: 'project' },
    { key: 'submitTo',     label: 'Submit-to contact',  done: !!submitTo,                      hint: submitTo ? `${submitTo.name} · ${submitTo.email}` : 'Route "Requisitions" to a contact', goTo: 'project' },
    { key: 'startBilling', label: 'First pencil sent',  done: sent,                            hint: sent ? 'Billing' : 'Create the first requisition and send the pencil', goTo: 'reqs' },
  ];
}

// ────────────────────────────────────────────────────────────────────────
// Close-out — the one next step on a fully billed project
// ────────────────────────────────────────────────────────────────────────
export interface Closeout {
  step: CloseoutStep;
  detail: string;
  retentionHeld: number;
  outstanding: number;
  retentionReq?: Requisition;
}

export function closeoutFor(projectId: string): Closeout {
  const fin = projectFinancials(projectId);
  const reqs = REQUISITIONS.filter(r => r.projectId === projectId);
  const open = reqs.filter(r => OPEN.includes(r.stage));
  const retentionReq = reqs.find(r => r.isRetentionBill);
  const base = { retentionHeld: fin.retentionHeld, outstanding: fin.outstanding, retentionReq };
  if (open.length) {
    const worst = Math.max(...open.map(r => reqAging(r).daysLate));
    return {
      ...base, step: 'waitingForPayment',
      detail: `${open.length} requisition${open.length === 1 ? '' : 's'} out · ${usd(fin.outstanding)}${worst > 0 ? ` · ${worst}d late` : ''}`,
    };
  }
  if (retentionReq && retentionReq.stage === 'draft') {
    return { ...base, step: 'billRetention', detail: `Retention bill #${retentionReq.seq} drafted — send it · ${usd(retentionReq.amount)}` };
  }
  if (fin.retentionHeld > 0 && !retentionReq) {
    return { ...base, step: 'billRetention', detail: `${usd(fin.retentionHeld)} held by the GC — bill it` };
  }
  return { ...base, step: 'archive', detail: 'Paid in full, retention released — archive' };
}

// ────────────────────────────────────────────────────────────────────────
// Documents — what is open / past due / expiring on this project
// ────────────────────────────────────────────────────────────────────────
export interface DocsSummary {
  openMonthly: number;          // monthly docs not filed on reqs at pencil / returned / final
  pastDueMonthly: number;       // …where the GC's due date for that month has passed
  oneTimeTotal: number;
  oneTimeMissing: number;       // never filed or expired
  oneTimeExpiringSoon: number;  // within 30 days
  nextExpiry?: { form: string; on: string };
}

export function docsSummaryFor(projectId: string): DocsSummary {
  const p = getProject(projectId);
  const today = todayIso();
  let openMonthly = 0;
  let pastDueMonthly = 0;
  if (p) {
    const gated = REQUISITIONS.filter(r => r.projectId === projectId && (r.stage === 'pencil' || r.stage === 'returned' || r.stage === 'final'));
    for (const req of gated) {
      const gcDue = billingDatesForMonth(p, req.month).gcDue;
      for (const { requirement, record } of getRecordsForReq(req)) {
        if (requirement.cadence === 'oneTime' || record.status === 'filed') continue;
        openMonthly++;
        if (gcDue < today) pastDueMonthly++;
      }
    }
  }
  let oneTimeTotal = 0;
  let oneTimeMissing = 0;
  let oneTimeExpiringSoon = 0;
  let nextExpiry: DocsSummary['nextExpiry'];
  for (const requirement of DOC_REQUIREMENTS.filter(r => r.projectId === projectId && r.cadence === 'oneTime')) {
    oneTimeTotal++;
    const latest = latestOneTimeRecord(requirement.id);
    if (!latest) { oneTimeMissing++; continue; }
    if (!latest.expiresOn) continue;
    const left = daysBetween(today, latest.expiresOn);
    if (left < 0) { oneTimeMissing++; continue; }
    if (left <= 30) oneTimeExpiringSoon++;
    if (!nextExpiry || latest.expiresOn < nextExpiry.on) nextExpiry = { form: requirement.form, on: latest.expiresOn };
  }
  return { openMonthly, pastDueMonthly, oneTimeTotal, oneTimeMissing, oneTimeExpiringSoon, nextExpiry };
}

// ────────────────────────────────────────────────────────────────────────
// Month timeline — one row per month, newest first (Siteline's pay-app list)
// ────────────────────────────────────────────────────────────────────────
export type MonthState = 'none' | 'skipped' | Stage;
export interface MonthRow { month: string; isCurrent: boolean; state: MonthState; req?: Requisition; skipped?: SkippedMonth }

export function nextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthTimeline(projectId: string): MonthRow[] {
  const p = getProject(projectId);
  const reqs = REQUISITIONS.filter(r => r.projectId === projectId);
  const own = [...reqs.map(r => r.month), ...SKIPPED_MONTHS.filter(s => s.projectId === projectId).map(s => s.month)].sort();
  let from = p?.priorBilling ? nextMonth(p.priorBilling.through) : (own[0] ?? CURRENT_MONTH);
  if (from > CURRENT_MONTH) from = CURRENT_MONTH;
  const rows: MonthRow[] = [];
  for (let m = from; m <= CURRENT_MONTH; m = nextMonth(m)) {
    const req = reqs.find(r => r.month === m && !r.isRetentionBill) ?? reqs.find(r => r.month === m);
    const skipped = getSkippedMonth(projectId, m);
    rows.push({ month: m, isCurrent: m === CURRENT_MONTH, req, skipped, state: req ? req.stage : skipped ? 'skipped' : 'none' });
  }
  return rows.reverse();
}

// ────────────────────────────────────────────────────────────────────────
// Snapshot — one row of the registry. nextAction is the single line that
// tells you what to do on this project today.
// ────────────────────────────────────────────────────────────────────────
export type Urgency = 'late' | 'due' | 'ok' | 'idle';
export interface ProjectSnapshot {
  project: Project;
  fin: ProjectFinancials;
  thisMonth: { state: MonthState; req?: Requisition; skipped?: SkippedMonth };
  openReqs: Requisition[];      // final / approved, not paid — oldest first
  daysLate: number;             // worst open requisition
  docs: DocsSummary;
  onboarding: OnboardingStep[];
  onboardingDone: number;
  closeout?: Closeout;          // fully billed only
  nextAction: string;
  urgency: Urgency;
}

export function projectSnapshot(projectId: string): ProjectSnapshot | undefined {
  const project = getProject(projectId);
  if (!project) return undefined;
  const fin = projectFinancials(projectId);
  const reqs = REQUISITIONS.filter(r => r.projectId === projectId);
  const req = reqs.find(r => r.month === CURRENT_MONTH && !r.isRetentionBill) ?? reqs.find(r => r.month === CURRENT_MONTH);
  const skipped = getSkippedMonth(projectId, CURRENT_MONTH);
  const thisMonth: ProjectSnapshot['thisMonth'] = { state: req ? req.stage : skipped ? 'skipped' : 'none', req, skipped };
  const openReqs = reqs.filter(r => OPEN.includes(r.stage)).sort((a, b) => a.month.localeCompare(b.month));
  const daysLate = openReqs.reduce((m, r) => Math.max(m, reqAging(r).daysLate), 0);
  const docs = docsSummaryFor(projectId);
  const onboarding = onboardingSteps(projectId);
  const onboardingDone = onboarding.filter(s => s.done).length;
  const closeout = project.lifecycle === 'fullyBilled' ? closeoutFor(projectId) : undefined;
  const { nextAction, urgency } = nextActionFor(project, thisMonth, openReqs, daysLate, docs, onboarding, closeout);
  return { project, fin, thisMonth, openReqs, daysLate, docs, onboarding, onboardingDone, closeout, nextAction, urgency };
}

function nextActionFor(
  project: Project,
  thisMonth: ProjectSnapshot['thisMonth'],
  openReqs: Requisition[],
  daysLate: number,
  docs: DocsSummary,
  onboarding: OnboardingStep[],
  closeout: Closeout | undefined,
): { nextAction: string; urgency: Urgency } {
  if (project.lifecycle === 'archived') {
    return { nextAction: project.archivedAt ? `Archived ${fmtShort(project.archivedAt)}` : 'Archived', urgency: 'idle' };
  }
  if (project.lifecycle === 'onboarding') {
    const next = onboarding.find(s => !s.done);
    return next
      ? { nextAction: `Set up · ${next.label}`, urgency: 'due' }
      : { nextAction: 'Ready — start billing', urgency: 'due' };
  }
  if (project.lifecycle === 'fullyBilled' && closeout) {
    return {
      nextAction: `${CLOSEOUT_META[closeout.step].label} · ${closeout.detail}`,
      urgency: daysLate > 0 ? 'late' : closeout.step === 'archive' ? 'ok' : 'due',
    };
  }
  // Active — most urgent thing first
  if (daysLate > 0) {
    const worst = openReqs.find(r => reqAging(r).daysLate === daysLate) ?? openReqs[0];
    return { nextAction: `Chase payment · #${worst.seq} ${usd(worst.amount)} · ${daysLate}d late`, urgency: 'late' };
  }
  if (docs.pastDueMonthly > 0) {
    return { nextAction: `${docs.pastDueMonthly} document${docs.pastDueMonthly === 1 ? '' : 's'} past due — collect`, urgency: 'late' };
  }
  const dates = billingDatesForMonth(project, CURRENT_MONTH);
  const mon = fmtMonthShort(CURRENT_MONTH);
  const r = thisMonth.req;
  if (r) {
    if (r.stage === 'draft') return { nextAction: `Finish ${mon} draft · pencil due ${fmtShort(dates.gcDue)}`, urgency: dates.internalDue < todayIso() ? 'late' : 'due' };
    if (r.stage === 'pencil') return { nextAction: 'Pencil with GC — waiting for markups', urgency: 'ok' };
    if (r.stage === 'returned') return { nextAction: 'Returned by GC — revise + resubmit final', urgency: 'due' };
    if (r.stage === 'paid') return { nextAction: `${mon} paid`, urgency: 'ok' };
    const a = reqAging(r);
    return { nextAction: `${STAGE_META[r.stage].label} · payment due ${a.dueOn ? fmtShort(a.dueOn) : '—'}`, urgency: 'ok' };
  }
  if (thisMonth.skipped) {
    return { nextAction: `Not billing ${mon}${thisMonth.skipped.reason ? ` · ${thisMonth.skipped.reason}` : ''}`, urgency: 'idle' };
  }
  if (docs.oneTimeMissing > 0) {
    return { nextAction: `${docs.oneTimeMissing} one-time doc${docs.oneTimeMissing === 1 ? '' : 's'} expired — renew before billing`, urgency: 'late' };
  }
  return { nextAction: `Start ${mon} requisition · by ${fmtShort(dates.start)}`, urgency: dates.start < todayIso() ? 'late' : 'due' };
}

const URGENCY_RANK: Record<Urgency, number> = { late: 0, due: 1, ok: 2, idle: 3 };

export function allProjectSnapshots(): ProjectSnapshot[] {
  return PROJECTS
    .map(p => projectSnapshot(p.id))
    .filter((s): s is ProjectSnapshot => !!s)
    .sort((a, b) =>
      LIFECYCLE_ORDER.indexOf(a.project.lifecycle) - LIFECYCLE_ORDER.indexOf(b.project.lifecycle)
      || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]
      || a.project.name.localeCompare(b.project.name));
}

export function lifecycleCounts(): Record<Lifecycle, number> {
  const c: Record<Lifecycle, number> = { onboarding: 0, active: 0, fullyBilled: 0, archived: 0 };
  for (const p of PROJECTS) c[p.lifecycle]++;
  return c;
}

// ────────────────────────────────────────────────────────────────────────
// Activity — everything that happened on this project, newest first
// ────────────────────────────────────────────────────────────────────────
export interface ActivityEntry { at: string; kind: 'req' | 'sov' | 'co' | 'doc' | 'skip' | 'project'; text: string; by: string }

export function projectActivity(projectId: string, limit = 40): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  for (const r of REQUISITIONS.filter(r => r.projectId === projectId)) {
    for (const h of r.history) {
      out.push({ at: h.at, kind: 'req', by: h.by, text: `Req #${r.seq}${r.isRetentionBill ? ' (retention)' : ''} → ${STAGE_META[h.stage].label}${h.cause ? ` · ${h.cause}` : ''}` });
    }
  }
  const sov = getSov(projectId);
  if (sov) {
    for (const h of sov.history) {
      out.push({ at: h.at, kind: 'sov', by: h.by, text: `SOV rev ${sov.rev} → ${SOV_STATUS_META[h.status].label}${h.note ? ` · ${h.note}` : ''}` });
    }
  }
  for (const co of getChangeOrdersForProject(projectId)) {
    for (const h of co.history) {
      out.push({ at: h.at, kind: 'co', by: h.by, text: `${co.number} → ${CO_STATUS_META[h.status].label}${h.note ? ` · ${h.note}` : ''}` });
    }
  }
  const filed = DOC_RECORDS.filter((d): d is DocRecord & { filedAt: string } => d.projectId === projectId && d.status === 'filed' && !!d.filedAt);
  for (const dc of filed) {
    const form = DOC_REQUIREMENTS.find(r => r.id === dc.requirementId)?.form ?? 'Document';
    out.push({ at: dc.filedAt, kind: 'doc', by: 'AC', text: `${form} filed · ${fmtMonthLong(dc.month)}` });
  }
  for (const s of SKIPPED_MONTHS.filter(s => s.projectId === projectId)) {
    out.push({ at: s.at, kind: 'skip', by: s.by, text: `Not billing ${fmtMonthLong(s.month)}${s.reason ? ` · ${s.reason}` : ''}` });
  }
  const p = getProject(projectId);
  if (p?.archivedAt) out.push({ at: p.archivedAt, kind: 'project', by: 'system', text: 'Project archived' });
  if (p?.priorBilling) out.push({ at: `${p.priorBilling.through}-28`, kind: 'project', by: 'system', text: p.priorBilling.note });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// ────────────────────────────────────────────────────────────────────────
// Local formatters (data.ts keeps its own private copies)
// ────────────────────────────────────────────────────────────────────────
function fmtShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}
function fmtMonthLong(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
