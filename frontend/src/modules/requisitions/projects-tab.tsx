// Projects — the front door of the module. Pick a project, see the one thing
// to do on it, open it. Four buckets across the top (Onboarding · Active ·
// Fully billed · Archived), three ways to look at the same list.
//
// Everything on this screen is derived in registry.ts — nothing is stored
// twice, and every card answers the same question: what do I do next here?
import { useEffect, useState } from 'react';

import { Input } from '@app/components/ui/input';
import { cn } from '@app/lib/utils';

import { ChipPill, fmtDate, usd } from './format';
import { type TeamId } from './data';
import {
  allProjectSnapshots,
  lifecycleCounts,
  type ProjectSnapshot,
  type Urgency,
} from './registry';
import {
  CLOSEOUT_META, LIFECYCLE_META, LIFECYCLE_ORDER, STAGE_META,
  type Lifecycle,
} from './stages';
import { ProjectDetail, type ModuleTab } from './project-detail';
import { ViewSwitcher, type ViewMode } from './views';

const FRAUNCES = { fontFamily: "'Fraunces','Georgia',serif" };
const LABEL = 'font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground';
const CLAY = 'text-[#c75e40]';

// STAGE_META carries an 'ok' tone that ChipPill does not know about.
type ChipTone = 'clay' | 'primary' | 'warning' | 'neutral' | 'success' | 'danger';
const TONE: Record<'neutral' | 'warning' | 'clay' | 'primary' | 'success' | 'ok' | 'danger', ChipTone> = {
  neutral: 'neutral', warning: 'warning', clay: 'clay', primary: 'primary',
  success: 'success', ok: 'success', danger: 'danger',
};

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

// Board columns — the owners, in the order the team reads them.
const TEAM_ORDER: TeamId[] = ['PL', 'LO', 'TB', 'AC', 'CA', 'MI', 'EV'];

