import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import type { EmailAiSuggestionState } from '@/modules/email/hooks/use-email-ai-suggestion';
import { Check, ChevronDown, Sparkles, X } from 'lucide-react';

interface MailDetailsPanelProps {
  /** Project/Other switch. */
  categoryControl: ReactNode;
  /** The linked records, drawn by `MailLinkedItems`. */
  referenceList: ReactNode;
  /** The "+ Add item" link and its picker. */
  referenceTrigger: ReactNode;
  /** The tag row, rendered in place of everything else while Other is on. */
  tagsSection: ReactNode;
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
  ai: EmailAiSuggestionState;
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
 * The AI never gets a UI of its own. It writes its guess into these same
 * fields, through the same controls a person uses, and a banner explains what
 * happened and offers to accept or dismiss it. Editing anything retires the
 * banner, because the same code path serves both — there is no "suggestion
 * mode" that could fall out of step with the real values.
 */
export function MailDetailsPanel({
  categoryControl,
  referenceList,
  referenceTrigger,
  tagsSection,
  isOtherSelected,
  // `actions` is deliberately left undestructured — see the prop. Strict mode
  // fails the build on a binding nothing reads.
  assignee,
  court,
  addTask,
  tasksSection,
  ai,
  collapsed,
  onToggleCollapsed,
}: MailDetailsPanelProps) {
  // The card never waits on the AI. Everything in it — the assignee, the court,
  // what is linked — is already known the moment the thread opens, and a
  // shimmering skeleton over known data for the length of a round trip is a
  // stall the reader can see on every single mail they open. The banner slides
  // in on top if and when a suggestion arrives.
  const showBanner = ai.stage === 'pending' && Boolean(ai.suggestion);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-mail-card',
        showBanner ? 'border-[1.5px] border-mail-ai-mid' : 'border-mail-pane-line'
      )}
    >
      {showBanner && ai.suggestion && (
        <div className="flex items-center gap-[11px] bg-linear-[115deg] from-mail-ai-from via-mail-ai-mid to-mail-ai-to px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200">
          <AiGlyph />
          <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-mail-accent-foreground">
            {ai.suggestion.rationale ?? 'AI Suggestion'}
          </span>
          <div className="flex shrink-0 gap-2">
            <AiBannerAction label="Looks right" onClick={ai.resolve}>
              <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
            </AiBannerAction>
            <AiBannerAction label="Not this one" onClick={ai.resolve}>
              <X aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
            </AiBannerAction>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 bg-mail-paper px-4 py-2.5">
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

      {!collapsed && (
        <div className="px-4 pb-4 pt-2.5">
          <div className="pb-2.5">{categoryControl}</div>

          {isOtherSelected ? (
            tagsSection
          ) : (
            <>
              <DetailRow label="Assignee">{assignee}</DetailRow>
              <DetailRow label="Court">{court}</DetailRow>

              <SectionHeader title="Linked items" action={referenceTrigger} />
              {referenceList ?? (
                <p className="pb-1 text-[12.5px] text-mail-muted">No items linked yet</p>
              )}

              <SectionHeader title="Tasks" action={addTask} bordered />
              {tasksSection}

              {/* elli-ui#987 — see the `actions` prop. */}
              {/* {actions} */}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-mail-hair py-2.5 first:border-t-0">
      <span className="w-[68px] shrink-0 text-[10.5px] font-bold tracking-[0.03em] text-mail-mid">
        {label.toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
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

function AiBannerAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-mail-accent-foreground hover:bg-white/35 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 motion-safe:transition-colors motion-safe:duration-100"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AiGlyph() {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/30 bg-white/20">
      <Sparkles
        aria-hidden="true"
        className="size-3.5 fill-current text-mail-accent-foreground"
        strokeWidth={0.5}
      />
    </span>
  );
}
