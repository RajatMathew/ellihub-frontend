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
import { CalendarDays, ChevronDown, Settings2 } from 'lucide-react';

interface CalendarPickerMenuProps {
  accountId: string;
  selection: CalendarSelectionRow[];
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
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-3"
          disabled={loading}
        >
          <CalendarDays aria-hidden="true" className="size-4" />
          Calendars
          {selection.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {visibleCount}/{selection.length}
            </span>
          )}
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
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
            return (
              <DropdownMenuCheckboxItem
                key={row.aurinkoCalendarId}
                checked={!row.hidden}
                disabled={visibilityMutation.isPending}
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
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    row.hidden && 'text-muted-foreground line-through'
                  )}
                >
                  {row.name}
                </span>
                {row.isPrimary && (
                  <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Primary
                  </span>
                )}
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
