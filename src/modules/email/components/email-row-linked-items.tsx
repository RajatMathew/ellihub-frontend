import { useEffect, useRef, useState, type PointerEvent } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import {
  linkedItemViews,
  type LinkedItemSource,
  type LinkedItemView,
} from '@/modules/email/lib/linked-item-views';
import { Popover as PopoverPrimitive } from 'radix-ui';

function LinkedItemLine({ item }: { item: LinkedItemView }) {
  return (
    // On one baseline, not centred: the type label is smaller than the code
    // beside it. The dot has no text, so it centres on the line instead.
    <span className="flex min-w-0 items-baseline gap-1.5 text-xs">
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 self-center rounded-full', item.dot)}
      />
      <span className="shrink-0 text-[11px] font-bold tracking-wide text-mail-muted">
        {item.typeLabel}
      </span>
      <span className="min-w-0 truncate text-mail-mid">
        <span className="font-semibold text-mail-ink">{item.code}</span>
        {item.name ? <> – {item.name}</> : null}
      </span>
    </span>
  );
}

/** How long the list waits before closing once the pointer leaves, so it can cross the gap. */
const HOVER_CLOSE_DELAY_MS = 120;

/**
 * The records a thread is linked to, on its inbox row: the first one as the
 * task card draws it — dot, kind, code, name — with "+N more" right after it.
 *
 * The full list opens on hover with a mouse and on a press anywhere, because a
 * phone has no hover. The press makes "+N more" a real button, and a button
 * cannot sit inside the row's own — so `EmailRowCard` draws this on a strip
 * beside the row's button, the way it draws the attachment tiles.
 */
export function EmailRowLinkedItems({ references }: { references: readonly LinkedItemSource[] }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  useEffect(() => () => cancelClose(), []);

  function cancelClose() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }
  // Mouse only: a touch fires pointerenter too, and opening on it would race
  // the press that follows and close the list again.
  const hoverOpen = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    cancelClose();
    setOpen(true);
  };
  const hoverClose = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  };

  const { shown, hidden } = linkedItemViews(references, 1);
  const [first] = shown;
  if (!first) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* The list hangs off the whole line, not the "+N more" button, so a
          row with one record — no button — still opens it on hover: the slot
          cuts a long name short, and this is where it is read in full. */}
      <PopoverPrimitive.Anchor asChild>
        {/* A fixed slot for the job, so "+N more" lands in the same place on
            every row — a column down the list rather than wherever each name
            happens to end — without being pushed out to the row's far edge. */}
        <div
          className="flex w-full min-w-0 max-w-64 items-center gap-2"
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
        >
          <div className="min-w-0 flex-1">
            <LinkedItemLine item={first} />
          </div>

          {hidden > 0 ? (
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Show all ${hidden + 1} linked records`}
                className="shrink-0 cursor-pointer rounded-sm text-[11.5px] font-semibold text-mail-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                +{hidden} more
              </button>
            </PopoverTrigger>
          ) : null}
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverContent
        align="start"
        collisionPadding={12}
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
        // Opened by hover, the list must not pull focus off the row.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-auto max-w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2 p-3"
      >
        {linkedItemViews(references, Infinity).shown.map((item) => (
          <LinkedItemLine key={item.key} item={item} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
