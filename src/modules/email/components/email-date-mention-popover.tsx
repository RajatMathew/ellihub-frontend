import { useMemo } from 'react';

import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent } from '@/app/components/ui/popover';
import { DateTile } from '@/modules/email/components/mail-thread-events';
import type { ActiveDateMention } from '@/modules/email/hooks/use-date-mention-popover';
import { dateMentionSummary } from '@/modules/email/lib/email-date-mentions';
import { CalendarPlus } from 'lucide-react';
import { Popover as PopoverPrimitive } from 'radix-ui';

/**
 * The card above a date written in an email (elli-ui#686): the day as a date
 * tile, when it falls, and "Create event" — the step before the full event
 * dialog, so a stray hover never throws a form at the reader.
 *
 * The date sits inside the message's shadow root, outside React, so the
 * popover is anchored to it by its on-screen box rather than as a trigger.
 */
export function EmailDateMentionPopover({
  mention,
  onClose,
  onPointerEnter,
  onPointerLeave,
  onCreate,
}: {
  mention: ActiveDateMention | null;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onCreate: (mention: ActiveDateMention) => void;
}) {
  const anchor = useMemo(
    () => ({ current: { getBoundingClientRect: () => mention!.element.getBoundingClientRect() } }),
    [mention]
  );
  if (!mention) return null;
  const summary = dateMentionSummary(mention);

  return (
    <Popover open onOpenChange={(open) => !open && onClose()}>
      <PopoverPrimitive.Anchor virtualRef={anchor} />
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-64 p-3"
        // Opened by hover: the reader is still reading the email, so focus stays there.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <div className="flex items-center gap-3">
          <DateTile month={summary.month} day={summary.day} past={summary.past} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{summary.heading}</p>
            <p className="truncate text-xs text-muted-foreground">
              {summary.detail}
              {summary.past && ' · Past'}
            </p>
          </div>
        </div>
        <Button type="button" size="sm" className="mt-3 w-full" onClick={() => onCreate(mention)}>
          <CalendarPlus aria-hidden="true" />
          Create event
        </Button>
      </PopoverContent>
    </Popover>
  );
}
