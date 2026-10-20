import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import type { CalendarSelectionRow } from '@/modules/email/api';
import {
  CALENDAR_EVENT_STYLES,
  colorForCalendar,
} from '@/modules/email/components/calendar/email-calendar-types';
import { useSetCalendarVisibilityMutation } from '@/modules/email/hooks';
import {
  calendarOptionLabel,
  calendarOwnerAddress,
} from '@/modules/email/lib/email-calendar-owner';
import { CalendarDays, ChevronDown, Settings2 } from 'lucide-react';

interface CalendarPickerMenuProps {
  accountId: string;
  selection: CalendarSelectionRow[];
  /**
   * The viewing mailbox's address. Shown under its own default calendar, so the
   * owner is clear next to the other mailboxes' — see `email-calendar-owner.ts`.
   */
  mailboxAddress?: string | null;
  loading?: boolean;
  onManage: () => void;
}

/**
 * Toolbar dropdown replacing the old calendar sidebar: lists the subscribed
 * calendars with show/hide checkboxes and links to the Manage dialog. Keeps
 * the whole horizontal space for the timeline.
 */
export function CalendarPickerMenu({
  accountId,
  selection,
  mailboxAddress = null,
  loading = false,
  onManage,
}: CalendarPickerMenuProps) {
  const visibilityMutation = useSetCalendarVisibilityMutation();
  const visibleCount = selection.reduce((total, row) => total + (row.hidden ? 0 : 1), 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2.5 font-normal text-foreground/80 hover:text-foreground"
          disabled={loading}
        >
          <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
          Calendars
          {selection.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {visibleCount}/{selection.length}
            </span>
          )}
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      {/* w-72 rather than w-64: the own-mailbox row carries its address on a
          second line, and a mailbox address is longer than a calendar name. */}
      <DropdownMenuContent align="end" className="w-72">
        {selection.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No calendars picked yet — use Manage below to choose which ones to show.
          </p>
        ) : (
          selection.map((row) => {
            const tone =
              CALENDAR_EVENT_STYLES[
                colorForCalendar({
                  aurinkoCalendarId: row.aurinkoCalendarId,
                  isPrimary: row.isPrimary,
                })
              ];
            const ownerAddress = calendarOwnerAddress(row, mailboxAddress);
            return (
              <DropdownMenuCheckboxItem
                key={row.aurinkoCalendarId}
                title={calendarOptionLabel(row.name, ownerAddress)}
                checked={!row.hidden}
                // Keep the menu open so several calendars can be toggled in
                // one visit.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) =>
                  visibilityMutation.mutate({
                    accountId,
                    calendarId: row.aurinkoCalendarId,
                    hidden: !checked,
                  })
                }
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    row.hidden ? 'border border-border bg-transparent' : tone.accent
                  )}
                />
                {/* The address goes on a second line here, not in brackets
                    after the name as the Manage dialog has room for — and the
                    Primary badge sits on the first line with the name rather
                    than beside the pair, so the address gets the column's whole
                    width. Beside it, "procurement@ellicorp.com" truncated to
                    "procurement@elli…" — the half every mailbox in the tenant
                    shares, which is the half that says nothing. */}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn('truncate', row.hidden && 'text-muted-foreground line-through')}
                    >
                      {row.name}
                    </span>
                    {row.isPrimary && (
                      <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Primary
                      </span>
                    )}
                  </span>
                  {ownerAddress && (
                    <span className="truncate text-[11px] font-normal text-muted-foreground">
                      {ownerAddress}
                    </span>
                  )}
                </span>
              </DropdownMenuCheckboxItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onManage}>
          <Settings2 aria-hidden="true" className="size-4" />
          Manage calendars…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
