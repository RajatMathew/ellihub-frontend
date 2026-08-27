import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type { CalendarSummary } from '@/modules/email/api';
import {
  useCalendarListQuery,
  useSaveCalendarSelectionMutation,
} from '@/modules/email/hooks';
import { CalendarRange } from 'lucide-react';

interface EmailCalendarOnboardingDialogProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// First-time picker for a connected Outlook mailbox. The user checks the
// calendars they want to follow — primary is pre-checked. Saving persists a
// CalendarSelection row per pick; presence of any row is what tells the app
// onboarding is done, so no separate flag is needed. The dialog body is a
// separate component so local pick state naturally resets each time the dialog
// re-opens (mount/unmount) — no effect required.
export function EmailCalendarOnboardingDialog({
  accountId,
  open,
  onOpenChange,
}: EmailCalendarOnboardingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        {open ? (
          <OnboardingDialogBody
            key={accountId}
            accountId={accountId}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OnboardingDialogBody({
  accountId,
  onClose,
}: {
  accountId: string;
  onClose: () => void;
}) {
  const calendarsQuery = useCalendarListQuery(accountId, true);
  const saveMutation = useSaveCalendarSelectionMutation();

  // Track user overrides as a Map<id, boolean>. Effective picked state is
  // `overrides.get(id) ?? (cal.selected || cal.isPrimary)` so background
  // refetches never wipe a checkbox the user just flipped.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map());

  const calendars = useMemo(() => calendarsQuery.data ?? [], [calendarsQuery.data]);
  const isChecked = useCallback(
    (cal: CalendarSummary): boolean =>
      overrides.has(cal.id)
        ? Boolean(overrides.get(cal.id))
        : cal.selected || Boolean(cal.isPrimary),
    [overrides]
  );

  const checkedCount = useMemo(
    () => calendars.reduce((total, cal) => total + (isChecked(cal) ? 1 : 0), 0),
    [calendars, isChecked]
  );

  const hasCalendars = calendars.length > 0;

  const toggle = useCallback(
    (cal: CalendarSummary) => {
      setOverrides((current) => {
        const next = new Map(current);
        const active = current.has(cal.id)
          ? Boolean(current.get(cal.id))
          : cal.selected || Boolean(cal.isPrimary);
        next.set(cal.id, !active);
        return next;
      });
    },
    []
  );

  const handleSave = () => {
    const picks = calendars
      .filter((cal) => isChecked(cal))
      .map((cal) => ({
        aurinkoCalendarId: cal.id,
        name: cal.name,
        color: cal.color ?? null,
        isPrimary: cal.isPrimary ?? false,
      }));

    saveMutation.mutate(
      { accountId, calendars: picks },
      { onSuccess: () => onClose() }
    );
  };

  const summary = calendarsQuery.isLoading
    ? null
    : hasCalendars
      ? `${checkedCount} of ${calendars.length} selected`
      : null;

  return (
    <>
      <DialogHeader className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
            <CalendarRange className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base">Pick your calendars</DialogTitle>
            <DialogDescription className="text-xs">
              Choose which calendars from this mailbox show up in the unified view. You can change
              this any time from the calendar sidebar.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogBody className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {calendarsQuery.isLoading ? (
          <OnboardingSkeleton />
        ) : calendarsQuery.isError ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            We couldn't load your calendars. Try closing this dialog and reopening it.
          </p>
        ) : !hasCalendars ? (
          <p className="rounded-md bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            This mailbox doesn't expose any calendars.
          </p>
        ) : (
          <ul className="grid gap-1">
            {calendars.map((cal) => (
              <CalendarPickRow
                key={cal.id}
                calendar={cal}
                checked={isChecked(cal)}
                onToggle={() => toggle(cal)}
              />
            ))}
          </ul>
        )}
      </DialogBody>

      <DialogFooter className="flex items-center gap-2 border-t border-border px-5 py-3">
        <p className="mr-auto text-xs text-muted-foreground" aria-live="polite">
          {summary}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saveMutation.isPending}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={
            !hasCalendars ||
            checkedCount === 0 ||
            calendarsQuery.isLoading ||
            saveMutation.isPending
          }
          onClick={handleSave}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save selection'}
        </Button>
      </DialogFooter>
    </>
  );
}

function CalendarPickRow({
  calendar,
  checked,
  onToggle,
}: {
  calendar: CalendarSummary;
  checked: boolean;
  onToggle: () => void;
}) {
  const id = `calendar-onboard-${calendar.id}`;
  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2.5 py-2 transition-colors',
          'hover:bg-accent',
          checked && 'border-primary/20 bg-primary/[0.04]'
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onToggle}
          aria-describedby={calendar.description ? `${id}-desc` : undefined}
        />
        <span
          aria-hidden="true"
          className="size-3 rounded-full border border-border"
          style={
            calendar.color
              ? ({ backgroundColor: calendar.color } as React.CSSProperties)
              : undefined
          }
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="truncate">{calendar.name}</span>
            {calendar.isPrimary && (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Primary
              </span>
            )}
            {calendar.readOnly && (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Read-only
              </span>
            )}
          </span>
          {calendar.description && (
            <span
              id={`${id}-desc`}
              className="mt-0.5 block truncate text-xs text-muted-foreground"
            >
              {calendar.description}
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-md border border-border px-2.5 py-2"
        >
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="size-3 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
