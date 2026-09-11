import { useEffect, useMemo, useState } from 'react';

import { cn } from '@app/lib/utils';

import { ChipPill, fmtDate, fmtMonth, usd, usdShort } from './format';
import {
  CURRENT_MONTH,
  PROJECTS,
  REQUISITIONS,
  createDraftReq,
  effectiveFlags,
  getAllReqsSortedByMonthDesc,
  getProject,
  getReqsForMonth,
  getSkippedMonth,
  isReqPastDue,
  missingDocsForReq,
  monthsOnFile,
  pctForReq,
  reqAging,
  skipMonth,
  unskipMonth,
} from './data';
import { STAGE_META, STAGE_ORDER, FLAG_META, type Stage } from './stages';
import { ReqDetail } from './req-detail';
import { ViewSwitcher, type ViewMode } from './views';

export function RequisitionsTab() {
  const [mode, setMode] = useState<ViewMode>('pipeline');
  const [openReqId, setOpenReqId] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    const h = () => bump(n => n + 1);
    window.addEventListener('reqs-changed', h);
    return () => window.removeEventListener('reqs-changed', h);
  }, []);

  const rows = useMemo(() => getReqsForMonth(CURRENT_MONTH), []);
  const totals = useMemo(() => {
    const billed = rows.reduce((s, r) => s + r.amount, 0);
    const approved = rows.filter(r => r.stage === 'approved' || r.stage === 'paid').reduce((s, r) => s + r.amount, 0);
    const paid = rows.filter(r => r.stage === 'paid').reduce((s, r) => s + r.amount, 0);
    const late = REQUISITIONS.filter(isReqPastDue).reduce((s, r) => s + r.amount, 0);
    return { billed, approved, paid, late };
  }, [rows]);

  const openReq = openReqId
    ? rows.find(r => r.id === openReqId) ?? REQUISITIONS.find(r => r.id === openReqId) ?? null
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-border bg-background">
        <div className="flex items-baseline gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Current cycle</p>
            <h2 className="text-[18px] font-semibold" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
              {fmtMonth(CURRENT_MONTH)} cycle · due dates follow each project's calendar
            </h2>
          </div>
          <div className="ml-auto grid grid-cols-4 gap-6">
            <Total label="Billed"   value={usdShort(totals.billed)} />
            <Total label="Approved" value={usdShort(totals.approved)} tone="ok" />
            <Total label="Paid"     value={usdShort(totals.paid)}     tone="ok" />
            <Total label="Late"     value={totals.late > 0 ? usdShort(totals.late) : '—'} tone="clay" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ViewSwitcher mode={mode} onChange={setMode} />
          <p className="text-[11px] text-muted-foreground">
            {mode === 'list'     && 'One row per project · current month'}
            {mode === 'board'    && 'Cards flow left → right through the six stages · current month'}
            {mode === 'pipeline' && 'Every project × every month · every requisition ever'}
          </p>
          {mode === 'pipeline' && (
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllProjects}
                onChange={e => setShowAllProjects(e.target.checked)}
                className="h-3 w-3 accent-[#1a3a5f]"
              />
              Show all projects
            </label>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {mode === 'list'     && <ReqListView onOpen={setOpenReqId} />}
        {mode === 'board'    && <ReqBoardView onOpen={setOpenReqId} />}
        {mode === 'pipeline' && <ReqPipelineView onOpen={setOpenReqId} showAll={showAllProjects} />}
      </div>
      {openReq && <ReqDetail req={openReq} onClose={() => setOpenReqId(null)} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// List — one row per project, current month
// ────────────────────────────────────────────────────────────────────────
function ReqListView({ onOpen }: { onOpen: (id: string) => void }) {
  const rows = getReqsForMonth(CURRENT_MONTH);
  return (
    <div className="max-w-6xl mx-auto rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <Th>Project</Th>
            <Th>Req</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-right">% Complete</Th>
            <Th>Stage</Th>
            <Th>Submitted</Th>
            <Th>Due</Th>
            <Th className="text-right">Days late</Th>
            <Th>Flags · Blockers</Th>
            <Th>File</Th>
            <Th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={11} className="px-6 py-12 text-center text-muted-foreground italic text-[12px]">
                No requisitions for {fmtMonth(CURRENT_MONTH)}.
              </td>
            </tr>
          )}
          {rows.map(req => {
            const project = getProject(req.projectId);
            const stage = STAGE_META[req.stage];
            const missing = missingDocsForReq(req);
            const pct = pctForReq(req);
            const aging = reqAging(req);
            return (
              <tr
                key={req.id}
                className="border-t border-border/60 hover:bg-muted/30 cursor-pointer"
                onClick={() => onOpen(req.id)}
              >
                <td className="px-3 py-2.5">
                  <p className="font-semibold">{project?.name ?? req.projectId}</p>
                  <p className="text-[10.5px] text-muted-foreground">{project?.gc}</p>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="font-mono text-[11.5px]">Req #{String(req.seq).padStart(3, '0')}</span>
                  {req.isRetentionBill && (
                    <span className="ml-1.5"><ChipPill tone="primary">Retention</ChipPill></span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                  {req.amount > 0 ? usd(req.amount) : <span className="text-muted-foreground italic">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{pct}%</td>
                <td className="px-3 py-2.5"><ChipPill tone={stage.tone as any}>{stage.label}</ChipPill></td>
                <td className="px-3 py-2.5 whitespace-nowrap text-[11.5px]">
                  {aging.submittedOn ? fmtDate(aging.submittedOn) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-[11.5px]">
                  {aging.dueOn ? fmtDate(aging.dueOn) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {aging.daysLate > 0
                    ? <span className="font-bold text-[#c75e40]">{aging.daysLate}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {effectiveFlags(req).map(f => (
                      <ChipPill key={f} tone={FLAG_META[f].tone}>{FLAG_META[f].label}</ChipPill>
                    ))}
                    {missing > 0 && (
                      <ChipPill tone="danger">{missing} doc{missing > 1 ? 's' : ''} missing</ChipPill>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {req.fileUri ? (
                    <a
                      href={req.fileUri}
                      onClick={e => e.stopPropagation()}
                      className="text-primary font-semibold text-[11.5px] hover:underline"
                    >
                      ↓ {req.fileName}
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">—</span>
                  )}
                </td>
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
// Board — kanban by stage, current month
// ────────────────────────────────────────────────────────────────────────
function ReqBoardView({ onOpen }: { onOpen: (id: string) => void }) {
  const rows = getReqsForMonth(CURRENT_MONTH);
  return (
    <div className="max-w-full overflow-x-auto pb-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${STAGE_ORDER.length}, minmax(200px, 1fr))` }}>
        {STAGE_ORDER.map(stage => {
          const items = rows.filter(r => r.stage === stage);
          const meta = STAGE_META[stage];
          return (
            <div key={stage} className="rounded-lg border border-border bg-muted/30 min-w-0">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <span className="text-[12px] font-semibold">{meta.label}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="p-2 space-y-2">
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">column clear</p>
                )}
                {items.map(req => {
                  const project = getProject(req.projectId);
                  const missing = missingDocsForReq(req);
                  const pct = pctForReq(req);
                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => onOpen(req.id)}
                      className="w-full text-left rounded-md border border-border bg-card p-3 hover:shadow-sm transition-shadow"
                    >
                      <p className="text-[12.5px] font-semibold leading-snug">{project?.name.split('—')[0].trim()}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">Req #{String(req.seq).padStart(3, '0')} · {pct}%</p>
                      <p className="text-[11.5px] font-semibold tabular-nums mt-1.5">
                        {req.amount > 0 ? usd(req.amount) : '—'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {effectiveFlags(req).map(f => <ChipPill key={f} tone={FLAG_META[f].tone}>{FLAG_META[f].label}</ChipPill>)}
                        {missing > 0 && <ChipPill tone="danger">{missing} doc{missing > 1 ? 's' : ''}</ChipPill>}
                      </div>
                      {req.fileUri && (
                        <span className="mt-2 inline-block text-[10px] font-mono text-primary">↓ {req.fileName}</span>
                      )}
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
// Pipeline — project × month grid, every requisition ever
// ────────────────────────────────────────────────────────────────────────
function ReqPipelineView({ onOpen, showAll }: { onOpen: (id: string) => void; showAll: boolean }) {
  const months = monthsOnFile();
  const projectRows = PROJECTS.filter(p =>
    showAll || p.lifecycle === 'active' || p.lifecycle === 'fullyBilled'
  );
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className="text-[11.5px]" style={{ minWidth: '900px' }}>
        <thead className="bg-muted/40 text-muted-foreground sticky top-0">
          <tr>
            <Th className="w-[240px]">Project</Th>
            {months.map(m => (
              <Th key={m} className="text-center whitespace-nowrap">
                {new Date(m + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projectRows.map(p => {
            const projectReqs = getAllReqsSortedByMonthDesc(p.id);
            return (
              <tr key={p.id} className="border-t border-border/60">
                <td className="px-3 py-2">
                  <p className="font-semibold text-[12px]">{p.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">{p.gc}</p>
                </td>
                {months.map(m => {
                  const req = projectReqs.find(r => r.month === m);
                  if (req) {
                    return (
                      <td key={m} className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => onOpen(req.id)}
                          className={cn(
                            'inline-block w-full min-w-[64px] h-7 rounded text-[10px] font-mono uppercase tracking-[0.05em] font-semibold hover:opacity-80',
                            stageBg(req.stage)
                          )}
                          title={`Req #${String(req.seq).padStart(3, '0')} · ${STAGE_META[req.stage].label} · ${pctForReq(req)}%`}
                        >
                          #{String(req.seq).padStart(3, '0')}
                        </button>
                      </td>
                    );
                  }
                  const skipped = getSkippedMonth(p.id, m);
                  if (skipped) {
                    return (
                      <td key={m} className="group px-2 py-2 text-center align-middle">
                        <span
                          className="inline-flex items-center justify-center gap-1.5 min-w-[64px] h-7"
                          title={skipped.reason ? `Not billing — ${skipped.reason}` : 'Not billing this month'}
                        >
                          <ChipPill tone="neutral">Not billing</ChipPill>
                          <button
                            type="button"
                            onClick={() => unskipMonth(p.id, m)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold text-primary hover:underline"
                          >
                            Undo
                          </button>
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td key={m} className="group px-2 py-2 text-center align-middle">
                      <span className="inline-flex items-center justify-center gap-2 min-w-[64px] h-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => createDraftReq(p.id, m)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                          title={`Start a draft requisition for ${p.name}`}
                        >
                          Start
                        </button>
                        <button
                          type="button"
                          onClick={() => skipMonth(p.id, m)}
                          className="text-[10px] font-semibold text-muted-foreground hover:underline"
                          title="Not billing this month"
                        >
                          Skip
                        </button>
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function stageBg(stage: Stage): string {
  switch (stage) {
    case 'draft':    return 'bg-muted text-muted-foreground border border-border';
    case 'pencil':   return 'bg-[#f7efd9] text-[#b8860b]';
    case 'returned': return 'bg-[#f7e9e4] text-[#c75e40]';
    case 'final':    return 'bg-secondary text-secondary-foreground';
    case 'approved': return 'bg-[#e4efe9] text-[#2d6a4f]';
    case 'paid':     return 'bg-[#2d6a4f] text-white';
    default:         return 'bg-muted text-muted-foreground';
  }
}

function Total({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'clay' }) {
  const color = tone === 'ok' ? '#2d6a4f' : tone === 'clay' ? '#c75e40' : '#1a1410';
  return (
    <div className="text-right">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p
        className="text-[18px] font-semibold tabular-nums leading-tight"
        style={{ fontFamily: "'Fraunces','Georgia',serif", color }}
      >
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
