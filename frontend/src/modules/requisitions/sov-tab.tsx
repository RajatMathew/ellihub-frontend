import { useEffect, useState } from 'react';

import { cn } from '@app/lib/utils';

import { ChipPill, usd } from './format';
import { PROJECTS, SOVS, getApprovedCoValueForProject, getPendingCoValueForProject, getSov, sovTotal, type Project, type Sov } from './data';
import { SOV_STATUS_META, type SovStatus } from './stages';
import { ViewSwitcher, type ViewMode } from './views';

export function SovTab() {
  const [mode, setMode] = useState<ViewMode>('pipeline');
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const h = () => bump(n => n + 1);
    window.addEventListener('reqs-changed', h);
    return () => window.removeEventListener('reqs-changed', h);
  }, []);

  if (openProjectId) {
    const project = PROJECTS.find(p => p.id === openProjectId);
    const sov = getSov(openProjectId);
    if (project) {
      return <SovDetail project={project} sov={sov} onBack={() => setOpenProjectId(null)} />;
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-3 border-b border-border bg-background flex items-center gap-3">
        <p className="text-[12.5px] text-muted-foreground max-w-3xl">
          One SOV per project. The .xlsx is the source of truth — the SCA G702 template with Material/Labor pairs, Spec sections, and the per-line % Completed column that gets edited every month for the requisition.
        </p>
        <div className="ml-auto"><ViewSwitcher mode={mode} onChange={setMode} /></div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {mode === 'list'     && <SovListView onOpen={setOpenProjectId} />}
        {mode === 'board'    && <SovBoardView onOpen={setOpenProjectId} />}
        {mode === 'pipeline' && <SovPipelineView onOpen={setOpenProjectId} />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// List view
// ────────────────────────────────────────────────────────────────────────
function SovListView({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="max-w-6xl mx-auto rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <Th>Project</Th>
            <Th>GC</Th>
            <Th className="text-right">Contract</Th>
            <Th className="text-right">SOV total</Th>
            <Th>Status</Th>
            <Th>File</Th>
            <Th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {PROJECTS.map(p => {
            const sov = SOVS.find(s => s.projectId === p.id);
            const total = sov ? sovTotal(sov) : 0;
            const status = sov ? SOV_STATUS_META[sov.status] : null;
            const tiesOut = sov && Math.abs(total - p.contractValue) < 0.01;
            return (
              <tr
                key={p.id}
                className="border-t border-border/60 hover:bg-muted/30 cursor-pointer"
                onClick={() => onOpen(p.id)}
              >
                <td className="px-3 py-2.5">
                  <p className="font-semibold">{p.name}</p>
                  {sov && (
                    <p className="text-[10.5px] text-muted-foreground font-mono">
                      Rev {sov.rev} · {sov.source === 'excel-upload' ? 'from Excel' : 'built in app'}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.gc}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{usd(p.contractValue)}</td>
                <td className={cn(
                  'px-3 py-2.5 text-right tabular-nums',
                  sov && !tiesOut && 'text-[#c75e40] font-semibold'
                )}>
                  {sov ? usd(total) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  {status
                    ? <ChipPill tone={status.tone as any}>{status.label}</ChipPill>
                    : <ChipPill tone="danger">no SOV</ChipPill>}
                </td>
                <td className="px-3 py-2.5">
                  {sov?.fileUri ? (
                    <a
                      href={sov.fileUri}
                      onClick={e => e.stopPropagation()}
                      className="text-primary font-semibold text-[11.5px] hover:underline"
                    >
                      ↓ {sov.fileName}
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">not uploaded</span>
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
// Board view — kanban by SOV status
// ────────────────────────────────────────────────────────────────────────
const BOARD_COLS: SovStatus[] = ['draft', 'sent', 'markedUp', 'resubmitted', 'approved'];

function SovBoardView({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${BOARD_COLS.length}, minmax(220px, 1fr))` }}>
        {BOARD_COLS.map(col => {
          const items = PROJECTS.filter(p => {
            const sov = SOVS.find(s => s.projectId === p.id);
            return sov ? sov.status === col : col === 'draft';
          });
          const meta = SOV_STATUS_META[col];
          return (
            <div key={col} className="rounded-lg border border-border bg-muted/30 min-w-0">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <span className="text-[12px] font-semibold">{meta.label}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="p-2 space-y-2">
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">column clear</p>
                )}
                {items.map(p => {
                  const sov = SOVS.find(s => s.projectId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOpen(p.id)}
                      className="w-full text-left rounded-md border border-border bg-card p-3 hover:shadow-sm transition-shadow"
                    >
                      <p className="text-[12.5px] font-semibold leading-snug">{p.name}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-1">{p.gc}</p>
                      <p className="text-[11px] font-semibold tabular-nums mt-2">{usd(p.contractValue)}</p>
                      {sov?.fileUri && (
                        <span className="mt-2 inline-block text-[10px] font-mono text-primary">↓ {sov.fileName}</span>
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
// Pipeline view — status × project matrix
// ────────────────────────────────────────────────────────────────────────
function SovPipelineView({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="max-w-6xl mx-auto rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <Th>Project</Th>
            {BOARD_COLS.map(col => (
              <Th key={col} className="text-center">{SOV_STATUS_META[col].label}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PROJECTS.map(p => {
            const sov = SOVS.find(s => s.projectId === p.id);
            const currentIdx = sov ? BOARD_COLS.indexOf(sov.status) : -1;
            return (
              <tr
                key={p.id}
                className="border-t border-border/60 hover:bg-muted/30 cursor-pointer"
                onClick={() => onOpen(p.id)}
              >
                <td className="px-3 py-2">
                  <p className="font-semibold text-[12.5px]">{p.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">{p.gc}</p>
                </td>
                {BOARD_COLS.map((col, i) => {
                  const passed = i < currentIdx;
                  const here   = i === currentIdx;
                  return (
                    <td key={col} className="px-3 py-2 text-center">
                      <span className={cn(
                        'inline-flex w-full h-6 rounded items-center justify-center text-[10px] font-mono uppercase tracking-[0.05em]',
                        passed && 'bg-[#e4efe9] text-[#2d6a4f]',
                        here   && 'bg-primary text-primary-foreground font-semibold',
                        !passed && !here && 'bg-muted/40 text-muted-foreground'
                      )}>
                        {passed ? '✓' : here ? 'here' : ''}
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

// ────────────────────────────────────────────────────────────────────────
// Detail view — one project's SOV file card + history
// ────────────────────────────────────────────────────────────────────────
function SovDetail({ project, sov, onBack }: { project: Project; sov?: Sov; onBack: () => void }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          ← Back to SOV list
        </button>

        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{project.gc}</p>
          <h2 className="text-[22px] font-semibold" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            {project.name}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            Original contract <span className="font-semibold tabular-nums">{usd(project.contractValue)}</span> · {project.paymentTerms}
          </p>
          {(getApprovedCoValueForProject(project.id) !== 0 || getPendingCoValueForProject(project.id) !== 0) && (
            <div className="mt-2 flex items-baseline gap-4 flex-wrap">
              <span className="text-[11.5px]">
                + Approved COs <b className="text-[#2d6a4f] tabular-nums">{usd(getApprovedCoValueForProject(project.id))}</b>
              </span>
              {getPendingCoValueForProject(project.id) !== 0 && (
                <span className="text-[11.5px]">
                  Pending COs <b className="text-[#b8860b] tabular-nums">{usd(getPendingCoValueForProject(project.id))}</b>
                </span>
              )}
              <span className="text-[11.5px]">
                = Current contract <b className="text-[#1a3a5f] tabular-nums">{usd(project.contractValue + getApprovedCoValueForProject(project.id))}</b>
              </span>
            </div>
          )}
        </header>

        {sov ? (
          <>
            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-baseline gap-3 mb-3">
                <ChipPill tone={SOV_STATUS_META[sov.status].tone as any}>{SOV_STATUS_META[sov.status].label}</ChipPill>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  Rev {sov.rev} · {sov.source === 'excel-upload' ? 'Excel upload' : 'built in app'}
                </span>
              </div>
              {sov.fileUri ? (
                <div className="rounded-md border border-border bg-muted/30 p-4 flex items-center gap-4 flex-wrap">
                  <div className="text-[24px]">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px]">{sov.fileName}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      SCA Requisition & Certificate for Payment · {sov.fileSizeKb ?? '?'} KB
                    </p>
                  </div>
                  <a
                    href={sov.fileUri}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                  >
                    ↓ Download
                  </a>
                  <a
                    href={sov.fileUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-md border border-border hover:bg-accent"
                  >
                    Open
                  </a>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">
                  No SOV file uploaded yet.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Line summary (from data model — the .xlsx above is the source of truth)
              </p>
              <ul className="text-[12px] text-muted-foreground space-y-1">
                {sov.lines.slice(0, 5).map(l => (
                  <li key={l.id} className="flex gap-3">
                    <span className="font-mono w-16">{l.code}</span>
                    <span className="flex-1 truncate">{l.description}</span>
                    <span className="tabular-nums">{usd(l.scheduled)}</span>
                  </li>
                ))}
                {sov.lines.length > 5 && (
                  <li className="italic pl-16">{sov.lines.length - 5} more lines in the file…</li>
                )}
              </ul>
            </section>

            {sov.history.length > 0 && (
              <section className="rounded-lg border border-border bg-card p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">History</p>
                <ul className="space-y-1.5 text-[12px]">
                  {sov.history.map((h, i) => (
                    <li key={i} className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground w-24">{h.at}</span>
                      <span className="font-semibold w-40">{SOV_STATUS_META[h.status].label}</span>
                      <span className="text-muted-foreground">{h.by === 'system' ? 'system' : `by ${h.by}`}</span>
                      {h.note && <span className="text-muted-foreground italic">— {h.note}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-[13px] text-muted-foreground">
              No SOV yet for this project. Upload the initial .xlsx to start.
            </p>
          </section>
        )}
      </div>
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
