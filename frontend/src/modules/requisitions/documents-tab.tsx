import { useEffect, useMemo, useState } from 'react';

import { Input } from '@app/components/ui/input';
import { cn } from '@app/lib/utils';

import { ChipPill, fmtDate } from './format';
import {
  DOC_RECORDS,
  DOC_REQUIREMENTS,
  PHOTOS,
  PHOTO_CATEGORY_META,
  PROJECTS,
  REQUISITIONS,
  getProject,
  latestOneTimeRecord,
  monthsOnFile,
  todayIso,
  type DocRecord,
  type PhotoCategory,
} from './data';
import { DOC_STATUS_META, type DocStatus } from './stages';
import { DocumentsTemplateEditor } from './documents-template-editor';
import { ProjectFilesView } from './project-files';
import { ViewSwitcher, type ViewMode } from './views';

const ALL = '__all__';

export function DocumentsTab() {
  // List is the default here because docs work IS the ledger — filing rows,
  // looking up what's outstanding. Pipeline + Board are on the same switcher
  // for glance / triage.
  const [mode, setMode] = useState<ViewMode>('list');
  const [projectFilter, setProjectFilter] = useState<string>(ALL);
  const [vendorFilter, setVendorFilter] = useState<string>(ALL);
  const [monthFilter, setMonthFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<'all' | DocStatus>('all');
  const [search, setSearch] = useState('');
  const [, bump] = useState(0);

  useEffect(() => {
    const h = () => bump(n => n + 1);
    window.addEventListener('reqs-changed', h);
    return () => window.removeEventListener('reqs-changed', h);
  }, []);

  const vendors = useMemo(() => {
    const s = new Set<string>();
    DOC_REQUIREMENTS.forEach(r => r.vendorName && s.add(r.vendorName));
    return Array.from(s).sort();
  }, []);

  const months = useMemo(() => monthsOnFile().slice().sort().reverse(), []);

  const filtered = useMemo(() => {
    return DOC_RECORDS
      .filter(dc => projectFilter === ALL || dc.projectId === projectFilter)
      .filter(dc => monthFilter === ALL || dc.month === monthFilter)
      .filter(dc => statusFilter === 'all' || dc.status === statusFilter)
      .filter(dc => {
        if (vendorFilter === ALL) return true;
        const req = DOC_REQUIREMENTS.find(r => r.id === dc.requirementId);
        return req?.vendorName === vendorFilter;
      })
      .filter(dc => {
        if (!search) return true;
        const req = DOC_REQUIREMENTS.find(r => r.id === dc.requirementId);
        const project = getProject(dc.projectId);
        const hay = [req?.form, req?.vendorName, project?.name, project?.gc, dc.month].join(' ').toLowerCase();
        return hay.includes(search.toLowerCase());
      });
  }, [projectFilter, vendorFilter, monthFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const filed    = filtered.filter(dc => dc.status === 'filed').length;
    const received = filtered.filter(dc => dc.status === 'received').length;
    const missing  = filtered.filter(dc => dc.status === 'missing').length;
    return { total, filed, received, missing };
  }, [filtered]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <p className="text-[12.5px] text-muted-foreground">
          Pick a project below to see every document it holds — SOV, requisitions, change orders, photos, compliance filings, templates, CPRs, safety, insurance — each in its own drop-down.
        </p>

        {/* Project-first file browser — Peter's dominant view */}
        <ProjectFilesView />

        {/* Compliance-rules editor — the RULE per project, subordinate to files */}
        <div className="pt-4 border-t border-border">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Records management · secondary
          </p>
        </div>
        <DocumentsTemplateEditor />

        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <header className="px-5 py-4 border-b border-border flex items-baseline gap-3 flex-wrap">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Ledger · the record
              </p>
              <h2 className="text-[16px] font-semibold mt-0.5" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
                Every document, every project, every month
              </h2>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-baseline gap-3 text-[11px] font-mono text-muted-foreground">
                <span>{stats.total} row{stats.total === 1 ? '' : 's'}</span>
                <span className="text-[#2d6a4f]">{stats.filed} filed</span>
                <span className="text-[#b8860b]">{stats.received} received</span>
                <span className="text-[#dc2626]">{stats.missing} missing</span>
              </div>
              <ViewSwitcher mode={mode} onChange={setMode} />
            </div>
          </header>

          {mode === 'list' && (
            <>
              <div className="px-5 py-3 border-b border-border bg-muted/20 grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr) 1fr' }}>
                <Filter label="Project" value={projectFilter} onChange={setProjectFilter}
                  options={[[ALL, 'All projects'], ...PROJECTS.map(p => [p.id, p.name] as [string, string])]} />
                <Filter label="Vendor" value={vendorFilter} onChange={setVendorFilter}
                  options={[[ALL, 'All vendors'], ...vendors.map(v => [v, v] as [string, string])]} />
                <Filter label="Month" value={monthFilter} onChange={setMonthFilter}
                  options={[[ALL, 'All months'], ...months.map(m => [m, m] as [string, string])]} />
                <Filter label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as any)}
                  options={[['all', 'All'], ['missing', 'Missing'], ['received', 'Received'], ['filed', 'Filed']]} />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Search</p>
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="form, vendor, project…" className="h-8 text-[12px]" />
                </div>
              </div>
              <ListView records={filtered} />
            </>
          )}
          {mode === 'board'    && <BoardView records={filtered} />}
          {mode === 'pipeline' && <PipelineView onProjectMonth={(pid, m) => { setProjectFilter(pid); setMonthFilter(m); setMode('list'); }} />}
        </section>

        <PhotosSection projectFilter={projectFilter} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Photos — the physical evidence bundle. Stored-material shots,
// project labels, sign-in sheets, jobsite conditions. Filterable by
// project + category. Peter's rule: every stack of stored material gets
// a photo with an Elli project label so it can be billed as stored.
// ────────────────────────────────────────────────────────────────────────
function PhotosSection({ projectFilter }: { projectFilter: string }) {
  const [category, setCategory] = useState<'all' | PhotoCategory>('all');
  const photos = PHOTOS
    .filter(p => projectFilter === ALL || p.projectId === projectFilter)
    .filter(p => category === 'all' || p.category === category);
  const categories: ('all' | PhotoCategory)[] = ['all', 'stored-material', 'project-label', 'sign-in-sheet', 'jobsite', 'delivery', 'other'];

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-baseline gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Photos · the physical evidence
          </p>
          <h2 className="text-[16px] font-semibold mt-0.5" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            Stored materials, labels, jobsite
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {categories.map(c => {
            const active = category === c;
            const label = c === 'all' ? 'All' : PHOTO_CATEGORY_META[c].label;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>
      <div className="p-4">
        {photos.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic text-center py-8">
            No photos match those filters.
          </p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {photos.map(p => {
              const project = getProject(p.projectId);
              return (
                <a
                  key={p.id}
                  href={p.fileUri}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-border bg-muted/30 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center relative overflow-hidden">
                    <img
                      src={p.fileUri}
                      alt={p.caption}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image doesn't exist yet — show category placeholder
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.querySelector('.placeholder')) {
                          const ph = document.createElement('div');
                          ph.className = 'placeholder text-[24px]';
                          ph.textContent = p.category === 'stored-material' ? '📦'
                            : p.category === 'project-label' ? '🏷️'
                            : p.category === 'sign-in-sheet' ? '📝'
                            : p.category === 'delivery' ? '🚚'
                            : p.category === 'jobsite' ? '🏗️'
                            : '📷';
                          parent.appendChild(ph);
                        }
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-semibold leading-snug">{p.caption}</p>
                    <p className="text-[10.5px] text-muted-foreground mt-1">
                      {project?.name.split('—')[0].trim()} · {PHOTO_CATEGORY_META[p.category].label}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {p.takenAt}{p.month ? ` · req ${p.month}` : ''}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// List
// ────────────────────────────────────────────────────────────────────────
function ListView({ records }: { records: DocRecord[] }) {
  return (
    <table className="w-full text-[12.5px]">
      <thead className="bg-muted/40 text-muted-foreground">
        <tr>
          <Th>Form</Th>
          <Th>Whose</Th>
          <Th>Project</Th>
          <Th>Month</Th>
          <Th>Status</Th>
          <Th>Filed</Th>
        </tr>
      </thead>
      <tbody>
        {records.length === 0 && (
          <tr><td colSpan={6} className="px-6 py-12 text-center italic text-muted-foreground text-[12px]">Nothing matches those filters.</td></tr>
        )}
        {records.map(dc => {
          const req = DOC_REQUIREMENTS.find(r => r.id === dc.requirementId);
          const project = getProject(dc.projectId);
          const s = DOC_STATUS_META[dc.status];
          // One-time docs (COI, W-9) don't live-or-die by this month's status —
          // they're valid or expired against the newest filed copy on record.
          const oneTime = req?.cadence === 'oneTime' ? latestOneTimeRecord(req.id) : undefined;
          const oneTimeValid = !!oneTime?.expiresOn && oneTime.expiresOn >= todayIso();
          return (
            <tr key={dc.id} className="border-t border-border/60 hover:bg-muted/20">
              <td className="px-3 py-2">{req?.form}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {req?.owner === 'vendor' ? req?.vendorName : 'Ours'}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{project?.name}</td>
              <td className="px-3 py-2 font-mono text-[11.5px]">{dc.month}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <ChipPill tone={s.tone}>{s.label}</ChipPill>
                  {oneTime?.expiresOn && (
                    <span className={cn('text-[10px] font-mono', oneTimeValid ? 'text-[#2d6a4f]' : 'text-[#c75e40]')}>
                      {oneTimeValid ? `valid to ${fmtDate(oneTime.expiresOn)}` : `expired ${fmtDate(oneTime.expiresOn)}`}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {dc.filedAt ? fmtDate(dc.filedAt) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Board — kanban by status (Missing / Received / Filed)
// ────────────────────────────────────────────────────────────────────────
const BOARD_COLS: DocStatus[] = ['missing', 'received', 'filed'];

function BoardView({ records }: { records: DocRecord[] }) {
  return (
    <div className="p-4 overflow-x-auto">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${BOARD_COLS.length}, minmax(260px, 1fr))` }}>
        {BOARD_COLS.map(col => {
          const items = records.filter(dc => dc.status === col);
          const meta = DOC_STATUS_META[col];
          return (
            <div key={col} className="rounded-lg border border-border bg-muted/30 min-w-0">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <span className={cn(
                  'inline-block w-2 h-2 rounded-full',
                  col === 'missing'  && 'bg-[#dc2626]',
                  col === 'received' && 'bg-[#b8860b]',
                  col === 'filed'    && 'bg-[#2d6a4f]',
                )} />
                <span className="text-[12px] font-semibold">{meta.label}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 max-h-[520px] overflow-y-auto">
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">column clear</p>
                )}
                {items.map(dc => {
                  const req = DOC_REQUIREMENTS.find(r => r.id === dc.requirementId);
                  const project = getProject(dc.projectId);
                  return (
                    <div key={dc.id} className="rounded-md border border-border bg-card p-3">
                      <p className="text-[12.5px] font-semibold leading-snug">{req?.form}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">
                        {req?.owner === 'vendor' ? `Vendor · ${req?.vendorName}` : 'Ours'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-2">{project?.name.split('—')[0].trim()}</p>
                      <p className="text-[10.5px] font-mono text-muted-foreground">{dc.month}</p>
                      {dc.filedAt && (
                        <p className="text-[10px] font-mono text-[#2d6a4f] mt-1">filed {fmtDate(dc.filedAt)}</p>
                      )}
                    </div>
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
// Pipeline — project × month grid; each cell = filed/required ratio
// ────────────────────────────────────────────────────────────────────────
function PipelineView({ onProjectMonth }: { onProjectMonth: (pid: string, month: string) => void }) {
  const months = monthsOnFile();
  const projectsWithReqs = PROJECTS.filter(p => REQUISITIONS.some(r => r.projectId === p.id));

  return (
    <div className="overflow-x-auto">
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
          {projectsWithReqs.map(p => {
            const projRequirements = DOC_REQUIREMENTS.filter(r => r.projectId === p.id);
            const requiredCount = projRequirements.length;
            return (
              <tr key={p.id} className="border-t border-border/60">
                <td className="px-3 py-2">
                  <p className="font-semibold text-[12px]">{p.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">{p.gc}</p>
                </td>
                {months.map(m => {
                  const hasReq = REQUISITIONS.some(r => r.projectId === p.id && r.month === m);
                  if (!hasReq) {
                    return <td key={m} className="px-2 py-2 text-center align-middle">
                      <span className="inline-block w-full h-6 rounded bg-transparent"></span>
                    </td>;
                  }
                  const records = DOC_RECORDS.filter(dc => dc.projectId === p.id && dc.month === m);
                  const filed    = records.filter(dc => dc.status === 'filed').length;
                  const received = records.filter(dc => dc.status === 'received').length;
                  const missing  = Math.max(0, requiredCount - records.length) + records.filter(dc => dc.status === 'missing').length;
                  const label = `${filed}/${requiredCount}`;
                  const bg = missing > 0
                    ? 'bg-[#fdecec] text-[#dc2626]'
                    : received > 0
                      ? 'bg-[#f7efd9] text-[#b8860b]'
                      : 'bg-[#e4efe9] text-[#2d6a4f]';
                  return (
                    <td key={m} className="px-2 py-2 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => onProjectMonth(p.id, m)}
                        className={cn(
                          'inline-flex w-full min-w-[64px] h-7 rounded items-center justify-center text-[11px] font-mono font-semibold hover:opacity-80',
                          bg
                        )}
                        title={`${p.name} · ${m} · ${filed} filed, ${received} received, ${missing} missing`}
                      >
                        {label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-5 py-3 text-[11px] text-muted-foreground">
        Cell = filed / required. Click any cell to open that project's month in the List.
        Red = something missing · Amber = received but not yet filed · Green = all filed.
      </p>
    </div>
  );
}

function Filter({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-8 rounded-md border border-input bg-background px-2 text-[12px]"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
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
