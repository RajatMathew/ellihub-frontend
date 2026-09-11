// One project, everything about it — the drawer behind every card and row in
// the Projects tab. Same right-side drawer pattern as CoDetail: fixed to the
// right edge, 540px, header with a × , scrolling body of sections.
//
// Sections, top to bottom: money → the one next action → whatever this
// project's lifecycle needs (set up · month timeline · close out · archived)
// → contacts → billing calendar → notes → documents → activity.
import { useEffect, useRef, useState } from 'react';

import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { cn } from '@app/lib/utils';

import { ChipPill, Field, fmtDate, fmtMonth, usd } from './format';
import {
  CONTACT_ROUTE_META,
  CURRENT_MONTH,
  addContact,
  billingDatesForMonth,
  createDraftReq,
  createRetentionBill,
  getProject,
  markReqPaid,
  removeContact,
  reqAging,
  setBillingSchedule,
  setLifecycle,
  setProjectNotes,
  setRetainagePct,
  skipMonth,
  startRuleLabel,
  toggleContactRoute,
  unskipMonth,
  type ContactRoute,
  type GcContact,
  type Requisition,
} from './data';
import {
  closeoutFor,
  docsSummaryFor,
  monthTimeline,
  onboardingSteps,
  projectActivity,
  projectFinancials,
  projectSnapshot,
  type MonthRow,
  type OnboardingStep,
  type Urgency,
} from './registry';
import { CLOSEOUT_META, LIFECYCLE_META, STAGE_META } from './stages';

// The four tabs of the module — what "Go →" jumps to.
export type ModuleTab = 'sov' | 'reqs' | 'cos' | 'docs';

const FRAUNCES = { fontFamily: "'Fraunces','Georgia',serif" };
const LABEL = 'font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground';

// STAGE_META carries an 'ok' tone that ChipPill does not know about.
type ChipTone = 'clay' | 'primary' | 'warning' | 'neutral' | 'success' | 'danger';
const TONE: Record<'neutral' | 'warning' | 'clay' | 'primary' | 'success' | 'ok' | 'danger', ChipTone> = {
  neutral: 'neutral', warning: 'warning', clay: 'clay', primary: 'primary',
  success: 'success', ok: 'success', danger: 'danger',
};

const CLAY = 'text-[#c75e40]';

function urgencyText(u: Urgency): string {
  if (u === 'late') return CLAY;
  if (u === 'due') return 'text-[#b8860b]';
  if (u === 'ok') return 'text-[#2d6a4f]';
  return 'text-muted-foreground';
}
function urgencyBorder(u: Urgency): string {
  if (u === 'late') return 'border-[#c75e40]';
  if (u === 'due') return 'border-[#b8860b]';
  if (u === 'ok') return 'border-[#2d6a4f]';
  return 'border-border';
}

// "Jul 13" — the computed billing dates read better without the year.
const md = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ROUTE_KEYS: ContactRoute[] = ['requisition', 'changeOrder', 'documents', 'payment'];

const asInt = (value: string, fallback: number) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

