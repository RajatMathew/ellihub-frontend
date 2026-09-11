/**
 * Accounting mailbox shell — one component drives requisitions@, procurement@,
 * and contracts@. Views: My Day · Mail · Calendar · Tasks · Peek (supervisors).
 *
 * Data seeded from the V2 prototype in
 * `2.ELLI HUB / DEV5 / V2 ELLI HUB DASHBOARD / 15. REQUISITIONS`. When the
 * Outlook connection is wired, only the source of data changes.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  CalendarPlus,
  Clock,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { ScrollArea } from '@app/components/ui/scroll-area';
import { cn } from '@app/lib/utils';

import {
  ACCOUNTING_STAFF,
  CURRENT_USER,
  EVENTS,
  MAILBOX_META,
  TASKS,
  TEAM,
  THREADS,
  getMailboxTasks,
  type CalEvent,
  type Mailbox,
  type Task,
  type TaskStatus,
  type TeamId,
  type Thread,
  type ThreadFolder,
} from './data';

type View = 'home' | 'mail' | 'tasks' | 'calendar' | 'peek';
const TODAY = '2026-07-07';

// ────────────────────────────────────────────────────────────────────────
// SHELL
// ────────────────────────────────────────────────────────────────────────
export default function AccountingMailbox({
  mailbox = 'requisitions',
}: {
  mailbox?: Mailbox;
}) {
  const [view, setView] = useState<View>('home');
  const [peekTarget, setPeekTarget] = useState<TeamId>(ACCOUNTING_STAFF[0]);
  const [initialThread, setInitialThread] = useState<string | undefined>();

  // Force re-render when a Task's status changes (Done / +1 day mutate in place)
  const [, bump] = useState(0);
  useEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener('tasks-changed', h);
    window.addEventListener('reqs-changed', h);
    return () => {
      window.removeEventListener('tasks-changed', h);
      window.removeEventListener('reqs-changed', h);
    };
  }, []);

  const openThreadInMail = (id: string) => {
    setInitialThread(id);
    setView('mail');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <MailboxHeader mailbox={mailbox} view={view} onSetView={setView} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'home' && <MyDayView who={CURRENT_USER} mailbox={mailbox} />}
        {view === 'mail' && <MailView mailbox={mailbox} initialThreadId={initialThread} />}
        {view === 'calendar' && <CalendarView mailbox={mailbox} />}
        {view === 'tasks' && <TasksView mailbox={mailbox} onOpenThread={openThreadInMail} />}
        {view === 'peek' && (
          <PeekView
            target={peekTarget}
            onTargetChange={setPeekTarget}
            mailbox={mailbox}
          />
        )}
      </div>
    </div>
  );
}

function MailboxHeader({
  mailbox,
  view,
  onSetView,
}: {
  mailbox: Mailbox;
  view: View;
  onSetView: (v: View) => void;
}) {
  const meta = MAILBOX_META[mailbox];
  // Horizontal tab set, top-right, in the order Peter set:
  // Home · Mail · Tasks · Calendar
  const TABS: { key: View; label: string }[] = [
    { key: 'home', label: 'Home' },
    { key: 'mail', label: 'Mail' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'calendar', label: 'Calendar' },
  ];
  return (
    <header className="shrink-0 flex items-center gap-4 px-6 py-3 border-b border-border bg-card">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Mailbox
        </p>
        <h1 className="text-[15px] font-semibold truncate">{meta.address}</h1>
      </div>
      <div className="ml-auto flex items-center gap-1">
        {TABS.map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSetView(t.key)}
              className={cn(
                'px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors',
                active
                  ? 'text-primary bg-primary/10 border-b-2 border-primary rounded-b-none'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────────────
// MY DAY
// ────────────────────────────────────────────────────────────────────────
function MyDayView({ who, mailbox, addedTasks = [] }: { who: TeamId; mailbox: Mailbox; addedTasks?: Task[] }) {
  const person = TEAM[who];
  const allTasks = [...getMailboxTasks(mailbox), ...addedTasks];
  const mine = allTasks.filter((t) => t.assignee === who);
  const today = mine.filter((t) => t.status === 'today');
  const waiting = mine.filter((t) => t.waiting);
  const upcoming = mine.filter((t) => t.status === 'tomorrow' || t.status === 'week');
  const done = mine.filter((t) => t.status === 'done');
  const myThreads = THREADS.filter((th) => th.owner === who && th.court === 'ours');
  const myEvents = EVENTS.filter((e) => e.owner === who && e.date >= TODAY).slice(0, 6);
  const meta = MAILBOX_META[mailbox];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Greeting — V20 pattern: "[Name]'s day — Tuesday, July 7" */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <span
            className="size-14 rounded-full text-white text-[16px] font-bold flex items-center justify-center shrink-0 mt-1"
            style={{ background: person.color }}>
            {person.id}
          </span>
          <div className="min-w-0">
            <h2
              className="text-[26px] font-semibold leading-tight tracking-tight"
              style={{ fontFamily: "'Fraunces','Georgia',serif" }}
            >
              {person.name.split(' ')[0]}'s day —{' '}
              <span className="font-bold">{meta.headline.when}</span>
            </h2>
            <p className="text-[13px] text-muted-foreground mt-2 leading-snug">
              Everything you need, in the order it needs you. Nothing more.{' '}
              <span className="text-[#c75e40] font-medium">Claude has your back all day.</span>
            </p>
          </div>
          <div className="ml-auto grid grid-cols-3 gap-4 shrink-0">
            <MyDayStat label="Today" count={today.length} tone="clay" />
            <MyDayStat label="Waiting" count={waiting.length} tone="warning" />
            <MyDayStat label="Done" count={done.length} tone="success" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MyDayColumn title="What needs your eyes today" count={today.length} tone="today">
          {today.map((t) => <TaskCard key={t.id} task={t} />)}
          {today.length === 0 && <EmptyNote>Clear. Enjoy it.</EmptyNote>}
        </MyDayColumn>

        <MyDayColumn title="Threads awaiting your reply" count={myThreads.length} tone="mail">
          {myThreads.map((t) => (
            <div key={t.id} className="rounded-md border border-border bg-card p-3">
              <p className="text-[10.5px] font-mono text-muted-foreground uppercase tracking-[0.08em]">
                {t.mailbox}@
              </p>
              <p className="text-[12.5px] font-semibold mt-1 leading-snug">{t.subject}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{t.from}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.folders.includes('compliance') && <ChipPill tone="warning">Compliance</ChipPill>}
                {t.project && <ChipPill tone="neutral">{t.project.split('—')[0].trim()}</ChipPill>}
              </div>
            </div>
          ))}
          {myThreads.length === 0 && <EmptyNote>No inbox threads on your plate.</EmptyNote>}
        </MyDayColumn>

        <MyDayColumn title="Your calendar" count={myEvents.length} tone="cal">
          {myEvents.map((e) => (
            <div key={e.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', eventDotTone(e.type))} />
                <span className="text-[11px] font-mono text-muted-foreground">
                  {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {e.time && ` · ${e.time}`}
                </span>
              </div>
              <p className="text-[12.5px] font-medium mt-1 leading-snug">{e.title}</p>
              {e.amount && <p className="text-[11px] font-mono font-semibold mt-1">{e.amount}</p>}
            </div>
          ))}
          {myEvents.length === 0 && <EmptyNote>No calendar items in your bucket.</EmptyNote>}
        </MyDayColumn>
      </div>

      {(upcoming.length > 0 || waiting.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {upcoming.length > 0 && (
            <MyDayColumn title="Coming up this week" count={upcoming.length} tone="week">
              {upcoming.map((t) => <TaskCard key={t.id} task={t} />)}
            </MyDayColumn>
          )}
          {waiting.length > 0 && (
            <MyDayColumn title="Waiting on someone else" count={waiting.length} tone="wait">
              {waiting.map((t) => <TaskCard key={t.id} task={t} />)}
            </MyDayColumn>
          )}
        </div>
      )}
    </div>
  );
}

