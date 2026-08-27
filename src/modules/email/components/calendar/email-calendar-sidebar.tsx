import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import type { CalendarSelectionRow } from '@/modules/email/api';
import { useSetCalendarVisibilityMutation } from '@/modules/email/hooks';
import { Eye, EyeOff, Settings2 } from 'lucide-react';

interface EmailCalendarSidebarProps {
  accountId: string;
  selection: CalendarSelectionRow[];
  onManage: () => void;
}

// Left rail listing the calendars this user has subscribed to for the active
// mailbox. Clicking a row toggles its visibility in the unified view; the eye
// icon reflects the current state. The "Manage" button reopens the onboarding
// dialog so the user can add or drop calendars later.
export function EmailCalendarSidebar({
  accountId,
  selection,
  onManage,
}: EmailCalendarSidebarProps) {
  const visibilityMutation = useSetCalendarVisibilityMutation();

  const visibleCount = selection.reduce((total, row) => total + (row.hidden ? 0 : 1), 0);

  return (
    <aside
      aria-label="Calendars"
      className="flex w-56 shrink-0 flex-col border-r border-border bg-background"
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Calendars
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {selection.length === 0
              ? 'None selected'
              : `${visibleCount} of ${selection.length} showing`}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={onManage}
        >
          <Settings2 aria-hidden="true" className="size-3.5" />
          Manage
        </Button>
      </header>

      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {selection.length === 0 ? (
          <li className="rounded-md bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
            No calendars picked yet. Use{' '}
            <button
              type="button"
              onClick={onManage}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Manage
            </button>{' '}
            to choose which calendars to show.
          </li>
        ) : (
          selection.map((row) => (
            <CalendarRow
              key={row.aurinkoCalendarId}
              row={row}
              busy={visibilityMutation.isPending}
              onToggle={(hidden) =>
                visibilityMutation.mutate({
                  accountId,
                  calendarId: row.aurinkoCalendarId,
                  hidden,
                })
              }
            />
          ))
        )}
      </ul>
    </aside>
  );
}

function CalendarRow({
  row,
  busy,
  onToggle,
}: {
  row: CalendarSelectionRow;
  busy: boolean;
  onToggle: (hidden: boolean) => void;
}) {
  const nextHidden = !row.hidden;
  return (
    <li>
      <button
        type="button"
        aria-pressed={!row.hidden}
        aria-label={
          row.hidden ? `Show ${row.name} in the calendar` : `Hide ${row.name} from the calendar`
        }
        disabled={busy}
        onClick={() => onToggle(nextHidden)}
        className={cn(
          'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          'hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          row.hidden && 'opacity-70'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'size-3 shrink-0 rounded-full border border-border',
            row.hidden && 'bg-transparent'
          )}
          style={
            !row.hidden && row.color
              ? ({ backgroundColor: row.color } as React.CSSProperties)
              : undefined
          }
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            row.hidden ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {row.name}
        </span>
        {row.isPrimary && (
          <span className="hidden shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground group-hover:inline">
            Primary
          </span>
        )}
        {row.hidden ? (
          <EyeOff aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Eye aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
    </li>
  );
}
