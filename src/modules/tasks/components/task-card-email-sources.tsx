import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { useEmailReferenceLink } from '@/modules/tasks/hooks/use-email-reference-link';
import { useScrollEdges } from '@/modules/tasks/hooks/use-scroll-edges';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Where a task came from: an envelope in the card header that opens the emails
 * it was raised from.
 *
 * Each source opens the message it names, so a card is a way back into the mail
 * rather than a note about it — that round trip is most of why a task records
 * its provenance at all. A source is one link carrying both its subject and its
 * sender, as the design draws it, so either line is the way back.
 *
 * A task can cite any number of threads, but the popover shows two before it
 * scrolls: the list is capped at that height and its bottom edge fades until it
 * is reached, which is what says there is more without making the popover
 * taller for every extra thread.
 *
 * This used to be a list at the foot of the card, kept there because a Radix
 * trigger inside the dnd-kit drag handle could not be opened under Playwright.
 * The assignee menu beside it proves that no longer holds — the trigger keeps
 * pointerdown to itself, the same way.
 */

const ROW_CLASS =
  'flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-start focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring';

function SourceRow({ reference, href }: { reference: TaskEmailReference; href: string | null }) {
  const subject = reference.subject?.trim() || 'linked message';
  const sender = reference.fromEmail?.trim() ?? null;

  const body = (
    <>
      <span className="truncate text-sm font-semibold text-foreground">{subject}</span>
      {sender ? <span className="truncate text-xs text-muted-foreground">{sender}</span> : null}
    </>
  );

  if (!href) {
    // The accounts are still loading, or this mailbox is gone. A task outlives
    // the account it was raised from, so the provenance is still worth showing —
    // just not as a link to nowhere.
    return <span className={ROW_CLASS}>{body}</span>;
  }

  return (
    <Link
      to={href}
      title={subject}
      className={cn(ROW_CLASS, 'transition-colors hover:bg-surface-hover')}
    >
      {body}
    </Link>
  );
}

/**
 * Its own component so the edge tracking mounts with the popover: the list only
 * exists while the popover is open, and a hook run from the card would have
 * measured a ref that was still empty.
 */
function SourceList({ references, label }: { references: TaskEmailReference[]; label: string }) {
  const { ref: listRef, scrollEdgeProps } = useScrollEdges<HTMLUListElement>();
  const linkFor = useEmailReferenceLink();

  return (
    // Two rows tall, then it scrolls: the cap is what keeps five threads from
    // being five rows, and the fade is what says they are there.
    <ul
      ref={listRef}
      {...scrollEdgeProps}
      aria-label={label}
      className="scroll-fade max-h-[6.75rem] overflow-y-auto"
    >
      {references.map((reference, index) => (
        <li key={`${reference.providerId}-${index}`} className="flex flex-col">
          <SourceRow reference={reference} href={linkFor(reference)} />
        </li>
      ))}
    </ul>
  );
}

export function TaskCardEmailSources({ references }: { references: TaskEmailReference[] }) {
  if (references.length === 0) return null;

  const count = references.length;
  const label = `Raised from ${count} ${count === 1 ? 'email' : 'emails'}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          // See TaskAssigneeMenu: the whole card is a drag handle, so the
          // trigger keeps pointerdown to itself or the click never lands.
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={label}
          title={label}
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          <Mail aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-1.5">
        <SourceList references={references} label={label} />
      </PopoverContent>
    </Popover>
  );
}