function MyDayStat({ label, count, tone }: { label: string; count: number; tone: 'clay' | 'warning' | 'success' }) {
  const cls = {
    clay: 'text-[#c75e40]', warning: 'text-[#b8860b]', success: 'text-success',
  }[tone];
  return (
    <div className="text-center">
      <p className={cn('text-[26px] font-serif font-semibold leading-none', cls)}>{count}</p>
      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
function MyDayColumn({
  title, count, children,
}: {
  title: string; count: number; tone: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2 min-h-0">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px] text-muted-foreground py-3 px-2">{children}</p>;
}

// ────────────────────────────────────────────────────────────────────────
// PEEK — supervisors see any accounting person's My Day
// ────────────────────────────────────────────────────────────────────────
function PeekView({
  target, onTargetChange, mailbox,
}: {
  target: TeamId; onTargetChange: (id: TeamId) => void; mailbox: Mailbox;
}) {
  const [drafted, setDrafted] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: '', detail: '', due: '' });
  const targetPerson = TEAM[target];

  const addTask = () => {
    if (!draft.title.trim()) return;
    const t: Task = {
      id: `peek-${Date.now()}`,
      mailbox: mailbox === 'requisitions' ? 'requisitions' : mailbox,
      assignee: target,
      assignedBy: CURRENT_USER,
      title: draft.title,
      status: 'today',
      due: draft.due || undefined,
      detail: draft.detail || undefined,
      from: 'internal',
    };
    setDrafted((prev) => [...prev, t]);
    setDraft({ title: '', detail: '', due: '' });
    setShowAdd(false);
  };

  return (
    <div className="h-full flex flex-col bg-background min-h-0">
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-card">
        <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
          Peek
        </span>
        <span className="text-[12.5px] text-muted-foreground">Viewing</span>
        {ACCOUNTING_STAFF.map((k) => {
          const p = TEAM[k];
          return (
            <button key={k} type="button" onClick={() => onTargetChange(k)}
              className={cn(
                'text-[12px] px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5',
                target === k ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              )}>
              <span className="size-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                style={{ background: p.color }}>
                {p.id}
              </span>
              {p.name.split(' ')[0]}
            </button>
          );
        })}
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowAdd((v) => !v)} className="gap-1.5">
            <Plus className="size-3.5" /> Add task for {targetPerson.name.split(' ')[0]}
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="shrink-0 border-b border-border bg-muted/40 px-6 py-4">
          <div className="max-w-2xl space-y-2">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">Task</label>
              <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder={`What should ${targetPerson.name.split(' ')[0]} do?`} className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">Detail</label>
              <Input value={draft.detail} onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
                placeholder="Optional context — what to do, where to find it" className="mt-1" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">Due</label>
                <Input type="date" value={draft.due} onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))}
                  className="mt-1" />
              </div>
              <Button onClick={addTask}>Add to {targetPerson.name.split(' ')[0]}’s list</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        <MyDayView who={target} mailbox={mailbox} addedTasks={drafted} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// MAIL VIEW