// ────────────────────────────────────────────────────────────────────────
export function ProjectDetail({
  projectId, onClose, onGoTo,
}: {
  projectId: string;
  onClose: () => void;
  onGoTo?: (target: ModuleTab) => void;
}) {
  const [, bump] = useState(0);
  const contactsRef = useRef<HTMLElement | null>(null);
  const [notes, setNotes] = useState(getProject(projectId)?.notes ?? '');

  useEffect(() => {
    const h = () => bump(n => n + 1);
    window.addEventListener('reqs-changed', h);
    return () => window.removeEventListener('reqs-changed', h);
  }, []);

  const project = getProject(projectId);
  const snap = projectSnapshot(projectId);
  if (!project || !snap) return null;

  const fin = projectFinancials(projectId);
  const lifecycle = LIFECYCLE_META[project.lifecycle];
  const goToContacts = () => contactsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-[540px] max-w-full bg-card border-l border-border shadow-xl flex flex-col"
      role="dialog"
    >
      <header className="shrink-0 px-5 py-4 border-b border-border flex items-baseline gap-3">
        <div className="min-w-0 flex-1">
          <p className={LABEL}>
            {project.gc}{project.gcProjectNumber ? ` · ${project.gcProjectNumber}` : ''}
          </p>
          <h2 className="text-[17px] font-semibold truncate" style={FRAUNCES}>{project.name}</h2>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <ChipPill tone={TONE[lifecycle.tone]}>{lifecycle.label}</ChipPill>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Owner {project.owner} · {project.channel} · {project.paymentTerms}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-[16px]"
          title="Close"
        >
          ×
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {/* 1 · Money ------------------------------------------------------ */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <Kpi
              label="Current contract"
              value={usd(fin.currentContract)}
              sub={`${usd(fin.originalContract)} + ${usd(fin.approvedCos)} COs`}
            />
            <Kpi label="Billed to date" value={usd(fin.billedToDate)} sub={`${fin.pctBilled}% billed`} />
            <Kpi label="Paid to date" value={usd(fin.paidToDate)} tone="ok" />
            <Kpi label="Outstanding" value={usd(fin.outstanding)} tone={fin.outstanding > 0 ? 'warn' : undefined} />
            <Kpi label="Left to bill" value={usd(fin.leftToBill)} />
            <Kpi label="Retention held" value={usd(fin.retentionHeld)} sub={`${project.retainagePct}% of billing`} />
            <Kpi
              label="Avg days to paid"
              value={fin.avgDaysToPaid !== undefined ? `${fin.avgDaysToPaid}d` : '—'}
            />
          </div>
          {project.priorBilling && (
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">{project.priorBilling.note}</p>
          )}
        </section>

        {/* 2 · Next action ------------------------------------------------ */}
        <section
          className={cn(
            'rounded-md border-l-2 bg-muted/40 px-3 py-2.5',
            urgencyBorder(snap.urgency)
          )}
        >
          <p className={LABEL}>Next action</p>
          <p className={cn('text-[13px] font-semibold mt-0.5', urgencyText(snap.urgency))}>
            {snap.nextAction}
          </p>
        </section>

        {/* 3 · Whatever this lifecycle needs ------------------------------ */}
        {project.lifecycle === 'onboarding' && (
          <OnboardingBlock projectId={projectId} onGoTo={onGoTo} onGoToContacts={goToContacts} />
        )}
        {project.lifecycle === 'active' && (
          <TimelineBlock projectId={projectId} onGoTo={onGoTo} />
        )}
        {project.lifecycle === 'fullyBilled' && (
          <CloseoutBlock projectId={projectId} openReqs={snap.openReqs} onGoTo={onGoTo} />
        )}
        {project.lifecycle === 'archived' && (
          <Section title="Archived">
            <div className="flex items-center gap-3">
              <p className="text-[12.5px]">
                Archived {project.archivedAt ? fmtDate(project.archivedAt) : '—'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setLifecycle(projectId, 'active')}
              >
                Reopen
              </Button>
            </div>
          </Section>
        )}

        {/* 4 · Contacts --------------------------------------------------- */}
        <ContactsBlock projectId={projectId} contacts={project.contacts} sectionRef={contactsRef} />

        {/* 5 · Billing settings ------------------------------------------- */}
        <BillingBlock projectId={projectId} />

        {/* 6 · Notes ------------------------------------------------------ */}
        <Section title="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => setProjectNotes(projectId, notes)}
            rows={3}
            placeholder="Anything the team needs to know before billing this job."
            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-[12px] leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Shown on every requisition.</p>
        </Section>

        {/* 7 · Documents --------------------------------------------------- */}
        <DocsBlock projectId={projectId} onGoTo={onGoTo} />

        {/* 8 · Activity ---------------------------------------------------- */}
        <ActivityBlock projectId={projectId} />
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Onboarding — the six things, and the button that ends onboarding
// ────────────────────────────────────────────────────────────────────────
function OnboardingBlock({
  projectId, onGoTo, onGoToContacts,
}: {
  projectId: string;
  onGoTo?: (t: ModuleTab) => void;
  onGoToContacts: () => void;
}) {
  const steps = onboardingSteps(projectId);
  const ready = steps.filter(s => s.key !== 'startBilling').every(s => s.done);

  const go = (target: OnboardingStep['goTo']) => {
    if (target === 'project') onGoToContacts();
    else onGoTo?.(target);
  };

  return (
    <Section title="Set up">
      <ul className="divide-y divide-border/60">
        {steps.map(step => (
          <li key={step.key} className="flex items-start gap-2.5 py-2">
            <span
              className={cn(
                'text-[13px] leading-5 w-4 shrink-0 text-center',
                step.done ? 'text-[#2d6a4f]' : 'text-muted-foreground'
              )}
            >
              {step.done ? '✓' : '○'}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-[12.5px] font-semibold', !step.done && 'text-muted-foreground')}>
                {step.label}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{step.hint}</p>
            </div>
            {!step.done && (
              <button
                type="button"
                onClick={() => go(step.goTo)}
                className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
              >
                Go →
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          disabled={!ready}
          onClick={() => { createDraftReq(projectId); onGoTo?.('reqs'); }}
        >
          Start billing — create first requisition
        </Button>
        {!ready && <p className="text-[11px] text-muted-foreground">finish setup first</p>}
      </div>
    </Section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Month timeline — one row per month, newest first
// ────────────────────────────────────────────────────────────────────────
function TimelineBlock({ projectId, onGoTo }: { projectId: string; onGoTo?: (t: ModuleTab) => void }) {
  const rows = monthTimeline(projectId);
  return (
    <Section title="Month by month">
      <div className="rounded-md border border-border overflow-hidden">
        {rows.map(row => (
          <TimelineRow key={row.month} projectId={projectId} row={row} onGoTo={onGoTo} />
        ))}
      </div>
    </Section>
  );
}

function TimelineRow({
  projectId, row, onGoTo,
}: {
  projectId: string;
  row: MonthRow;
  onGoTo?: (t: ModuleTab) => void;
}) {
  const stage = row.req ? STAGE_META[row.req.stage] : null;
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 text-[12px] border-b border-border/60 last:border-b-0',
        row.isCurrent && 'bg-muted/30',
        row.req && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={row.req ? () => onGoTo?.('reqs') : undefined}
    >
      <span className="font-mono text-[11px] text-muted-foreground w-28 shrink-0">{fmtMonth(row.month)}</span>

      {row.req && stage && (
        <>
          <span className="font-semibold">Req #{row.req.seq}</span>
          <span className="tabular-nums">{usd(row.req.amount)}</span>
          <span className="ml-auto"><ChipPill tone={TONE[stage.tone]}>{stage.label}</ChipPill></span>
        </>
      )}

      {!row.req && row.skipped && (
        <>
          <span className="text-muted-foreground italic">
            Not billing this month{row.skipped.reason ? ` · ${row.skipped.reason}` : ''}
          </span>
          <button
            type="button"
            onClick={() => unskipMonth(projectId, row.month)}
            className="ml-auto text-[11px] font-semibold text-primary hover:underline shrink-0"
          >
            Undo
          </button>
        </>
      )}

      {!row.req && !row.skipped && (
        <>
          <span className="text-muted-foreground">—</span>
          {row.isCurrent ? (
            <span className="ml-auto flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => { createDraftReq(projectId, row.month); onGoTo?.('reqs'); }}
              >
                Start requisition
              </Button>
              <Button size="sm" variant="outline" onClick={() => skipMonth(projectId, CURRENT_MONTH)}>
                Not billing this month
              </Button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => skipMonth(projectId, row.month)}
              className="ml-auto text-[11px] font-semibold text-muted-foreground hover:text-foreground shrink-0"
            >
              Skip
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Close-out — the one next step on a fully billed job
// ────────────────────────────────────────────────────────────────────────
function CloseoutBlock({
  projectId, openReqs, onGoTo,
}: {
  projectId: string;
  openReqs: Requisition[];
  onGoTo?: (t: ModuleTab) => void;
}) {
  const closeout = closeoutFor(projectId);
  const meta = CLOSEOUT_META[closeout.step];
  return (
    <Section title="Close out">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <ChipPill tone={TONE[meta.tone]}>{meta.label}</ChipPill>
          <span className="text-[12px] text-muted-foreground">{closeout.detail}</span>
        </div>

        {closeout.step === 'billRetention' && (
          <Button
            size="sm"
            className="mt-3"
            onClick={() => { createRetentionBill(projectId, closeout.retentionHeld); onGoTo?.('reqs'); }}
          >
            Bill for retention · {usd(closeout.retentionHeld)}
          </Button>
        )}

        {closeout.step === 'archive' && (
          <Button size="sm" className="mt-3" onClick={() => setLifecycle(projectId, 'archived')}>
            Archive project
          </Button>
        )}

        {closeout.step === 'waitingForPayment' && (
          <ul className="mt-3 space-y-2">
            {openReqs.map(req => {
              const aging = reqAging(req);
              return (
                <li key={req.id} className="flex items-center gap-2 text-[11.5px] flex-wrap">
                  <span className="font-semibold">#{req.seq}</span>
                  <span className="tabular-nums">{usd(req.amount)}</span>
                  <span className="text-muted-foreground">
                    submitted {aging.submittedOn ? fmtDate(aging.submittedOn) : '—'} · due {aging.dueOn ? fmtDate(aging.dueOn) : '—'}
                  </span>
                  <span className={cn('font-semibold', aging.daysLate > 0 ? CLAY : 'text-muted-foreground')}>
                    {aging.daysLate}d late
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => markReqPaid(req.id, 'check')}
                  >
                    Mark as paid
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Contacts — who at the GC gets what
// ────────────────────────────────────────────────────────────────────────
function ContactsBlock({
  projectId, contacts, sectionRef,
}: {
  projectId: string;
  contacts: GcContact[];
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [routes, setRoutes] = useState<ContactRoute[]>([]);

  const toggleNewRoute = (r: ContactRoute) =>
    setRoutes(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]));

  const add = () => {
    if (!name.trim() || !email.trim()) return;
    addContact(projectId, {
      name: name.trim(),
      role: role.trim() || 'Contact',
      email: email.trim(),
      phone: phone.trim() || undefined,
      routes,
    });
    setName(''); setRole(''); setEmail(''); setPhone(''); setRoutes([]);
  };

  return (
    <section ref={sectionRef}>
      <p className={cn(LABEL, 'mb-2')}>Contacts</p>

      {contacts.length === 0 && (
        <p className="text-[11.5px] text-muted-foreground italic">
          No contacts yet — add the person who gets the requisition.
        </p>
      )}

      {contacts.length > 0 && (
        <table className="w-full text-[11.5px]">
          <tbody>
            {contacts.map(c => (
              <tr key={c.id} className="border-t border-border/60 align-top">
                <td className="py-2 pr-2">
                  <p className="text-[12px] font-semibold">{c.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">{c.role}</p>
                </td>
                <td className="py-2 pr-2">
                  <a href={`mailto:${c.email}`} className="text-[11px] text-primary hover:underline break-all">
                    {c.email}
                  </a>
                  {c.phone && <p className="font-mono text-[10.5px] text-muted-foreground">{c.phone}</p>}
                </td>
                <td className="py-2 pr-1">
                  <div className="flex flex-wrap gap-1">
                    {ROUTE_KEYS.map(r => {
                      const on = c.routes.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleContactRoute(projectId, c.id, r)}
                          title={on ? `Stop sending ${CONTACT_ROUTE_META[r].label}` : `Send ${CONTACT_ROUTE_META[r].label}`}
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-[0.03em]',
                            on
                              ? 'bg-secondary text-secondary-foreground'
                              : 'border border-border text-muted-foreground hover:bg-accent'
                          )}
                        >
                          {CONTACT_ROUTE_META[r].label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeContact(projectId, c.id)}
                    title="Remove contact"
                    className="text-muted-foreground hover:text-[#c75e40] text-[14px] leading-none"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-3 rounded-md border border-dashed border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="h-8 text-[12px]" />
          <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Role" className="h-8 text-[12px]" />
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="h-8 text-[12px]" />
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="h-8 text-[12px]" />
        </div>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {ROUTE_KEYS.map(r => (
            <label key={r} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={routes.includes(r)}
                onChange={() => toggleNewRoute(r)}
                className="size-3.5"
              />
              {CONTACT_ROUTE_META[r].label}
            </label>
          ))}
          <Button size="sm" className="ml-auto" disabled={!name.trim() || !email.trim()} onClick={add}>
            Add
          </Button>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Billing settings — this GC's rhythm, which every derived date reads
// ────────────────────────────────────────────────────────────────────────
function BillingBlock({ projectId }: { projectId: string }) {
  const project = getProject(projectId);
  if (!project) return null;
  const billing = project.billing;
  const ruleKind = typeof billing.startRule === 'number' ? 'day' : billing.startRule;
  const dates = billingDatesForMonth(project, CURRENT_MONTH);

  return (
    <Section title="Billing settings">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Retention %">
          <Input
            type="number"
            value={project.retainagePct}
            onChange={e => setRetainagePct(projectId, asInt(e.target.value, project.retainagePct))}
            className="h-8 text-[12px] tabular-nums"
          />
        </Field>

        <Field label="Start rule">
          <select
            value={ruleKind}
            onChange={e => {
              const v = e.target.value;
              setBillingSchedule(projectId, {
                startRule: v === 'day' ? 15 : (v === 'firstOfMonth' ? 'firstOfMonth' : 'secondMonday'),
              });
            }}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-[12px]"
          >
            <option value="secondMonday">2nd Monday</option>
            <option value="firstOfMonth">1st of the month</option>
            <option value="day">Day of month</option>
          </select>
        </Field>

        {ruleKind === 'day' && (
          <Field label="Start day">
            <Input
              type="number"
              value={typeof billing.startRule === 'number' ? billing.startRule : 15}
              onChange={e => setBillingSchedule(projectId, {
                startRule: asInt(e.target.value, typeof billing.startRule === 'number' ? billing.startRule : 15),
              })}
              className="h-8 text-[12px] tabular-nums"
            />
          </Field>
        )}

        <Field label="GC due day">
          <Input
            type="number"
            value={billing.dueDay}
            onChange={e => setBillingSchedule(projectId, { dueDay: asInt(e.target.value, billing.dueDay) })}
            className="h-8 text-[12px] tabular-nums"
          />
        </Field>

        <Field label="Internal lead days">
          <Input
            type="number"
            value={billing.internalLeadDays}
            onChange={e => setBillingSchedule(projectId, { internalLeadDays: asInt(e.target.value, billing.internalLeadDays) })}
            className="h-8 text-[12px] tabular-nums"
          />
        </Field>

        <Field label="Net days">
          <Input
            type="number"
            value={billing.netDays}
            onChange={e => setBillingSchedule(projectId, { netDays: asInt(e.target.value, billing.netDays) })}
            className="h-8 text-[12px] tabular-nums"
          />
        </Field>
      </div>

      <p className="mt-2 font-mono text-[10.5px] text-muted-foreground">
        Starts {startRuleLabel(billing.startRule)} — {fmtMonth(CURRENT_MONTH)}: start {md(dates.start)} · internal due {md(dates.internalDue)} · GC due {md(dates.gcDue)} · Net {billing.netDays}
      </p>
    </Section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Documents + Activity
// ────────────────────────────────────────────────────────────────────────
function DocsBlock({ projectId, onGoTo }: { projectId: string; onGoTo?: (t: ModuleTab) => void }) {
  const docs = docsSummaryFor(projectId);
  const valid = docs.oneTimeTotal - docs.oneTimeMissing;
  return (
    <Section title="Documents">
      <p className="text-[12.5px]">
        {docs.openMonthly} open
        <span className="text-muted-foreground"> · </span>
        <span className={cn(docs.pastDueMonthly > 0 && cn(CLAY, 'font-semibold'))}>
          {docs.pastDueMonthly} past due
        </span>
      </p>
      {docs.oneTimeTotal > 0 && (
        <p className="font-mono text-[10.5px] text-muted-foreground mt-1">
          One-time: {valid}/{docs.oneTimeTotal} valid
          {docs.nextExpiry && ` · next expiry: ${docs.nextExpiry.form} ${fmtDate(docs.nextExpiry.on)}`}
          {docs.oneTimeMissing > 0 && (
            <span className={cn(CLAY, 'font-semibold')}> · {docs.oneTimeMissing} expired</span>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={() => onGoTo?.('docs')}
        className="mt-2 text-[11.5px] font-semibold text-primary hover:underline"
      >
        Open documents →
      </button>
    </Section>
  );
}

function ActivityBlock({ projectId }: { projectId: string }) {
  const all = projectActivity(projectId);
  const shown = all.slice(0, 30);
  return (
    <Section title="Activity">
      <ul className="space-y-1">
        {shown.map((a, i) => (
          <li key={`${a.at}-${i}`} className="flex items-baseline gap-2 text-[11.5px]">
            <span className="font-mono text-[10.5px] text-muted-foreground w-24 shrink-0">{fmtDate(a.at)}</span>
            <span className="flex-1 min-w-0">{a.text}</span>
            <span className="font-mono text-[10px] text-muted-foreground shrink-0">{a.by}</span>
          </li>
        ))}
        {all.length > shown.length && (
          <li className="text-[11.5px] text-muted-foreground pl-26">…</li>
        )}
      </ul>
    </Section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Small pieces
// ────────────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className={cn(LABEL, 'mb-2')}>{title}</p>
      {children}
    </section>
  );
}

function Kpi({
  label, value, sub, tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'warn' | 'clay';
}) {
  const color = tone === 'ok' ? '#2d6a4f' : tone === 'warn' ? '#b8860b' : tone === 'clay' ? '#c75e40' : '#1a1410';
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p
        className="text-[14px] font-semibold tabular-nums leading-tight"
        style={{ ...FRAUNCES, color }}
      >
        {value}
      </p>
      {sub && <p className="font-mono text-[9.5px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
