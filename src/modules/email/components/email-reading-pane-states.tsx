import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { RefreshCcw } from 'lucide-react';

export function EmailReadingPaneSkeleton() {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-mail-pane"
      aria-label="Loading email"
    >
      <div className="shrink-0 px-5 py-3 sm:px-[18px]">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      </div>
      <div className="min-h-0 flex-1 px-5 sm:px-[30px]">
        <div className="mx-auto w-full max-w-[1140px] space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-16 w-full rounded-xl" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-mail-pane-line bg-mail-card"
            >
              <div className="flex gap-3 px-4 py-3.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <div className="space-y-3 border-t border-mail-pane-line px-5 py-4">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-8/12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EmailReadingPaneEmptyState({ mailboxAddress }: { mailboxAddress: string }) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-mail-pane px-10 py-10"
      aria-label="No email selected"
    >
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <EmptyMailGlyph />
        <h1 className="mt-1.5 font-serif text-xl font-normal text-mail-ink">
          Select an item to read
        </h1>
        <p className="max-w-[34ch] text-[13px] leading-6 text-mail-muted">
          Choose a message from {mailboxAddress} to read the full thread here.
        </p>
      </div>
    </section>
  );
}

export function EmailReadingPaneErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-mail-pane px-10 py-10"
      aria-label="Email loading error"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <RefreshCcw className="mb-5 size-9 text-mail-muted" strokeWidth={1.8} />
        <h1 className="font-serif text-xl font-normal text-mail-ink">Could not load this thread</h1>
        <p className="mt-2 max-w-[34ch] text-[13px] leading-6 text-mail-muted">
          The mailbox did not respond. Try again in a moment.
        </p>
        <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </section>
  );
}

/**
 * An open envelope with a letter standing out of it, drawn rather than taken
 * from the icon set: at this size a stroke icon reads as a control that failed
 * to load, and the empty pane is the first thing a new mailbox shows.
 */
function EmptyMailGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="118"
      height="92"
      viewBox="0 0 118 92"
      fill="none"
      className="mb-1.5"
    >
      <rect
        x="4"
        y="30"
        width="110"
        height="58"
        rx="9"
        className="fill-mail-card stroke-mail-pane-line"
        strokeWidth="2"
      />
      <path
        d="M5 35 L59 66 L113 35"
        className="stroke-mail-pane-line"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect
        x="33"
        y="4"
        width="52"
        height="44"
        rx="6"
        className="fill-mail-pane stroke-mail-pane-line"
        strokeWidth="2"
      />
      <path
        d="M43 16h32M43 25h32M43 34h18"
        className="stroke-mail-muted"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
