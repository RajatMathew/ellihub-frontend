import type { ReactNode, Ref } from 'react';

import { cn } from '@/app/lib/utils';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface MailReadingToolbarProps {
  subject: string;
  /** True once the thread has scrolled far enough for the subject to be hidden. */
  scrolled: boolean;
  onBack?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onOpenAgent?: () => void;
  agentTriggerRef?: Ref<HTMLButtonElement>;
  /** The keyboard-shortcuts control, owned by the pane. */
  shortcuts?: ReactNode;
}

/**
 * The strip over the top of the reading pane: move between conversations, the
 * subject once it has scrolled away, and the agent.
 *
 * Overlaid on the scroll container rather than stacked above it, with a fade
 * beneath it — a bar in normal flow leaves a hard edge that the thread
 * disappears under, and the fade has to touch something that actually scrolls
 * to read as depth. The subject rises into the middle slot as it leaves the
 * top of the thread, so the reader never loses track of which conversation is
 * open (elli-ui#921).
 */
export function MailReadingToolbar({
  subject,
  scrolled,
  onBack,
  onPrevious,
  onNext,
  onOpenAgent,
  agentTriggerRef,
  shortcuts,
}: MailReadingToolbarProps) {
  // The toolbar has to out-rank the thread cards, not just the page behind it.
  // The scroll container below is `position: relative; z-index: auto`, so it is
  // *not* a stacking context, and a message card's own `z-10` layers (avatar,
  // sender row, To/Cc chips) are compared directly against this toolbar. At the
  // old `z-[6]` they won: a card scrolling past painted its avatar over the nav
  // arrows and its recipients over the subject and the fade (elli-ui#1002).
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex min-w-0 items-center gap-1.5 px-4 py-[11px] sm:px-[18px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[-1] h-16 bg-linear-to-b from-mail-pane from-55% to-transparent"
      />

      {onBack && (
        <ToolbarButton label="Back to email list" className="lg:hidden" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="size-4" />
        </ToolbarButton>
      )}
      <ToolbarButton
        label="Previous conversation"
        title="Previous (↑)"
        disabled={!onPrevious}
        onClick={onPrevious}
      >
        <ChevronLeft aria-hidden="true" className="size-[15px]" strokeWidth={1.9} />
      </ToolbarButton>
      <ToolbarButton label="Next conversation" title="Next (↓)" disabled={!onNext} onClick={onNext}>
        <ChevronRight aria-hidden="true" className="size-[15px]" strokeWidth={1.9} />
      </ToolbarButton>

      <div className="relative h-8 min-w-0 flex-1 overflow-hidden">
        <span
          className={cn(
            'absolute inset-x-0 top-0 flex h-8 min-w-0 items-center truncate text-[15px] font-semibold tracking-[-0.01em] text-mail-ink',
            'motion-safe:transition-[opacity,transform] motion-safe:duration-200',
            scrolled ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0'
          )}
          aria-hidden={!scrolled}
        >
          {subject}
        </span>
      </div>

      {shortcuts}

      {onOpenAgent && (
        <button
          ref={agentTriggerRef}
          type="button"
          className={cn(
            'relative grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-[9px]',
            'bg-linear-[135deg] from-mail-ai-mid via-mail-ai-mid to-mail-ai-from text-mail-accent-foreground',
            'shadow-[0_1px_3px_rgba(79,127,232,0.35)] hover:shadow-[0_4px_10px_rgba(79,127,232,0.4)]',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            'motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 motion-safe:hover:-translate-y-px'
          )}
          aria-label="Open or close Elliot Agent"
          title="Open or close Elliot Agent (Shift + E)"
          onClick={onOpenAgent}
        >
          <img
            src="/favicon/apple-touch-icon.png"
            alt=""
            aria-hidden="true"
            className="size-5 rounded-[5px] object-contain"
          />
        </button>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  disabled,
  className,
  onClick,
  children,
}: {
  label: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-mail-pane-line bg-mail-card text-mail-mid',
        'hover:border-mail-row-edge hover:text-mail-ink disabled:cursor-default disabled:opacity-40',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
        className
      )}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