// ────────────────────────────────────────────────────────────────────────
export function ProjectsTab({ onGoTo }: { onGoTo?: (target: ModuleTab) => void }) {
  const [mode, setMode] = useState<ViewMode>('pipeline');
  const [buckets, setBuckets] = useState<Lifecycle[]>([...LIFECYCLE_ORDER]);
  const [query, setQuery] = useState('');
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const h = () => bump(n => n + 1);
    window.addEventListener('reqs-changed', h);
    return () => window.removeEventListener('reqs-changed', h);
  }, []);

  const counts = lifecycleCounts();
  const q = query.trim().toLowerCase();
  const snaps = allProjectSnapshots().filter(s =>
    buckets.includes(s.project.lifecycle)
    && (!q || s.project.name.toLowerCase().includes(q) || s.project.gc.toLowerCase().includes(q))
  );

  const toggleBucket = (lc: Lifecycle) =>
    setBuckets(prev => (prev.includes(lc) ? prev.filter(x => x !== lc) : [...prev, lc]));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-border bg-background">
        <div className="flex items-baseline gap-4 flex-wrap">
          <div>
            <p className={LABEL}>Project registry</p>
            <h2 className="text-[18px] font-semibold" style={FRAUNCES}>
              Every project — and the one thing to do next
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {LIFECYCLE_ORDER.map(lc => {
              const on = buckets.includes(lc);
              return (
                <button
                  key={lc}
                  type="button"
                  onClick={() => toggleBucket(lc)}
                  title={LIFECYCLE_META[lc].hint}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-[11.5px] font-semibold transition-colors',
                    on
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  {LIFECYCLE_META[lc].label}
                  <span className="ml-1.5 font-mono text-[10.5px] opacity-80">{counts[lc]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ViewSwitcher mode={mode} onChange={setMode} />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search project or GC"
            className="h-8 w-56 text-[12px]"
          />
          <p className="text-[11px] text-muted-foreground">
            {mode === 'pipeline' && 'Four buckets · a project moves left to right as it bills out'}
            {mode === 'board' && 'By owner · who is carrying what'}
            {mode === 'list' && 'One row per project · the whole registry'}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {snaps.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic text-center py-16">
            {buckets.length === 0
              ? 'No buckets selected — click one above.'
              : 'No project matches that search.'}
          </p>
        ) : (
          <>
            {mode === 'pipeline' && <PipelineView snaps={snaps} buckets={buckets} onOpen={setOpenProjectId} />}
            {mode === 'board' && <BoardView snaps={snaps} onOpen={setOpenProjectId} />}
            {mode === 'list' && <ListView snaps={snaps} onOpen={setOpenProjectId} />}
          </>
        )}
      </div>

      {openProjectId && (
        <ProjectDetail
          key={openProjectId}
          projectId={openProjectId}
          onClose={() => setOpenProjectId(null)}
          onGoTo={onGoTo}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Pipeline — the four lifecycle buckets, side by side
// ────────────────────────────────────────────────────────────────────────
function PipelineView({
  snaps, buckets, onOpen,
}: {
  snaps: ProjectSnapshot[];
  buckets: Lifecycle[];
  onOpen: (id: string) => void;
}) {
  const cols = LIFECYCLE_ORDER.filter(lc => buckets.includes(lc));
  return (
    <div className="max-w-full overflow-x-auto pb-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(250px, 1fr))` }}>
        {cols.map(lc => {
          const items = snaps.filter(s => s.project.lifecycle === lc);
          const meta = LIFECYCLE_META[lc];
          return (
            <div key={lc} className="rounded-lg border border-border bg-muted/30 min-w-0">
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold">{meta.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{meta.hint}</p>
              </div>
              <div className="p-2 space-y-2">
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">column clear</p>
                )}
                {items.map(s => <ProjectCard key={s.project.id} snap={s} onOpen={onOpen} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Board — the same cards, grouped by who owns the job
// ────────────────────────────────────────────────────────────────────────
function BoardView({ snaps, onOpen }: { snaps: ProjectSnapshot[]; onOpen: (id: string) => void }) {
  const owners = TEAM_ORDER.filter(t => snaps.some(s => s.project.owner === t));
  if (owners.length === 0) return null;
  return (
    <div className="max-w-full overflow-x-auto pb-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${owners.length}, minmax(230px, 1fr))` }}>
        {owners.map(owner => {
          const items = snaps.filter(s => s.project.owner === owner);
          return (
            <div key={owner} className="rounded-lg border border-border bg-muted/30 min-w-0">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <span className="font-mono text-[12px] font-semibold tracking-[0.08em]">{owner}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="p-2 space-y-2">
                {items.map(s => <ProjectCard key={s.project.id} snap={s} onOpen={onOpen} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// List — one row per project, the whole registry on one screen
// ────────────────────────────────────────────────────────────────────────
function ListView({ snaps, onOpen }: { snaps: ProjectSnapshot[]; onOpen: (id: string) => void }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-[12px]" style={{ minWidth: '1180px' }}>
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <Th className="w-[220px]">Project</Th>
            <Th>GC</Th>
            <Th>Lifecycle</Th>
            <Th>This month</Th>
            <Th className="text-right">Days late</Th>
            <Th className="text-right">Docs past due</Th>
            <Th className="text-right">Billed %</Th>
            <Th className="text-right">Left to bill</Th>
            <Th className="text-right">Retention held</Th>
            <Th>Next action</Th>
          </tr>
        </thead>
        <tbody>
          {snaps.map(s => {
            const p = s.project;
            const lc = LIFECYCLE_META[p.lifecycle];
            return (
              <tr
                key={p.id}
                className="border-t border-border/60 hover:bg-muted/30 cursor-pointer"
                onClick={() => onOpen(p.id)}
              >
                <td className="px-3 py-2.5">
                  <p className="font-semibold">{p.name}</p>
                  {p.gcProjectNumber && (
                    <p className="font-mono text-[10.5px] text-muted-foreground">{p.gcProjectNumber}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.gc}</td>
                <td className="px-3 py-2.5"><ChipPill tone={TONE[lc.tone]}>{lc.label}</ChipPill></td>
                <td className="px-3 py-2.5"><ThisMonth snap={s} /></td>
                <td className={cn(
                  'px-3 py-2.5 text-right tabular-nums',
                  s.daysLate > 0 ? cn(CLAY, 'font-semibold') : 'text-muted-foreground'
                )}>
                  {s.daysLate > 0 ? `${s.daysLate}d` : '—'}
                </td>
                <td className={cn(
                  'px-3 py-2.5 text-right tabular-nums',
                  s.docs.pastDueMonthly > 0 ? cn(CLAY, 'font-semibold') : 'text-muted-foreground'
                )}>
                  {s.docs.pastDueMonthly > 0 ? s.docs.pastDueMonthly : '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{s.fin.pctBilled}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{usd(s.fin.leftToBill)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{usd(s.fin.retentionHeld)}</td>
                <td className={cn('px-3 py-2.5 text-[11.5px] font-semibold', urgencyText(s.urgency))}>
                  {s.nextAction}
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
// The card — same one in Pipeline and Board
// ────────────────────────────────────────────────────────────────────────
function ProjectCard({ snap, onOpen }: { snap: ProjectSnapshot; onOpen: (id: string) => void }) {
  const p = snap.project;
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className="w-full text-left rounded-md border border-border bg-card p-3 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-snug" style={FRAUNCES}>{p.name}</p>
          <p className="text-[10.5px] text-muted-foreground truncate">
            {p.gc}{p.gcProjectNumber ? ` · ${p.gcProjectNumber}` : ''}
          </p>
        </div>
        <span
          className="shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
          title={`Owner ${p.owner}`}
        >
          {p.owner}
        </span>
      </div>

      <p className={cn(
        'mt-2 border-l-2 pl-2 text-[11.5px] font-semibold leading-snug',
        urgencyText(snap.urgency), urgencyBorder(snap.urgency)
      )}>
        {snap.nextAction}
      </p>

      <div className="mt-2 space-y-1">
        {p.lifecycle === 'onboarding' && (
          <>
            <p className="font-mono text-[10.5px] text-muted-foreground">{snap.onboardingDone}/6 set up</p>
            <div className="flex gap-0.5">
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={cn('h-1 flex-1 rounded-sm', i < snap.onboardingDone ? 'bg-[#2d6a4f]' : 'bg-border')}
                />
              ))}
            </div>
          </>
        )}

        {p.lifecycle === 'active' && (
          <>
            <ThisMonth snap={snap} />
            {snap.daysLate > 0 && (
              <p className={cn('font-mono text-[10.5px] font-semibold', CLAY)}>{snap.daysLate}d late</p>
            )}
            {snap.docs.pastDueMonthly > 0 && (
              <p className={cn('font-mono text-[10.5px] font-semibold', CLAY)}>
                {snap.docs.pastDueMonthly} docs past due
              </p>
            )}
            <p className="font-mono text-[10.5px] text-muted-foreground">
              Left to bill {usd(snap.fin.leftToBill)}
            </p>
          </>
        )}

        {p.lifecycle === 'fullyBilled' && snap.closeout && (
          <>
            <ChipPill tone={TONE[CLOSEOUT_META[snap.closeout.step].tone]}>
              {CLOSEOUT_META[snap.closeout.step].label}
            </ChipPill>
            <p className="font-mono text-[10.5px] text-muted-foreground">
              Retention held {usd(snap.closeout.retentionHeld)} · Outstanding {usd(snap.closeout.outstanding)}
            </p>
          </>
        )}

        {p.lifecycle === 'archived' && (
          <p className="font-mono text-[10.5px] text-muted-foreground">
            Archived {p.archivedAt ? fmtDate(p.archivedAt) : '—'}
          </p>
        )}
      </div>
    </button>
  );
}

// This month's state as one chip — stage, "not billing", or "not started".
function ThisMonth({ snap }: { snap: ProjectSnapshot }) {
  const state = snap.thisMonth.state;
  if (state === 'skipped') return <ChipPill tone="neutral">Not billing</ChipPill>;
  if (state === 'none') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-dashed border-border text-[9.5px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
        Not started
      </span>
    );
  }
  const stage = STAGE_META[state];
  return <ChipPill tone={TONE[stage.tone]}>{stage.label}</ChipPill>;
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] font-semibold', className)}>
      {children}
    </th>
  );
}
