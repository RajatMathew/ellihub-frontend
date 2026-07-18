import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { MailOpen, RefreshCcw } from 'lucide-react';

export function EmailReadingPaneSkeleton() {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/20" aria-label="Loading email">
      <div className="shrink-0 border-b border-border bg-background px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="hidden shrink-0 gap-2 md:flex">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-5 py-5">
        <div className="mx-auto max-w-4xl space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md border border-border bg-background">
              <div className="flex gap-3 border-b border-border px-4 py-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <div className="space-y-3 px-4 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-8/12" />
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
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-muted/20 px-6 py-10"
      aria-label="No email selected"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <MailOpen className="mb-6 size-9 text-muted-foreground" strokeWidth={1.8} />
        <h1 className="text-lg font-semibold text-foreground">Select an email</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a message from {mailboxAddress} to read the full thread here.
        </p>
      </div>
    </section>
  );
}

export function EmailReadingPaneErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-muted/20 px-6 py-10"
      aria-label="Email loading error"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <RefreshCcw className="mb-6 size-9 text-muted-foreground" strokeWidth={1.8} />
        <h1 className="text-lg font-semibold text-foreground">Could not load this thread</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The mailbox did not respond. Try again in a moment.
        </p>
        <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </section>
  );
}
