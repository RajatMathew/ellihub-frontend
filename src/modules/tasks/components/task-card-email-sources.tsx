import { useEffect, useRef, useState, type FocusEvent } from 'react';

import { SearchHighlight } from '@/app/components/search-highlight';
import { cn } from '@/app/lib/utils';
import { TaskCardLinkedItems } from '@/modules/tasks/components/task-card-linked-items';
import { useEmailReferenceLink } from '@/modules/tasks/hooks/use-email-reference-link';
import { taskEmailLinkedItems } from '@/modules/tasks/lib/task-email-linked-items';
import {
  emailStackHeight,
  emailStackRowHeight,
  emailStackRowPlacement,
} from '@/modules/tasks/lib/task-email-stack';
import { referencesForSearch } from '@/modules/tasks/lib/task-search';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Long enough that a pointer crossing the card on its way elsewhere does not fan it out. */
const OPEN_DELAY_MS = 90;

/** The sheet: the row's paper, placed and sized by the stack. */
const SHEET_CLASS =
  'absolute inset-x-0 top-0 flex origin-bottom flex-col justify-center gap-1 rounded-[10px] border px-3 transition-[transform,opacity,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none';

/** The email itself, inside the sheet: the envelope, subject and sender. */
const ROW_CLASS =
  'flex min-w-0 items-center gap-2.5 rounded-md text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-ours';

/** Each sheet deeper in the pile is a deeper cream, so the pile reads at a glance. */
function rowSurface(index: number, open: boolean): string {
  if (open) {
    return 'border-task-mail-line bg-task-mail shadow-task-mail-row hover:border-task-mail-hover-line hover:bg-task-mail-hover';
  }
  if (index === 0) {
    return 'border-task-mail-line bg-task-mail shadow-task-mail group-hover/stack:border-task-mail-hover-line';
  }
  return 'border-task-mail-back-line bg-task-mail-back shadow-task-mail-back';
}

/**
 * Where a task came from: the emails it was raised from, drawn as the TaskCard
 * design draws them (elli-ui#1479).
 *
 * At rest they are a pile — the first email in front with a `+N` in its corner
 * and one sheet peeking out beneath it. Pointing at the pile, or tabbing into
 * it, fans it out into a list; each row opens the message it names, so a card
 * is a way back into the mail rather than a note about it.
 *
 * Under each email, the record its thread is linked to — "JOB 28100-25 –
 * Brooklyn Animal Care…" — so the card says which job the mail is about
 * without opening it. When any email carries one, every row grows to make room,
 * so the sheets in the pile still line up.
 *
 * The card grows downward while the list is open and settles back after, so
 * the pile's resting height is what `useEqualCardHeights` lines the board up on.
 */