// ────────────────────────────────────────────────────────────────────────
function MailView({ mailbox, initialThreadId }: { mailbox: Mailbox; initialThreadId?: string }) {
  const [folder, setFolder] = useState<ThreadFolder>('inbox');
  const boxThreads = useMemo(
    () => THREADS.filter((t) => t.mailbox === mailbox),
    [mailbox]
  );
  const [threadId, setThreadId] = useState<string>(initialThreadId ?? boxThreads[0]?.id ?? '');

  // When Tasks jumps here with a specific thread, respect it and reset folder to
  // whichever one contains that thread.
  useEffect(() => {
    if (!initialThreadId) return;
    const target = boxThreads.find((t) => t.id === initialThreadId);
    if (!target) return;
    setThreadId(initialThreadId);
    if (!target.folders.includes(folder)) setFolder(target.folders[0]);
  }, [initialThreadId, boxThreads, folder]);

  // V20 mail state (top-bar-driven, no left folder rail)
  const [primary, setPrimary] = useState<'projects' | 'other'>('projects');
  const [projFilter, setProjFilter] = useState<string>('all');
  const [chip, setChip] = useState<'all' | 'unread'>('all');
  const [mboxFilter, setMboxFilter] = useState<'flagged' | 'sent' | 'drafts' | 'archive' | 'deleted' | null>(null);
  const [search, setSearch] = useState('');
  const [peMenu, setPeMenu] = useState(false);
  const [mboxMenu, setMboxMenu] = useState(false);

  // Unique project list drawn from this mailbox's threads
  const projects = useMemo(() => {
    const s = new Set<string>();
    boxThreads.forEach((t) => t.project && s.add(t.project));
    return [...s].sort();
  }, [boxThreads]);

  // Visible set — V20's `visibleSet()` port
  const visible = useMemo(() => {
    let set = boxThreads;
    if (mboxFilter) {
      // Mailbox category (Flagged / Sent / Drafts / Archive / Deleted).
      // Flagged is derived; others don't have seed data yet but the UI slot exists.
      set = set.filter((t) => (t as unknown as { flagged?: boolean }).flagged);
    } else if (primary === 'projects') {
      set = set.filter((t) => !!t.project);
      if (projFilter !== 'all') set = set.filter((t) => t.project === projFilter);
    } else {
      set = set.filter((t) => !t.project);
    }
    if (chip === 'unread') set = set.filter((t) => t.unread);
    if (search) {
      const q = search.toLowerCase();
      set = set.filter(
        (t) =>
          t.from.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.preview.toLowerCase().includes(q) ||
          (t.project?.toLowerCase().includes(q) ?? false)
      );
    }
    return set;
  }, [boxThreads, primary, projFilter, chip, search, mboxFilter]);

  const thread = visible.find((t) => t.id === threadId) ?? visible[0];
  const meta = MAILBOX_META[mailbox];
  // suppress unused warnings for legacy folder state (kept for initialThread compat)
  void folder; void meta; void setFolder;

  // Reset threadId when the visible set changes so we always have a valid selection
  useEffect(() => {
    if (!visible.find((t) => t.id === threadId) && visible.length > 0) {
      setThreadId(visible[0].id);
    }
  }, [visible, threadId]);

  return (
    <div className="flex flex-col h-full">
      {/* V20 top bar: Project emails ▾ · Other · Filters ▾ · search · + New */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setPeMenu((v) => !v);
              setMboxMenu(false);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12.5px] font-semibold border transition-colors',
              primary === 'projects' && !mboxFilter
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground hover:text-foreground border-border'
            )}
          >
            <span>{projFilter === 'all' ? 'Project emails' : projFilter.split('—')[0].trim()}</span>
            <span className="text-[9px]">▾</span>
          </button>
          {peMenu && (
            <div className="absolute left-0 top-9 z-30 w-[260px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              <div className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground border-b border-border/50">
                Filter to project
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrimary('projects');
                  setProjFilter('all');
                  setMboxFilter(null);
                  setPeMenu(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-[12.5px] border-b border-border/50 last:border-b-0 hover:bg-accent',
                  projFilter === 'all' && !mboxFilter && 'bg-accent font-semibold'
                )}
              >
                All projects
              </button>
              {projects.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPrimary('projects');
                    setProjFilter(p);
                    setMboxFilter(null);
                    setPeMenu(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-[12.5px] border-b border-border/50 last:border-b-0 hover:bg-accent',
                    projFilter === p && !mboxFilter && 'bg-accent font-semibold'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setPrimary('other');
            setMboxFilter(null);
          }}
          className={cn(
            'px-3 h-8 rounded-md text-[12.5px] font-semibold border transition-colors',
            primary === 'other' && !mboxFilter
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground hover:text-foreground border-border'
          )}
        >
          Other
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMboxMenu((v) => !v);
              setPeMenu(false);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12.5px] font-semibold border transition-colors',
              mboxFilter
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground hover:text-foreground border-border'
            )}
          >
            <span>
              {mboxFilter
                ? mboxFilter[0].toUpperCase() + mboxFilter.slice(1)
                : chip === 'unread'
                  ? 'Filters · Unread'
                  : 'Filters'}
            </span>
            <span className="text-[9px]">▾</span>
          </button>
          {mboxMenu && (
            <div className="absolute left-0 top-9 z-30 w-[220px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              <div className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground border-b border-border/50">
                Read status
              </div>
              {(['all', 'unread'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setChip(c);
                    setMboxMenu(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-[12.5px] border-b border-border/50 hover:bg-accent',
                    chip === c && 'bg-accent font-semibold'
                  )}
                >
                  {c === 'all' ? 'All' : 'Unread'}
                </button>
              ))}
              <div className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground border-y border-border/50 bg-muted/40">
                Mailbox
              </div>
              {(['flagged', 'sent', 'drafts', 'archive', 'deleted'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setMboxFilter(k);
                    setMboxMenu(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-[12.5px] border-b border-border/50 last:border-b-0 hover:bg-accent',
                    mboxFilter === k && 'bg-accent font-semibold'
                  )}
                >
                  {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 max-w-[260px] ml-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail…"
            className="pl-8 h-8 text-[12px]"
          />
        </div>

        <Button size="sm" className="ml-auto gap-1.5">
          + New
        </Button>
      </div>

      {/* Two-pane body — V20 shape: paper background shows through as a gap
          between the list (cream) and reading pane (white card). */}
      <div
        className="flex-1 min-h-0 grid overflow-hidden bg-[#f1ece2] gap-4 p-4"
        style={{ gridTemplateColumns: 'minmax(320px, 360px) minmax(0, 1fr)' }}
      >
        <section className="rounded-lg bg-[#faf7f0] border border-border/60 flex flex-col min-w-0 overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
            <div className="px-3 pt-3 pb-2">
              {visible.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  selected={thread?.id === t.id}
                  onSelect={() => setThreadId(t.id)}
                  showProjectChip={primary === 'projects' && projFilter === 'all'}
                />
              ))}
              {visible.length === 0 && (
                <div className="p-8 text-center">
                  {primary === 'other' && !search ? (
                    <>
                      <p
                        className="text-[16px] font-semibold text-foreground"
                        style={{ fontFamily: "'Fraunces','Georgia',serif" }}
                      >
                        Everything is routed to its project.
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-1">Zero noise today.</p>
                    </>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      Nothing here{search ? ` matching "${search}"` : ''}.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-card border border-border/60 flex min-w-0 overflow-hidden shadow-sm">
          {thread ? (
            <ReadingPane thread={thread} mailbox={mailbox} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-[12px]">
              Select an email to read.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  selected,
  onSelect,
  showProjectChip,
}: {
  thread: Thread;
  selected: boolean;
  onSelect: () => void;
  showProjectChip?: boolean;
}) {
  // V20 email row: from · org + optional project chip + time on top row,
  // bold subject, one-line preview, subtle chips below.
  const [flagged, setFlagged] = useState<boolean>(false);
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      className={cn(
        'group bg-card border rounded-md px-3 py-2.5 mb-1.5 cursor-pointer transition-all w-full min-w-0 overflow-hidden',
        selected
          ? 'border-primary shadow-[0_0_0_1px_hsl(var(--primary))]'
          : 'border-border hover:border-muted-foreground/40 hover:shadow-sm'
      )}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className={cn(
            'size-[7px] rounded-full shrink-0 mt-0.5',
            thread.unread ? 'bg-primary' : 'border border-border'
          )}
        />
        <p
          className={cn(
            'text-[12px] truncate flex-1 min-w-0',
            thread.unread ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
          )}
        >
          {thread.from}
        </p>
        {showProjectChip && thread.project && (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded max-w-[80px] truncate">
            {thread.project.split('—')[0].split(':')[0].trim()}
          </span>
        )}
        {flagged && <span className="text-[11px] text-warning shrink-0">⚑</span>}
        <span className="font-mono text-[9.5px] text-muted-foreground shrink-0">{thread.when}</span>
      </div>
      <p
        className={cn(
          'text-[12px] mt-1 truncate w-full',
          thread.unread ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground'
        )}
      >
        {thread.subject}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate w-full">{thread.preview}</p>

      {/* Row-hover actions (V20 quick-actions on the right edge) */}
      <div className="hidden group-hover:flex items-center gap-1 mt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFlagged((v) => !v);
          }}
          className={cn(
            'text-[10.5px] px-1.5 py-0.5 rounded border font-semibold',
            flagged
              ? 'bg-warning/15 text-warning border-warning/30'
              : 'border-border text-muted-foreground hover:bg-warning/10 hover:text-warning'
          )}
          title="Flag"
        >
          ⚑
        </button>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="text-[10.5px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-accent"
          title="Archive"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="text-[10.5px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          ×
        </button>
        {thread.claudeActed && (
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.06em] font-semibold text-success">
            Claude acted
          </span>
        )}
      </div>
    </div>
  );
}

function CourtChip({ court }: { court: Thread['court'] }) {
  if (court === 'ours') return <ChipPill tone="clay">Our court</ChipPill>;
  if (court === 'gc') return <ChipPill tone="primary">GC’s court</ChipPill>;
  return null;
}

function ChipPill({
  children, tone,
}: {
  children: React.ReactNode;
  tone: 'clay' | 'primary' | 'warning' | 'neutral' | 'claude' | 'success';
}) {
  const map: Record<typeof tone, string> = {
    clay: 'bg-[#f7e9e4] text-[#c75e40]',
    primary: 'bg-secondary text-secondary-foreground',
    warning: 'bg-[#f7efd9] text-[#b8860b]',
    neutral: 'bg-muted text-muted-foreground border border-border',
    claude: 'bg-[#eef3f0] text-success',
    success: 'bg-[#e4efe9] text-success',
  };
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-[0.03em]', map[tone])}>
      {children}
    </span>
  );
}

function ReadingPane({ thread, mailbox }: { thread: Thread; mailbox: Mailbox }) {
  const owner = TEAM[thread.owner];
  const filedTo = thread.project
    ? `Files / ${thread.project.split('—')[0].split(':')[0].trim()} / ${mailboxFolderLabel(mailbox)} / 2026-07`
    : `${mailboxFolderLabel(mailbox)} / General / 2026-07`;
  // First message is the most recent from V20 sample; render just that one
  // in the summary + body treatment. Additional messages fall below.
  const primary = thread.messages[thread.messages.length - 1] ?? thread.messages[0];
  const initials = primary
    ? primary.who
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-card">
      {/* Top bar — nav + optional keyboard hints */}
      <div className="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-border">
        <div className="flex gap-1">
          <button className="w-7 h-7 rounded border border-border text-[13px] text-muted-foreground hover:border-primary hover:text-primary" title="Previous">‹</button>
          <button className="w-7 h-7 rounded border border-border text-[13px] text-muted-foreground hover:border-primary hover:text-primary" title="Next">›</button>
        </div>
        <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">
          <span className="border border-border rounded px-1.5 py-0.5">↑↓</span> navigate ·
          <span className="border border-border rounded px-1.5 py-0.5 ml-1">R</span> reply ·
          <span className="border border-border rounded px-1.5 py-0.5 ml-1">E</span> archive
        </span>
      </div>

      <ScrollArea className="flex-1 px-6 py-5">
        {/* mr-from block */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            'size-10 rounded-full flex items-center justify-center font-mono text-[13px] font-semibold shrink-0',
            primary?.external ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
          )}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold truncate">{primary?.who}</p>
            <p className="text-[11px] text-muted-foreground">to {MAILBOX_META[mailbox].address}</p>
          </div>
          <div className="ml-auto text-right text-[11px] font-mono text-muted-foreground leading-relaxed">
            {primary?.when}
            <br />
            filed: {thread.project ? thread.project.split('—')[0].split(':')[0].trim() : 'General'}
          </div>
        </div>

        {/* Subject in Fraunces */}
        <h1 className="text-[22px] font-semibold leading-tight mb-2" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
          {thread.subject}
        </h1>

        {/* Pills row (court / compliance / auto-filed / owner) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <CourtChip court={thread.court} />
          {thread.folders.includes('compliance') && <ChipPill tone="warning">Compliance</ChipPill>}
          <ChipPill tone="success">Auto-filed</ChipPill>
          <span className="ml-1 inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span className="size-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: owner.color }}>{owner.id}</span>
            {owner.name.split(' ')[0]}
          </span>
        </div>

        {/* Claude one-line-truth summary card */}
        {thread.claudeActed && (
          <div className="rounded-md border border-primary/30 bg-primary/[0.06] border-l-[3px] border-l-primary px-4 py-3 mb-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] font-bold text-primary mb-1.5">
              Claude read it — the one-line truth
            </p>
            <p className="text-[13px] leading-[1.55] text-foreground/85 whitespace-pre-line">
              {thread.claudeActed}
            </p>
          </div>
        )}

        {/* Linked pay app / requisition / contract — V20 mr-task row */}
        {thread.linkedReq && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 mb-4">
            <span className="font-mono text-[10px] font-semibold text-primary">
              {mailbox === 'requisitions' ? 'REQ' : mailbox === 'procurement' ? 'PO' : 'CON'}
            </span>
            <span className="text-[12px] flex-1 min-w-0 truncate">
              <b>{thread.linkedReq.label}</b>
              {thread.linkedReq.amount && (
                <> · <span className="font-mono">{thread.linkedReq.amount}</span></>
              )}
              {' · '}
              <span className="text-muted-foreground">{thread.linkedReq.status}</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#c75e40] shrink-0">
              open →
            </span>
          </div>
        )}

        {/* Body — thread messages */}
        <div className="max-w-[680px] text-[13px] leading-[1.7] text-foreground/85 space-y-3">
          {thread.messages.map((m, i) => (
            <div key={i}>
              {thread.messages.length > 1 && (
                <p className="text-[11px] font-mono text-muted-foreground mb-1">
                  {m.who} · {m.email} · {m.when}
                </p>
              )}
              <p className="whitespace-pre-line">{m.body}</p>
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {m.attachments.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1 text-[11px] font-medium bg-muted"
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.05em] font-semibold text-muted-foreground border border-border rounded px-1 py-0.5 bg-background">
                        {a.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* What Claude did — inline strip (moved out of the removed right rail) */}
        <div className="mt-6 rounded-md border border-border bg-background p-3 max-w-[680px]">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-2">
            What Claude did — automatically
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11.5px] text-foreground/80">
            <p>
              📁 Filed attachments to{' '}
              <span className="font-mono text-foreground/95 text-[11px]">{filedTo}</span>
            </p>
            <p>📎 Classified: {classifyAttachments(thread, mailbox)}</p>
            {thread.court === 'ours' && <p>⏰ Follow-up scheduled if quiet 3 business days</p>}
            {thread.claudeActed && <p>✨ {shortenClaudeSummary(thread.claudeActed)}</p>}
          </div>
        </div>

        {/* Reply pane */}
        <div className="mt-6 max-w-[680px] border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="size-3.5 rounded-full bg-[#c75e40] text-white text-[7px] font-bold flex items-center justify-center">
              CD
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] font-semibold text-[#c75e40]">
              Drafted reply — edit anything, then send. Goes out through your Outlook.
            </span>
          </div>
          <textarea
            defaultValue={
              thread.claudeActed
                ? `Hi,\n\n[Claude's draft would appear here based on the thread context.]\n\nThanks,\n${TEAM[owner.id].name.split(' ')[0]}`
                : ''
            }
            placeholder="Type your reply — or let Claude draft it from the thread."
            className="w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-[12.5px] leading-[1.55] resize-y focus:outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" className="gap-1.5">Send reply</Button>
            <Button size="sm" variant="outline">Reply all</Button>
            <Button size="sm" variant="outline">Forward</Button>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
              already filed · message-ID kept
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// CALENDAR VIEW
// ────────────────────────────────────────────────────────────────────────
// V20-style calendar: Week · Month · Timeline mode switcher, single
// Shop Calendar checkbox (no Claude Personal / Claude Shop split — the
// accounting shop is one calendar), event pills colored by TYPE (deadline
// / reminder / meeting / cadence) with hover-to-reveal Done / +1 day.
type CalMode = 'week' | 'month' | 'tl';

const WEEK_DAYS = [
  { d: 'Mon', iso: '2026-07-06', today: false, num: 6 },
  { d: 'Tue', iso: '2026-07-07', today: true,  num: 7 },
  { d: 'Wed', iso: '2026-07-08', today: false, num: 8 },
  { d: 'Thu', iso: '2026-07-09', today: false, num: 9 },
  { d: 'Fri', iso: '2026-07-10', today: false, num: 10 },
];

function CalendarView({ mailbox }: { mailbox: Mailbox }) {
  const [mode, setMode] = useState<CalMode>('week');
  const [monthAnchor, setMonthAnchor] = useState(new Date(2026, 6, 1));
  const [shopOn, setShopOn] = useState(true);
  const [tlProj, setTlProj] = useState<string>('all');
  const [tlMenu, setTlMenu] = useState(false);
  // Cheap re-render trigger for wkDone / wkPush mutations
  const [, bump] = useState(0);
  const rerender = () => bump((n) => n + 1);

  const boxEvents = useMemo(
    () => EVENTS.filter((e) => e.mailbox === mailbox || e.mailbox === 'all'),
    [mailbox]
  );
  const visibleEvents = shopOn ? boxEvents : [];

  const projects = useMemo(() => {
    const s = new Set<string>();
    boxEvents.forEach((e) => e.project && s.add(e.project));
    return [...s].sort();
  }, [boxEvents]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of visibleEvents) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return m;
  }, [visibleEvents]);

  const monthLabel = monthAnchor.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const title =
    mode === 'week' ? 'Week of July 6 – 10'
    : mode === 'month' ? monthLabel
    : 'Timeline by Project · July 6 – 10';

  const wkDone = (id: string) => {
    const idx = EVENTS.findIndex((e) => e.id === id);
    if (idx >= 0) EVENTS.splice(idx, 1);
    rerender();
  };
  const wkPush = (id: string) => {
    const e = EVENTS.find((x) => x.id === id);
    if (!e) return;
    const d = new Date(e.date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    e.date = isoDate(d);
    rerender();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar — mode switcher, title, project dropdown (tl), calendar toggles */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-3 border-b border-border bg-card">
        <div className="inline-flex rounded-md border border-border overflow-hidden bg-background">
          {(['week', 'month', 'tl'] as CalMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'px-3.5 py-1 text-[12px] font-semibold border-r border-border last:border-r-0',
                mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {m === 'week' ? 'Week' : m === 'month' ? 'Month' : 'Timeline'}
            </button>
          ))}
        </div>
        <h2 className="text-[15px] font-semibold" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
          {title}
        </h2>

        {mode === 'month' && (
          <div className="flex items-center gap-1 ml-2">
            <Button variant="outline" size="sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}

        {mode === 'tl' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setTlMenu((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 h-8 text-[12px] font-medium',
                tlProj !== 'all' && 'bg-primary text-primary-foreground border-primary'
              )}
            >
              {tlProj === 'all' ? 'All projects' : tlProj}
              <span className="text-[9px]">▾</span>
            </button>
            {tlMenu && (
              <div className="absolute left-0 top-9 z-30 w-[280px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setTlProj('all'); setTlMenu(false); }}
                  className={cn('w-full text-left px-3 py-2 text-[12.5px] border-b border-border/50 hover:bg-accent', tlProj === 'all' && 'bg-accent font-semibold')}
                >
                  All projects
                </button>
                {projects.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setTlProj(p); setTlMenu(false); }}
                    className={cn('w-full text-left px-3 py-2 text-[12.5px] border-b border-border/50 last:border-b-0 hover:bg-accent', tlProj === p && 'bg-accent font-semibold')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'tl' && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <TlLeg color="bg-destructive" label="Overdue" />
            <TlLeg color="bg-warning" label="Reminder" />
            <TlLeg color="bg-primary" label="Meeting" />
            <TlLeg color="bg-success" label="Cadence" />
          </div>
        )}

        {mode !== 'tl' && (
          <span className="text-[11px] text-muted-foreground italic">
            hover any event — the event is the task
          </span>
        )}

        {/* Only the Shop Calendar checkbox — Claude Personal / Claude Shop removed per Peter */}
        {mode !== 'tl' && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShopOn((v) => !v)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 h-8 text-[12px]',
                !shopOn && 'opacity-60'
              )}
            >
              <span className={cn(
                'size-3 rounded-sm border-[1.5px] flex items-center justify-center text-[8px] text-white',
                shopOn ? 'bg-primary border-primary' : 'bg-transparent border-muted-foreground'
              )}>
                {shopOn ? '✓' : ''}
              </span>
              Shop Calendar
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                accounting · one team
              </span>
            </button>
          </div>
        )}
      </div>

      {/* WEEK grid */}
      {mode === 'week' && (
        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <div className="h-full grid grid-cols-5 rounded-lg border border-border bg-card overflow-hidden">
            {WEEK_DAYS.map((d) => {
              const dayEvts = (eventsByDate.get(d.iso) ?? []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              return (
                <div key={d.iso} className={cn('border-r border-border last:border-r-0 flex flex-col min-w-0', d.today && 'bg-primary/[0.04]')}>
                  <div className="px-3 py-2 border-b border-border flex items-baseline gap-2">
                    <span className={cn('font-mono text-[9.5px] uppercase tracking-[0.08em] font-semibold', d.today ? 'text-primary' : 'text-muted-foreground')}>
                      {d.d}
                    </span>
                    <span className={cn('text-[16px] font-semibold', d.today ? 'text-primary' : 'text-foreground')} style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
                      {d.num}
                    </span>
                    {d.today && (
                      <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.1em] text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full">TODAY</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {dayEvts.map((e) => (
                      <WeekEvent key={e.id} evt={e} onDone={() => wkDone(e.id)} onPush={() => wkPush(e.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTH grid */}
      {mode === 'month' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 border-b border-border bg-card text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-6 border-t border-border">
            {buildMonthGrid(monthAnchor).map((cell, i) => {
              const iso = cell ? isoDate(cell) : '';
              const dayEvents = iso ? eventsByDate.get(iso) ?? [] : [];
              const isToday = iso === TODAY;
              return (
                <div
                  key={i}
                  className={cn(
                    'border-r border-b border-border p-1.5 flex flex-col gap-1 min-h-0 overflow-hidden',
                    !cell && 'bg-muted/40',
                    isToday && 'bg-primary/[0.06]'
                  )}
                >
                  {cell && (
                    <span className={cn('text-[11px] font-semibold', isToday ? 'text-primary' : cell.getMonth() !== monthAnchor.getMonth() ? 'text-muted-foreground' : 'text-foreground')}>
                      {cell.getDate()}
                    </span>
                  )}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className={cn('rounded px-1.5 py-0.5 text-[10px] leading-tight truncate', eventTone(e.type))}
                        title={`${e.title}${e.detail ? ' · ' + e.detail : ''}`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-1.5">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TIMELINE — lanes by project */}
      {mode === 'tl' && (
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden min-w-[900px]">
            <div className="grid grid-cols-[220px_repeat(5,1fr)] border-b border-border bg-muted/40 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
              <div className="px-3 py-2 border-r border-border font-semibold">Project</div>
              {WEEK_DAYS.map((d) => (
                <div key={d.iso} className={cn('px-3 py-2 border-r border-border last:border-r-0 font-semibold', d.today && 'text-primary')}>
                  {d.d} {d.num}{d.today ? ' · today' : ''}
                </div>
              ))}
            </div>
            {projects
              .filter((p) => tlProj === 'all' || p === tlProj)
              .map((p) => {
                const projEvts = visibleEvents.filter((e) => e.project === p);
                const hasWeek = projEvts.some((e) => WEEK_DAYS.some((d) => d.iso === e.date));
                const lane = { color: hasWeek ? 'border-l-warning' : 'border-l-success' };
                return (
                  <div key={p} className={cn('grid grid-cols-[220px_repeat(5,1fr)] border-b border-border/60 last:border-b-0 border-l-4', lane.color)}>
                    <div className="px-3 py-2 border-r border-border">
                      <p className="text-[12.5px] font-semibold">{p.split('—')[0].trim()}</p>
                      <p className="text-[10.5px] text-muted-foreground font-mono uppercase tracking-[0.08em] mt-0.5">
                        {hasWeek ? 'active this week' : 'clean · no items due'}
                      </p>
                    </div>
                    {WEEK_DAYS.map((d) => {
                      const cellEvts = projEvts.filter((e) => e.date === d.iso);
                      return (
                        <div key={d.iso} className={cn('px-2 py-2 border-r border-border/60 last:border-r-0 min-h-[52px] space-y-1', d.today && 'bg-primary/[0.04]')}>
                          {cellEvts.map((e) => (
                            <div key={e.id} className={cn('rounded px-1.5 py-1 text-[10.5px] leading-tight', eventTone(e.type))} title={e.title}>
                              <span className="font-semibold block truncate">{e.title.length > 32 ? e.title.slice(0, 32) + '…' : e.title}</span>
                              {e.time && <span className="text-[9px] opacity-70 font-mono">{e.time}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            <div
              className="grid grid-cols-[220px_repeat(5,1fr)] border-t border-border bg-muted/30 text-[11px] italic text-muted-foreground"
              onClick={() => setTlProj('all')}
              role="button"
            >
              <div className="col-span-6 px-3 py-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] font-semibold">+ MORE</span>{' '}
                projects with nothing due this week — collapsed until they need attention.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TlLeg({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', color)} />
      {label}
    </span>
  );
}

function WeekEvent({ evt, onDone, onPush }: { evt: CalEvent; onDone: () => void; onPush: () => void }) {
  return (
    <div className={cn('group rounded-md border border-l-[3px] px-2.5 py-1.5', weekEventTone(evt.type))}>
      {evt.time && (
        <p className="font-mono text-[9px] text-muted-foreground">{evt.time}</p>
      )}
      <p className="text-[11.5px] font-semibold leading-snug text-foreground">{evt.title}</p>
      {evt.amount && (
        <p className="text-[10.5px] font-mono font-semibold mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {evt.amount}
        </p>
      )}
      <p className={cn('mt-1 font-mono text-[8.5px] uppercase tracking-[0.05em]', weekEventWhoTone(evt.type))}>
        {evt.owner ? `${TEAM[evt.owner].name.split(' ')[0]} · ` : ''}
        {evt.type}
      </p>
      <div className="hidden group-hover:flex gap-1.5 mt-1.5 pt-1.5 border-t border-dashed border-border">
        <button
          type="button"
          onClick={onDone}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-success/15 text-success hover:bg-success/25"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onPush}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-accent"
        >
          +1 day
        </button>
        <span className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.05em] text-muted-foreground italic self-center">
          edits the task — not just the chip
        </span>
      </div>
    </div>
  );
}

function weekEventTone(t: CalEvent['type']) {
  switch (t) {
    case 'deadline': return 'bg-[#fdecec] border-[#FECACA] border-l-destructive';
    case 'reminder': return 'bg-[#f7efd9] border-[#f0dc9c] border-l-warning';
    case 'meeting':  return 'bg-secondary border-secondary border-l-primary';
    case 'cadence':  return 'bg-[#eef3f0] border-[#c9dcd1] border-l-success';
    default:         return 'bg-muted border-border border-l-muted-foreground';
  }
}
function weekEventWhoTone(t: CalEvent['type']) {
  switch (t) {
    case 'deadline': return 'text-destructive';
    case 'reminder': return 'text-warning';
    case 'meeting':  return 'text-primary';
    case 'cadence':  return 'text-success';
    default:         return 'text-muted-foreground';
  }
}

function eventTone(t: CalEvent['type']) {
  switch (t) {
    case 'deadline': return 'bg-[#fdecec] text-[#dc2626]';
    case 'reminder': return 'bg-[#f7efd9] text-[#8a6a10]';
    case 'meeting': return 'bg-secondary text-secondary-foreground';
    case 'cadence': return 'bg-[#eef3f0] text-success';
    case 'window':
    default: return 'bg-muted text-foreground/70';
  }
}
function eventDotTone(t: CalEvent['type']) {
  switch (t) {
    case 'deadline': return 'bg-destructive';
    case 'reminder': return 'bg-warning';
    case 'meeting': return 'bg-primary';
    case 'cadence': return 'bg-success';
    default: return 'bg-muted-foreground';
  }
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function buildMonthGrid(anchor: Date): (Date | null)[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startDow = first.getDay();
  const cells: (Date | null)[] = [];
  const startDate = new Date(first);
  startDate.setDate(1 - startDow);
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push(d);
  }
  return cells;
}

// ────────────────────────────────────────────────────────────────────────
// TASKS VIEW
// ────────────────────────────────────────────────────────────────────────
// V20-style 5-column board — worst first.
const TASK_COLUMNS: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'overdue',  label: 'Overdue',        dot: 'bg-destructive' },
  { key: 'today',    label: 'Due Today · Tue', dot: 'bg-warning' },
  { key: 'tomorrow', label: 'Tomorrow · Wed',  dot: 'bg-primary' },
  { key: 'week',     label: 'This Week',       dot: 'bg-primary' },
  { key: 'done',     label: 'Completed',       dot: 'bg-success' },
];

function TasksView({ mailbox, onOpenThread }: { mailbox: Mailbox; onOpenThread: (id: string) => void }) {
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | TeamId>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projMenuOpen, setProjMenuOpen] = useState(false);

  const boxTasks = useMemo(() => getMailboxTasks(mailbox), [mailbox]);

  // Unique project list for the dropdown
  const projects = useMemo(() => {
    const set = new Set<string>();
    boxTasks.forEach((t) => t.project && set.add(t.project));
    return [...set].sort();
  }, [boxTasks]);

  const filtered = boxTasks
    .filter((t) => assigneeFilter === 'all' || t.assignee === assigneeFilter)
    .filter((t) => projectFilter === 'all' ||
      (projectFilter === 'waiting' ? t.waiting : t.project === projectFilter));

  // Only the 4 accounting staff show as filter chips; the supervisors
  // (Lissette / Tomasz / Peter) see everything via "Everyone".
  const filterKeys: TeamId[] = [...ACCOUNTING_STAFF];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar — worst-first note + project dropdown */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
        <div>
          <h2 className="text-[13.5px] font-semibold">Tasks — every email became one of these</h2>
          <p className="text-[10.5px] text-muted-foreground italic mt-0.5">worst first · every number below is computed live and filters the board</p>
        </div>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setProjMenuOpen((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 h-8 text-[12px] font-medium',
              projectFilter !== 'all' && 'bg-primary text-primary-foreground border-primary'
            )}
          >
            {projectFilter === 'all' ? 'All projects' : projectFilter === 'waiting' ? 'Waiting on others' : projectFilter}
            <span className="text-[9px]">▾</span>
          </button>
          {projMenuOpen && (
            <div className="absolute right-0 top-9 z-30 w-[280px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              <ProjBtn label="All projects" active={projectFilter === 'all'} onClick={() => { setProjectFilter('all'); setProjMenuOpen(false); }} />
              {projects.map((p) => {
                const count = boxTasks.filter((t) => t.project === p).length;
                return <ProjBtn key={p} label={p} count={count} active={projectFilter === p} live onClick={() => { setProjectFilter(p); setProjMenuOpen(false); }} />;
              })}
              <ProjBtn label="Waiting on others" active={projectFilter === 'waiting'} count={boxTasks.filter((t) => t.waiting).length} onClick={() => { setProjectFilter('waiting'); setProjMenuOpen(false); }} />
            </div>
          )}
        </div>
      </div>

      {/* Assignee filter pills */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-2.5 border-b border-border bg-background overflow-x-auto">
        <span className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-mono">Filter</span>
        <button
          type="button"
          onClick={() => setAssigneeFilter('all')}
          className={cn(
            'text-[12px] px-3 py-1 rounded-full border transition-colors',
            assigneeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
          )}
        >
          Everyone
        </button>
        {filterKeys.map((k) => {
          const p = TEAM[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setAssigneeFilter(k)}
              className={cn(
                'text-[12px] px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5',
                assigneeFilter === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
              )}
            >
              <span className="size-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: p.color }}>
                {p.id}
              </span>
              {p.name.split(' ')[0]}
            </button>
          );
        })}
        <span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">{filtered.length} tasks</span>
      </div>

      {/* 5-column board */}
      <div className="flex-1 min-h-0 overflow-x-auto p-4">
        <div className="grid grid-cols-5 gap-3 min-w-[1240px] h-full">
          {TASK_COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-lg border border-border bg-muted/40 flex flex-col min-h-0">
                <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                  <span className={cn('size-2 rounded-full shrink-0', col.dot)} />
                  <h3 className="text-[12.5px] font-semibold flex-1">{col.label}</h3>
                  <span className="text-[10.5px] text-muted-foreground font-mono">{items.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {items.map((t) => (
                    <TaskCard key={t.id} task={t} onOpenThread={onOpenThread} />
                  ))}
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-6">
                      column clear{projectFilter !== 'all' || assigneeFilter !== 'all' ? ' for this filter' : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProjBtn({
  label, count, active, live, onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  live?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-2 px-3 py-2 text-[12.5px] border-b border-border/50 last:border-b-0 hover:bg-accent transition-colors',
        active && 'bg-accent font-semibold'
      )}
    >
      {live && <span className="size-1.5 rounded-full bg-success shrink-0" />}
      <span className="flex-1">{label}</span>
      {typeof count === 'number' && (
        <span className={cn(
          'text-[10.5px] font-mono px-1.5 rounded',
          count > 0 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
        )}>{count}</span>
      )}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Reading-pane helpers
// ────────────────────────────────────────────────────────────────────────
function mailboxFolderLabel(mailbox: Mailbox) {
  return { requisitions: 'Requisitions', procurement: 'Procurement', contracts: 'Contracts' }[mailbox];
}

function classifyAttachments(thread: Thread, mailbox: Mailbox) {
  const atts = thread.messages.flatMap((m) => m.attachments ?? []);
  if (atts.length === 0) {
    const guess = { requisitions: 'requisition correspondence', procurement: 'vendor correspondence', contracts: 'contract correspondence' }[mailbox];
    return `no attachments · thread tagged as ${guess}`;
  }
  const rules: [RegExp, string][] = [
    [/mwbe|compliance/i, 'compliance report'],
    [/cpr|payroll/i, 'certified payroll'],
    [/waiver/i, 'lien waiver'],
    [/invoice|inv-/i, 'vendor invoice'],
    [/po-|purchase/i, 'purchase order'],
    [/delivery|receipt/i, 'delivery receipt'],
    [/w-?9/i, 'W-9'],
    [/coi|insurance/i, 'certificate of insurance'],
    [/subcontract|executed/i, 'subcontract'],
    [/cco|change order/i, 'change order'],
    [/bond/i, 'bond document'],
    [/prequal|nda/i, 'prequalification'],
    [/g70[23]/i, 'G702/G703'],
  ];
  const kinds = new Set<string>();
  for (const a of atts) for (const [re, k] of rules) if (re.test(a)) kinds.add(k);
  return kinds.size ? [...kinds].join(', ') : 'general attachment';
}

function shortenClaudeSummary(s: string) {
  const firstSentence = s.split(/(?<=[.!?])\s+/)[0];
  return firstSentence.length > 140 ? firstSentence.slice(0, 137) + '…' : firstSentence;
}

// Every task card carries the PM's full manual toolkit — nothing is
// automated by Claude anymore. Layout, top to bottom:
//   1. Task id (left)   |   Assignee dropdown (right, all 7 teammates)
//   2. Title + detail
//   3. Meta pills (project · integration · SLA · req)
//   4. Court toggle — [Ours] [Theirs]
//   5. Due line — computed from dueAt (24h from email hit) + [+1 day] push
//   6. Source line
//   7. Actions — [Done] [Add to Shop Calendar] [Email if linked]
// A scheduled task swaps the calendar button for a chip showing the PM's
// initials, and a matching CalEvent is pushed into EVENTS so the Calendar
// tab displays it with those initials.
function TaskCard({ task, onOpenThread }: { task: Task; onOpenThread?: (id: string) => void }) {
  const meta = TEAM[task.assignee];
  const isDone = task.status === 'done';
  const isOverdue = task.status === 'overdue';
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const scheduler = task.scheduledBy ? TEAM[task.scheduledBy] : null;
  const dueText = formatDueLine(task);

  return (
    <div
      role={task.linkedThread && onOpenThread ? 'button' : undefined}
      tabIndex={task.linkedThread && onOpenThread ? 0 : undefined}
      onClick={() => task.linkedThread && onOpenThread?.(task.linkedThread)}
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm transition-shadow',
        task.linkedThread && onOpenThread && 'cursor-pointer hover:shadow-md',
        isOverdue && 'border-l-4 border-l-destructive border-border',
        !isOverdue && 'border-border',
        isDone && 'opacity-70'
      )}
    >
      {/* Row 1: TID + assignee dropdown (any of the 7 teammates) */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-semibold text-muted-foreground">
          {task.id.toUpperCase()}
        </span>
        <div className="ml-auto relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAssigneeMenu((v) => !v);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background pl-0.5 pr-1 py-0.5 hover:border-primary transition-colors"
            title={`Assigned to ${meta.name}`}
          >
            <span
              className="size-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
              style={{ background: meta.color }}
            >
              {task.assignee}
            </span>
            <ChevronDown className="size-2.5 text-muted-foreground" />
          </button>
          {assigneeMenu && (
            <div
              className="absolute right-0 top-8 z-30 w-[200px] rounded-lg border border-border bg-card shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground border-b border-border/50 bg-muted/40">
                Assign to
              </div>
              {Object.values(TEAM).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    reassignTask(task.id, p.id);
                    setAssigneeMenu(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-[11.5px] border-b border-border/40 last:border-b-0 hover:bg-accent',
                    p.id === task.assignee && 'bg-accent font-semibold'
                  )}
                >
                  <span
                    className="size-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: p.color }}
                  >
                    {p.id}
                  </span>
                  <span className="flex-1 text-left leading-tight">
                    <span className="block">{p.name}</span>
                    <span className="block text-[9.5px] text-muted-foreground">{p.role}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Title + detail */}
      <p className={cn('text-[12.5px] font-semibold leading-snug mt-1.5', isDone && 'line-through')}>
        {task.title}
      </p>
      {task.detail && (
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{task.detail}</p>
      )}

      {/* Meta pills */}
      <div className="flex flex-wrap items-center gap-1 mt-2">
        {task.project && <ChipPill tone="neutral">{task.project.split('—')[0].trim()}</ChipPill>}
        {task.synced === 'textura' && <ChipPill tone="success">Textura</ChipPill>}
        {task.synced === 'procore' && <ChipPill tone="success">Procore</ChipPill>}
        {task.synced === 'siteline' && <ChipPill tone="success">Siteline</ChipPill>}
        {task.synced === 'quickbooks' && <ChipPill tone="success">QuickBooks</ChipPill>}
        {task.sla && <ChipPill tone="warning">{task.sla}</ChipPill>}
        {task.noDate && <ChipPill tone="clay">no date · red flag</ChipPill>}
        {task.linkedReq && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-primary">
            <FileText className="size-2.5" /> {task.linkedReq}
          </span>
        )}
      </div>

      {/* Court toggle — the daily "whose court is it?" call */}
      {!isDone && (
        <div className="mt-2.5 inline-flex items-stretch rounded-md border border-border overflow-hidden bg-background text-[10px] font-semibold">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCourt(task.id, 'ours');
            }}
            className={cn(
              'px-2 py-1 border-r border-border transition-colors leading-none',
              task.court === 'ours'
                ? 'bg-[#c75e40] text-white'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            Ball · Ours
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCourt(task.id, 'theirs');
            }}
            className={cn(
              'px-2 py-1 transition-colors leading-none',
              task.court === 'theirs'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            Ball · Theirs
          </button>
        </div>
      )}

      {/* Due line + inline +1 day push */}
      {!isDone && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11.5px] font-semibold',
              isOverdue ? 'text-destructive' : 'text-foreground'
            )}
          >
            <Clock className={cn('size-3', isOverdue ? 'text-destructive' : 'text-muted-foreground')} />
            {dueText}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              extendDue(task.id);
            }}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-accent"
            title="Push due date one more day"
          >
            +1 day
          </button>
        </div>
      )}
      {isDone && task.due && (
        <p className="mt-2 text-[11px] text-muted-foreground italic">{task.due}</p>
      )}

      {/* Source line */}
      {task.source && (
        <p
          className={cn(
            'mt-1.5 text-[10.5px] italic',
            task.linkedThread ? 'text-[#c75e40]' : 'text-muted-foreground'
          )}
        >
          {task.source}
          {task.linkedThread ? ' — tap card for email' : ''}
        </p>
      )}

      {/* Actions — Done · Add to Shop Calendar · Email (if linked) */}
      {!isDone && (
        <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              markTaskDone(task.id);
            }}
            className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-success/15 text-success hover:bg-success/25 inline-flex items-center gap-1"
          >
            <CheckCircle2 className="size-2.5" /> Done
          </button>
          {scheduler ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1"
              title={`On Shop Calendar for ${task.scheduledOn} · scheduled by ${scheduler.name}`}
            >
              <CalendarIcon className="size-2.5" />
              On Shop Cal · {scheduler.id}
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scheduleToCalendar(task.id, CURRENT_USER);
              }}
              className="text-[10.5px] font-semibold px-2 py-0.5 rounded border border-primary/40 text-primary hover:bg-primary/10 inline-flex items-center gap-1"
              title="Puts this on the Shop Calendar under your initials"
            >
              <CalendarPlus className="size-2.5" />
              Add to Shop Calendar
            </button>
          )}
          {task.linkedThread && onOpenThread && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenThread(task.linkedThread!);
              }}
              className="ml-auto text-[10.5px] font-semibold px-2 py-0.5 rounded border border-border text-primary hover:bg-primary/10"
            >
              Email
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// In-memory task ops — every mutation dispatches 'tasks-changed' so parents
// re-render. Cofount can wire persistence later; the shape is stable.
// ────────────────────────────────────────────────────────────────────────
function markTaskDone(id: string) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  t.status = 'done';
  t.due = 'done just now';
  window.dispatchEvent(new Event('tasks-changed'));
}

function reassignTask(id: string, to: TeamId) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  t.assignee = to;
  window.dispatchEvent(new Event('tasks-changed'));
}

function toggleCourt(id: string, court: 'ours' | 'theirs') {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  t.court = court;
  window.dispatchEvent(new Event('tasks-changed'));
}

// +1 day: unlimited pushes. Bumps dueAt by 24h, re-buckets the status,
// and refreshes the human `due` string so downstream views stay coherent.
function extendDue(id: string) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  const base = t.dueAt ? new Date(t.dueAt) : new Date('2026-07-07T17:00:00');
  base.setDate(base.getDate() + 1);
  t.dueAt = base.toISOString();
  t.noDate = false;
  t.status = bucketFromDueAt(t.dueAt);
  t.due = formatDueLine(t);
  window.dispatchEvent(new Event('tasks-changed'));
}

// Add-to-Shop-Calendar: writes a matching CalEvent so the Calendar tab
// picks it up, and records the scheduler's initials on the task so the
// card shows the "On Shop Cal · XX" chip.
function scheduleToCalendar(id: string, by: TeamId) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  const when = t.dueAt ? new Date(t.dueAt) : new Date('2026-07-07T17:00:00');
  const dateIso = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
  const time = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  t.scheduledOn = dateIso;
  t.scheduledBy = by;
  const existing = EVENTS.find((e) => e.id === `sched-${t.id}`);
  const evt: CalEvent = {
    id: `sched-${t.id}`,
    mailbox: t.mailbox === 'general' ? 'all' : t.mailbox,
    owner: by,
    date: dateIso,
    time,
    title: t.title,
    type: 'reminder',
    project: t.project,
    amount: t.linkedReq,
  };
  if (existing) Object.assign(existing, evt);
  else EVENTS.push(evt);
  window.dispatchEvent(new Event('tasks-changed'));
}

// Human due-date line: "was due Mon Jul 6 · 1d late", "due today · 4:40 PM",
// or "Wed Jul 8 · 4:40 PM". Falls back to whatever was seeded when dueAt is
// missing (only the two intentionally undated tasks).
function formatDueLine(task: Task): string {
  if (task.status === 'done') return 'done';
  if (!task.dueAt) return task.due || 'NO DATE — set one';
  const now = new Date('2026-07-07T09:00:00');
  const due = new Date(task.dueAt);
  const dateLabel = due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  if (sameDay) return `due today · ${timeLabel}`;
  const diffDays = Math.round((due.getTime() - now.getTime()) / (24 * 3600 * 1000));
  if (diffDays < 0) return `was due ${dateLabel} · ${Math.abs(diffDays)}d late`;
  return `${dateLabel} · ${timeLabel}`;
}

function bucketFromDueAt(iso: string): TaskStatus {
  const now = new Date('2026-07-07T09:00:00');
  const due = new Date(iso);
  const midnightNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const midnightDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((midnightDue.getTime() - midnightNow.getTime()) / (24 * 3600 * 1000));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return 'week';
}
