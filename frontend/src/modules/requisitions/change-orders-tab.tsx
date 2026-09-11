import { useEffect, useMemo, useState } from 'react';

import { Button } from '@app/components/ui/button';
import { cn } from '@app/lib/utils';

import { ChipPill, fmtDate, usd, usdShort } from './format';
import { Input } from '@app/components/ui/input';
import {
  CHANGE_ORDERS,
  PROJECTS,
  advanceCoStatus,
  createDraftCo,
  getApprovedCoValueForProject,
  getPendingCoValueForProject,
  getProject,
  type ChangeOrder,
} from './data';
import { CO_STATUS_META, CO_STATUS_ORDER, type CoStatus } from './stages';
import { ViewSwitcher, type ViewMode } from './views';

const TRIGGER_LABEL: Record<ChangeOrder['trigger'], string> = {
  ASI: 'ASI',
  'field-mod': 'Field mod',
  AWP: 'AWP',
  'owner-directive': 'Owner directive',
  code: 'Code',
  VE: 'Value engineering',
};

export function ChangeOrdersTab() {
  const [mode, setMode] = useState<ViewMode>('pipeline');
  const [openCoId, setOpenCoId] = useState<string | null>(null);
  const [newCoOpen, setNewCoOpen] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    const h = () => bump(n => n + 1);
    window.addEventListener('reqs-changed', h);
    return () => window.removeEventListener('reqs-changed', h);
  }, []);

  const totals = useMemo(() => {
    const approved = CHANGE_ORDERS.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
    const pending  = CHANGE_ORDERS.filter(c => c.status === 'inReview' || c.status === 'submitted' || c.status === 'partiallyExecuted').reduce((s, c) => s + c.amount, 0);
    const rejected = CHANGE_ORDERS.filter(c => c.status === 'rejected').reduce((s, c) => s + c.amount, 0);
    return { approved, pending, rejected, count: CHANGE_ORDERS.length };
  }, []);

  const openCo = openCoId ? CHANGE_ORDERS.find(c => c.id === openCoId) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-border bg-background">
        <div className="flex items-baseline gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Elli → GC
            </p>
            <h2 className="text-[18px] font-semibold" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
              Change orders on our contract
            </h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Once approved, the amount flows into the SOV and rolls into the next monthly requisition.
              Subcontractor change orders (SCOs — us → our subs) live on the vendor's record, not here.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <div className="grid grid-cols-4 gap-6">
              <Total label="Approved · added" value={usdShort(totals.approved)} tone="ok" />
              <Total label="Pending"          value={usdShort(totals.pending)}  tone="warn" />
              <Total label="Rejected"         value={totals.rejected !== 0 ? usdShort(totals.rejected) : '—'} tone="clay" />
              <Total label="Total COs"        value={String(totals.count)} />
            </div>
            <Button onClick={() => setNewCoOpen(true)}>+ New CO</Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ViewSwitcher mode={mode} onChange={setMode} />
          <p className="text-[11px] text-muted-foreground">
            {mode === 'pipeline' && 'Project × CO-status matrix · every project across the six stages'}
            {mode === 'board'    && 'Kanban by status · cards flow toward Approved'}
            {mode === 'list'     && 'One row per change order · the CO log'}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {mode === 'pipeline' && <PipelineView onOpen={setOpenCoId} />}
        {mode === 'board'    && <BoardView onOpen={setOpenCoId} />}
        {mode === 'list'     && <ListView onOpen={setOpenCoId} />}
      </div>
      {openCo && <CoDetail co={openCo} onClose={() => setOpenCoId(null)} />}
      {newCoOpen && (
        <NewCoForm
          onClose={() => setNewCoOpen(false)}
          onCreated={(id) => { setNewCoOpen(false); setOpenCoId(id); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// New Change Order form — captures the fields we need to send to the GC.
// The generated CO is a Draft; user then advances to Submitted via the
// detail drawer. Producing the actual GC-branded CO PDF requires their
// blank template — not on Peter's drive yet. When it lands, this form's
// output becomes the fillable overlay on that template.
// ────────────────────────────────────────────────────────────────────────
function NewCoForm({ onClose, onCreated }: { onClose: () => void; onCreated: (coId: string) => void }) {
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [title, setTitle] = useState('');
  const [trigger, setTrigger] = useState<ChangeOrder['trigger']>('ASI');
  const [triggerRef, setTriggerRef] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [daysStr, setDaysStr] = useState('');
  const canSubmit = !!title.trim() && !!amountStr.trim();

  const submit = () => {
    const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
    if (!isFinite(amount)) return;
    const days = daysStr ? parseInt(daysStr, 10) : undefined;
    const co = createDraftCo({
      projectId,
      title: title.trim(),
      trigger,
      triggerRef: triggerRef.trim() || undefined,
      amount,
      daysAdded: days,
    });
    onCreated(co.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-card rounded-lg border border-border shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-border">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Elli → GC
          </p>
          <h2 className="text-[18px] font-semibold mt-0.5" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            New change order
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Draft it here. When Peter drops a blank Gilbane/GC template on the drive, we'll wire it as the fillable output.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <FormField label="Project">
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-[12.5px]"
            >
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>

          <FormField label="Title · what changed">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='e.g. "Corridor casework revision — Level 2"'
              className="h-9 text-[12.5px]"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Trigger">
              <select
                value={trigger}
                onChange={e => setTrigger(e.target.value as ChangeOrder['trigger'])}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-[12.5px]"
              >
                <option value="ASI">ASI · Architect's directive</option>
                <option value="field-mod">Field modification</option>
                <option value="AWP">AWP · Additional work package</option>
                <option value="owner-directive">Owner directive</option>
                <option value="code">Code / permit</option>
                <option value="VE">Value engineering</option>
              </select>
            </FormField>
            <FormField label="Reference (RFI / ASI / doc no.)">
              <Input
                value={triggerRef}
                onChange={e => setTriggerRef(e.target.value)}
                placeholder='e.g. "ASI-22" or "RFI-014"'
                className="h-9 text-[12.5px]"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (+add / −deduct)">
              <Input
                inputMode="decimal"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="$22,180.00"
                className="h-9 text-[12.5px] tabular-nums"
              />
            </FormField>
            <FormField label="Schedule impact · days added">
              <Input
                inputMode="numeric"
                value={daysStr}
                onChange={e => setDaysStr(e.target.value)}
                placeholder="0"
                className="h-9 text-[12.5px] tabular-nums"
              />
            </FormField>
          </div>

          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-md p-3 leading-relaxed">
            <b>What happens on Save:</b> a draft CO is created with the next sequential number for {PROJECTS.find(p => p.id === projectId)?.name.split('—')[0].trim()}. Open the detail drawer to advance the status (Submitted → In review → Approved). Once approved, the amount flows into the SOV and rolls into the next monthly requisition automatically.
          </p>
        </div>

        <footer className="px-5 py-3 border-t border-border flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit} className="ml-auto">
            Save as Draft
          </Button>
        </footer>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Pipeline — project × status matrix, cells show COs at that status
// ────────────────────────────────────────────────────────────────────────
function PipelineView({ onOpen }: { onOpen: (id: string) => void }) {
  const projectsWithCos = PROJECTS.filter(p => CHANGE_ORDERS.some(c => c.projectId === p.id));

  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className="text-[11.5px]" style={{ minWidth: '900px' }}>
        <thead className="bg-muted/40 text-muted-foreground sticky top-0">
          <tr>
            <Th className="w-[220px]">Project</Th>
            {CO_STATUS_ORDER.map(st => (
              <Th key={st} className="text-center whitespace-nowrap">{CO_STATUS_META[st].label}</Th>
            ))}
            <Th className="text-right">Contract Δ</Th>
          </tr>
        </thead>
        <tbody>
          {projectsWithCos.map(p => {
            const projCos = CHANGE_ORDERS.filter(c => c.projectId === p.id);
            const approvedDelta = getApprovedCoValueForProject(p.id);
            const pendingDelta = getPendingCoValueForProject(p.id);
            return (
              <tr key={p.id} className="border-t border-border/60">
                <td className="px-3 py-2">
                  <p className="font-semibold text-[12px]">{p.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">{p.gc}</p>
                </td>
                {CO_STATUS_ORDER.map(st => {
                  const cellCos = projCos.filter(c => c.status === st);
                  if (cellCos.length === 0) {
                    return <td key={st} className="px-2 py-2 text-center align-middle">
                      <span className="inline-block w-full h-6 rounded bg-transparent"></span>
                    </td>;
                  }
                  return (
                    <td key={st} className="px-2 py-2 align-middle">
                      <div className="flex flex-col gap-1 items-center">
                        {cellCos.map(co => (
                          <button
                            key={co.id}
                            type="button"
                            onClick={() => onOpen(co.id)}
                            className={cn(
                              'w-full min-w-[72px] px-1.5 py-1 rounded font-mono font-semibold text-[10px] hover:opacity-80 text-left',
                              statusBg(co.status)
                            )}
                            title={`${co.number} · ${co.title} · ${usd(co.amount)}`}
                          >
                            <span className="block truncate">{co.number}</span>
                            <span className="block text-[9.5px] font-normal opacity-80">{co.amount >= 0 ? '+' : ''}{usdShort(co.amount)}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right tabular-nums">
                  <p className="text-[12px] font-semibold text-[#2d6a4f]">+{usdShort(approvedDelta)}</p>
                  {pendingDelta !== 0 && (
                    <p className="text-[10.5px] text-[#b8860b] font-mono">pending {pendingDelta >= 0 ? '+' : ''}{usdShort(pendingDelta)}</p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-5 py-3 text-[11px] text-muted-foreground">
        Click any CO chip to open its detail drawer. Approved COs increase the contract value that shows up on SOV totals + rolls into future requisitions.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Board — kanban by CO status
// ────────────────────────────────────────────────────────────────────────
function BoardView({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="max-w-full overflow-x-auto pb-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${CO_STATUS_ORDER.length}, minmax(200px, 1fr))` }}>
        {CO_STATUS_ORDER.map(st => {
          const items = CHANGE_ORDERS.filter(c => c.status === st);
          const meta = CO_STATUS_META[st];
          return (
            <div key={st} className="rounded-lg border border-border bg-muted/30 min-w-0">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <span className="text-[12px] font-semibold">{meta.label}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="p-2 space-y-2">
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">column clear</p>
                )}
                {items.map(co => {
                  const project = getProject(co.projectId);
                  return (
                    <button
                      key={co.id}
                      type="button"
                      onClick={() => onOpen(co.id)}
                      className="w-full text-left rounded-md border border-border bg-card p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-[11px] font-semibold">{co.number}</span>
                        <ChipPill tone="neutral">{TRIGGER_LABEL[co.trigger]}</ChipPill>
                      </div>
                      <p className="text-[12.5px] font-semibold leading-snug">{co.title}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">{project?.name.split('—')[0].trim()}</p>
                      <p className={cn(
                        'text-[13px] font-semibold tabular-nums mt-2',
                        co.amount >= 0 ? 'text-[#2d6a4f]' : 'text-[#c75e40]'
                      )}>
                        {co.amount >= 0 ? '+' : ''}{usd(co.amount)}
                      </p>
                      {co.daysAdded ? (
                        <p className="text-[10.5px] text-muted-foreground mt-0.5">+{co.daysAdded} days</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// List — the CO log
// ────────────────────────────────────────────────────────────────────────
function ListView({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="max-w-6xl mx-auto rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <Th>CO #</Th>
            <Th>Project</Th>
            <Th>Title</Th>
            <Th>Trigger</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-right">Days</Th>
            <Th>Status</Th>
            <Th>Submitted</Th>
            <Th>Approved</Th>
            <Th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {CHANGE_ORDERS.map(co => {
            const project = getProject(co.projectId);
            const st = CO_STATUS_META[co.status];
            return (
              <tr
                key={co.id}
                className="border-t border-border/60 hover:bg-muted/30 cursor-pointer"
                onClick={() => onOpen(co.id)}
              >
                <td className="px-3 py-2.5 font-mono text-[11.5px] font-semibold">{co.number}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{project?.name.split('—')[0].trim()}</td>
                <td className="px-3 py-2.5">{co.title}</td>
                <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                  {TRIGGER_LABEL[co.trigger]}{co.triggerRef ? ` · ${co.triggerRef}` : ''}
                </td>
                <td className={cn(
                  'px-3 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap',
                  co.amount >= 0 ? 'text-[#2d6a4f]' : 'text-[#c75e40]'
                )}>
                  {co.amount >= 0 ? '+' : ''}{usd(co.amount)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {co.daysAdded ? `+${co.daysAdded}d` : '—'}
                </td>
                <td className="px-3 py-2.5"><ChipPill tone={st.tone}>{st.label}</ChipPill></td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{co.dateSubmitted ? fmtDate(co.dateSubmitted) : '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{co.dateApproved ? fmtDate(co.dateApproved) : '—'}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-[11px] font-semibold text-primary">Open →</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Detail — one CO drawer, with file preview + status advance
// ────────────────────────────────────────────────────────────────────────
function CoDetail({ co, onClose }: { co: ChangeOrder; onClose: () => void }) {
  const project = getProject(co.projectId);
  const [, bump] = useState(0);
  if (!project) return null;

  const st = CO_STATUS_META[co.status];
  const nextStatus = (): CoStatus | null => {
    const i = CO_STATUS_ORDER.indexOf(co.status);
    if (i < 0 || i >= CO_STATUS_ORDER.length - 2) return null; // stop before 'approved' — that requires signal
    return CO_STATUS_ORDER[i + 1];
  };
  const advance = (next: CoStatus) => { advanceCoStatus(co.id, next, 'AC', 'manual'); bump(n => n + 1); };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-[540px] bg-card border-l border-border shadow-xl flex flex-col"
      role="dialog"
    >
      <header className="shrink-0 px-5 py-4 border-b border-border flex items-baseline gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {project.gc} · {co.gcNumber ?? co.number}
          </p>
          <h2 className="text-[17px] font-semibold truncate" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            {co.number} — {co.title}
          </h2>
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
        <section>
          <div className="flex items-baseline gap-3 flex-wrap">
            <p
              className={cn(
                'text-[28px] font-semibold tabular-nums leading-none',
                co.amount >= 0 ? 'text-[#2d6a4f]' : 'text-[#c75e40]'
              )}
              style={{ fontFamily: "'Fraunces','Georgia',serif" }}
            >
              {co.amount >= 0 ? '+' : ''}{usd(co.amount)}
            </p>
            <ChipPill tone={st.tone}>{st.label}</ChipPill>
            {co.daysAdded ? <ChipPill tone="warning">+{co.daysAdded} days</ChipPill> : null}
            <ChipPill tone="neutral">{TRIGGER_LABEL[co.trigger]}{co.triggerRef ? ` · ${co.triggerRef}` : ''}</ChipPill>
          </div>
        </section>

        {co.fileUri && (
          <section className="rounded-md border border-border bg-muted/30 overflow-hidden">
            <div className="p-3 flex items-center gap-3 flex-wrap border-b border-border/60">
              <span className="text-[20px]">📄</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold truncate">{co.fileName}</p>
                <p className="text-[10.5px] text-muted-foreground font-mono">Change order document · rendered below</p>
              </div>
              <a href={co.fileUri} className="text-[11.5px] font-semibold px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">↓ Download</a>
              <a href={co.fileUri} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold px-2.5 py-1 rounded border border-border hover:bg-accent">Open</a>
            </div>
            <iframe
              src={co.fileUri + '#toolbar=1&view=FitH'}
              title={co.fileName}
              className="w-full"
              style={{ height: 420, border: 'none' }}
            />
          </section>
        )}

        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">Advance status</h3>
          <div className="flex flex-wrap items-center gap-2">
            {nextStatus() && (
              <Button size="sm" onClick={() => advance(nextStatus()!)}>
                → {CO_STATUS_META[nextStatus()!].label}
              </Button>
            )}
            {co.status !== 'approved' && (
              <Button size="sm" variant="outline" onClick={() => advance('approved')}>
                Mark approved
              </Button>
            )}
            {co.status !== 'rejected' && (
              <Button size="sm" variant="outline" onClick={() => advance('rejected')}>
                Mark rejected
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            When this CO is marked approved, its amount rolls into the SOV total for {project.name.split('—')[0].trim()} and is billable on the next monthly requisition.
          </p>
        </section>

        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">History</h3>
          <ul className="space-y-1.5 text-[12px]">
            {co.history.map((h, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-muted-foreground w-24">{h.at}</span>
                <span className="font-semibold w-40">{CO_STATUS_META[h.status].label}</span>
                <span className="text-muted-foreground text-[11.5px]">
                  {h.by === 'system' ? 'system' : `by ${h.by}`}
                  {h.note && ` · ${h.note}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────
function statusBg(status: CoStatus): string {
  switch (status) {
    case 'draft':             return 'bg-muted text-muted-foreground border border-border';
    case 'submitted':         return 'bg-secondary text-secondary-foreground';
    case 'inReview':          return 'bg-[#f7efd9] text-[#b8860b]';
    case 'partiallyExecuted': return 'bg-[#f7e9e4] text-[#c75e40]';
    case 'approved':          return 'bg-[#2d6a4f] text-white';
    case 'rejected':          return 'bg-[#fdecec] text-[#dc2626]';
    default:                  return 'bg-muted text-muted-foreground';
  }
}

function Total({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'clay' }) {
  const color = tone === 'ok' ? '#2d6a4f' : tone === 'warn' ? '#b8860b' : tone === 'clay' ? '#c75e40' : '#1a1410';
  return (
    <div className="text-right">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="text-[17px] font-semibold tabular-nums leading-tight" style={{ fontFamily: "'Fraunces','Georgia',serif", color }}>
        {value}
      </p>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] font-semibold', className)}>
      {children}
    </th>
  );
}