export function TaskCardEmailSources({
  references: given,
  searchWords = [],
}: {
  references: TaskEmailReference[];
  /** The board's search: an email whose subject it matches is shown first. */
  searchWords?: readonly string[];
}) {
  const linkFor = useEmailReferenceLink();
  const [open, setOpen] = useState(false);
  // A linked record's "+N more" list is open. It renders in a portal, outside
  // the stack, so opening it moves focus out and the pointer may follow — the
  // stack would fold up under the list and spring back (elli-ui#1479). While it
  // is open the stack holds still; it folds once the list closes, unless the
  // pointer is still over it.
  const [held, setHeld] = useState(false);
  // Read by the handlers below. The list opens and moves focus in the same
  // turn, so the blur can arrive before a render carrying `held` has — a ref
  // is current the moment the list reports it is open.
  const heldRef = useRef(false);
  const hovered = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stackRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  // A press anywhere else folds the stack, whatever state the hover, focus and
  // popover bookkeeping above were left in. Those miss cases — a link that
  // navigates while the board stays on screen, a popover torn down without
  // reporting it closed — and the stack then stayed open until you clicked
  // back inside the card (elli-ui#1479). Captured on the document, so a control
  // that stops its own pointerdown cannot swallow it; a press inside a popover
  // (the linked records' list) is not "elsewhere".
  const expanded = open || held;
  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (stackRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
      hovered.current = false;
      heldRef.current = false;
      clearTimeout(timer.current);
      setHeld(false);
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [expanded]);

  if (given.length === 0) return null;

  // A task found by the subject of one of its emails shows that email on top,
  // marked, so the card says why it is in the results (elli-ui#1422).
  const references = referencesForSearch(given, searchWords);
  const count = references.length;
  const multi = count > 1;
  const rowHeight = emailStackRowHeight(
    references.some((reference) => taskEmailLinkedItems(reference, 1).shown.length > 0)
  );

  const show = () => {
    if (!multi) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };
  const handleMouseEnter = () => {
    hovered.current = true;
    show();
  };
  const handleMouseLeave = () => {
    hovered.current = false;
    if (!heldRef.current) hide();
  };
  // Only keyboard focus fans the pile out. A click focuses too, and so does
  // Radix handing focus back to "+N more" when its list closes — neither is
  // someone tabbing in, and reopening on them is the bounce this guards.
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.matches(':focus-visible')) show();
  };
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!heldRef.current && !event.currentTarget.contains(event.relatedTarget)) hide();
  };
  const handleHeldChange = (next: boolean) => {
    heldRef.current = next;
    setHeld(next);
    if (!next && !hovered.current) hide();
  };

  return (
    <div
      ref={stackRef}
      role="group"
      aria-label={`Raised from ${count} ${count === 1 ? 'email' : 'emails'}`}
      data-open={open}
      className="group/stack relative isolate transition-[height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
      // The height follows the pile, and the rows are placed by transform; both
      // are computed, so they are the one thing here that cannot be a class.
      style={{ height: emailStackHeight(count, open, rowHeight) }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Spans the full open height at once, while the box animates to it, so
          the pointer crossing a gap between rows never reads as leaving. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0"
        style={{ height: emailStackHeight(count, open, rowHeight) }}
      />
      {references.map((reference, index) => {
        const placement = emailStackRowPlacement(index, open, rowHeight);
        // A sheet behind the front one is paper, not a row: it is out of the
        // tab order and the accessibility tree until the pile fans out, and
        // the front row's `+N` says how many there are.
        const behind = !open && index > 0;
        const subject = reference.subject?.trim() || 'linked message';
        const sender = reference.fromEmail?.trim() ?? null;
        const href = linkFor(reference);

        const body = (
          <>
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] border border-task-mail-line bg-task-mail-icon text-task-ink-faint">
              <Mail aria-hidden="true" className="size-[13px]" strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="truncate text-[11.5px] leading-4 font-semibold text-foreground">
                <SearchHighlight text={subject} words={searchWords} />
              </span>
              {sender ? (
                <span className="truncate text-[10px] leading-3.5 text-task-ink-faint">
                  {sender}
                </span>
              ) : null}
            </span>
            {index === 0 && multi ? (
              <span
                aria-label={`${count - 1} more ${count === 2 ? 'email' : 'emails'}`}
                className={cn(
                  'inline-flex h-4 shrink-0 items-center rounded-full bg-task-card/85 px-[5px] text-[10px] leading-none font-semibold text-task-ink-soft ring-1 ring-task-mail-line ring-inset transition-opacity duration-200',
                  open && 'opacity-0'
                )}
              >
                +{count - 1}
              </span>
            ) : null}
          </>
        );

        const key = `${reference.providerId}-${index}`;

        return (
          <div
            key={key}
            aria-hidden={behind ? true : undefined}
            // Out of the tab order with everything in it, the linked record's
            // "+N more" included, until the pile fans out.
            inert={behind}
            className={cn(
              SHEET_CLASS,
              rowSurface(index, open),
              // Sheets behind the front one show their edge, not their words.
              behind && '[&>*]:opacity-0',
              !placement.visible && 'opacity-0',
              '[&>*]:transition-opacity [&>*]:duration-200'
            )}
            style={{ height: rowHeight, transform: placement.transform, zIndex: count - index }}
          >
            {href ? (
              <Link to={href} title={subject} className={ROW_CLASS}>
                {body}
              </Link>
            ) : (
              // The accounts are still loading, or this mailbox is gone. A task
              // outlives the account it was raised from, so the provenance is
              // still worth showing — just not as a link to nowhere.
              <span title={subject} className={ROW_CLASS}>
                {body}
              </span>
            )}
            {/* Beside the link rather than in it: its "+N more" is a button,
                and a button inside a link is invalid and fires both. */}
            <TaskCardLinkedItems reference={reference} onOpenChange={handleHeldChange} />
          </div>
        );
      })}
    </div>
  );
}
