import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { ChevronDown, Sparkles } from 'lucide-react';

interface MailDetailsPanelProps {
  /** Project/Other switch. */
  categoryControl: ReactNode;
  /** The linked records, drawn by `MailLinkedItems`. */
  referenceList: ReactNode;
  /** The "+ Add item" link and its picker. */
  referenceTrigger: ReactNode;
  /** The tag row, rendered in place of everything else while Other is on. */
  tagsSection: ReactNode;
  /** Tags for a project thread (elli-ui#1420); Other has its own row in `tagsSection`. */
  projectTagsSection?: ReactNode;
  isOtherSelected: boolean;
  /**
   * What this thread made someone do.
   *
   * Not rendered for now (elli-ui#987). `MailThreadActions` draws from a
   * fixture — elli-core logs email activity against the project, not the
   * conversation — so every real thread carried a plausible-looking history
   * that never happened. Still accepted and still passed in: turning it back
   * on once there is a real feed is destructuring it below and uncommenting
   * the one line that renders it.
   */
  actions: ReactNode;
  assignee: ReactNode;
  court: ReactNode;
  addTask: ReactNode;
  /** The tasks this thread has already raised, drawn by `MailThreadTasks`. */
  tasksSection: ReactNode;
  /** The "+ Add event" link; absent without calendar write access. */
  addEvent?: ReactNode;
  /**
   * The calendar events made from this thread, drawn by `MailThreadEvents`
   * (elli-ui#1305). Left out entirely where there is no calendar — a mailbox
   * that is not Outlook, or a reader without calendar access.
   */
  eventsSection?: ReactNode;
  /**
   * The card still shows exactly what Elliot filed from its reading of an email: it gets a blue
   * border and a "Filled by Elliot" strip across its top, both gone the moment a person changes
   * anything in it.
   */
  highlightElliot?: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * Everything about the thread that is not the thread: who owns it, whose court
 * it is in, what it is linked to, and what it made someone do.
 *
 * One card rather than a row of controls under the subject (elli-ui#921). At
 * ≥1400px the reading pane puts it beside the messages instead of above them —
 * this component does not know which, it just fills the width it is given.
 *
 * The AI never gets a UI of its own. Elliot files an unfiled thread itself
 * (elli-core `modules/elliot`), so its court and links arrive here as the
 * thread's real values, changed with the same controls a person uses — there
 * is no "suggestion mode" that could fall out of step with them.
 */
export function MailDetailsPanel({
  categoryControl,
  referenceList,
  referenceTrigger,
  tagsSection,
  projectTagsSection,
  isOtherSelected,
  // `actions` is deliberately left undestructured — see the prop. Strict mode
  // fails the build on a binding nothing reads.
  assignee,
  court,
  addTask,
  tasksSection,
  addEvent = null,
  eventsSection,
  highlightElliot = false,
  collapsed,
  onToggleCollapsed,
}: MailDetailsPanelProps) {
  const border = highlightElliot ? 'border-[1.5px] border-mail-ai-mid' : 'border-mail-pane-line';

  /**
   * Collapsed, this used to keep the whole 288px column and show a title bar in
   * it — so collapsing the panel bought a little height and none of the width
   * it was taking from the message (elli-ui#990).
   *
   * Beside the thread it now folds into a rail; stacked above it, where there
   * is no width to give back, it stays the bar it always was. The `@min-[760px]`
   * threshold is the reading pane's own, set on the `@container` in
   * `email-reading-pane.tsx` — the same query that decides one column or two,
   * so the two cannot disagree about which layout is on screen.
   */
  if (collapsed) {
    return (
      <>
        <div className="@min-[760px]:hidden">
          <DetailsHeader collapsed onToggleCollapsed={onToggleCollapsed} border={border} />
        </div>
        <button
          type="button"
          className={cn(
            'hidden w-10 cursor-pointer flex-col items-center gap-2 rounded-xl border py-3',
            'text-mail-mid hover:bg-mail-chip hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            'motion-safe:transition-colors motion-safe:duration-100 @min-[760px]:flex',
            border,
            'bg-mail-card'
          )}
          aria-expanded={false}
          aria-label="Expand additional details"
          title="Additional Details"
          onClick={onToggleCollapsed}
        >
          <ChevronDown aria-hidden="true" className="size-[15px] rotate-90" strokeWidth={2} />
          <span className="text-[11px] font-semibold tracking-[0.02em] [writing-mode:vertical-rl]">
            Additional Details
          </span>
        </button>
      </>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-mail-card', border)}>
      {highlightElliot && (
        // `pb-5` rather than `py-2`: the card below is pulled back up over the
        // bottom 12px of it, so the strip has to be that much taller for its
        // own text to keep its padding. See the junction note below.
        <div
          className="flex items-center gap-2 bg-linear-[115deg] from-mail-ai-from via-mail-ai-mid to-mail-ai-to px-4 pb-5 pt-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
          title="Court and links filled in by Elliot. Change anything that's off."
        >
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-white/30 bg-white/20">
            <Sparkles
              aria-hidden="true"
              className="size-3 fill-current text-mail-accent-foreground"
              strokeWidth={0.5}
            />
          </span>
          <span className="text-[12px] font-semibold text-mail-accent-foreground">
            Filled by Elliot
          </span>
        </div>
      )}

      {/*
        The junction with the Elliot strip is a curve, not a seam (elli-ui#1037):
        the strip runs 12px further down than it looks, and the rest of the card
        is lifted back over it with its own rounded top, so the blue follows the
        corner round. Only while the strip is up — with nothing above it, the
        card's own `rounded-xl` is the top corner and a second one would cut a
        notch out of the border.
      */}
      <div
        className={cn(
          'relative bg-mail-card',
          highlightElliot && '-mt-3 overflow-hidden rounded-t-xl'
        )}
      >
        <DetailsHeader collapsed={false} onToggleCollapsed={onToggleCollapsed} />

        <div className="px-4 pb-4 pt-2.5">
          <div className="pb-2.5">{categoryControl}</div>

          {isOtherSelected ? (
            tagsSection
          ) : (
            <>
              <DetailRow label="Assignee">{assignee}</DetailRow>
              <DetailRow label="Court">{court}</DetailRow>

              <SectionHeader title="Linked items" action={referenceTrigger} bordered />
              {referenceList ?? (
                <p className="pb-1 text-[12.5px] text-mail-muted">No items linked yet</p>
              )}

              {projectTagsSection}

              <SectionHeader title="Tasks" action={addTask} bordered />
              {tasksSection}

              {eventsSection !== undefined && (
                <>
                  <SectionHeader title="Calendar events" action={addEvent} bordered />
                  {eventsSection}
                </>
              )}

              {/* elli-ui#987 — see the `actions` prop. */}
              {/* {actions} */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The card's title bar. Shared by the open card and by the collapsed bar the
 * stacked layout keeps, so the two cannot drift apart.
 */
function DetailsHeader({
  collapsed,
  onToggleCollapsed,
  border = 'border-mail-pane-line',
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** The collapsed bar's border, so it carries Elliot's highlight as the open card does. */
  border?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 bg-mail-paper px-4 py-2.5',
        collapsed && 'rounded-xl border',
        collapsed && border
      )}
    >
      <span className="text-[13px] font-semibold text-mail-ink">Additional Details</span>
      <button
        type="button"
        className="flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md text-mail-muted hover:bg-mail-chip hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand additional details' : 'Collapse additional details'}
        title={collapsed ? 'Expand' : 'Collapse'}
        onClick={onToggleCollapsed}
      >
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-[15px] motion-safe:transition-transform motion-safe:duration-150',
            collapsed && '-rotate-180'
          )}
          strokeWidth={2}
        />
      </button>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <span className="w-[68px] shrink-0 text-[13px] font-medium text-mail-ink">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  );
}

function SectionHeader({
  title,
  action,
  bordered = false,
}: {
  title: string;
  action: ReactNode;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2.5 pb-2.5',
        bordered ? 'mt-1.5 border-t border-mail-hair pt-4' : 'pt-3.5'
      )}
    >
      <span className="text-[13px] font-semibold text-mail-ink">{title}</span>
      {action}
    </div>
  );
}
