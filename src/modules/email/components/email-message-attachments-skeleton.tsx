import { Skeleton } from '@/app/components/ui/skeleton';

/**
 * Where a message's attachment cards will be, while they are on their way.
 *
 * Shaped like `EmailAttachmentCard` — the same border, padding, badge and two
 * lines of text, and room for the actions chevron — so the cards replace it
 * without the body below moving.
 */
export function EmailMessageAttachmentsSkeleton({ count }: { count: number }) {
  return (
    <div className="px-4" role="status" aria-busy="true">
      <span className="sr-only">Loading {count === 1 ? 'attachment' : `${count} attachments`}</span>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex w-64 max-w-full items-center gap-1 rounded-lg border border-mail-line bg-mail-card py-1.5 pe-1 ps-2.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1">
              <Skeleton className="size-9 shrink-0 motion-reduce:animate-none" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-4/5 motion-reduce:animate-none" />
                <Skeleton className="h-2.5 w-12 motion-reduce:animate-none" />
              </div>
            </div>
            <span className="size-7 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
