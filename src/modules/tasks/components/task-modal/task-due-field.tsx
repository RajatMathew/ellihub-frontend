import { useMemo, useState, type ReactNode } from 'react';

import { FieldButton, FieldPopover } from '@/app/components/record-modal';
import { cn } from '@/app/lib/utils';
import {
  dueRelative,
  dueTimes,
  fromDay,
  monthCells,
  quickDueDates,
  timeLabel,
  zoneName,
} from '@/modules/tasks/lib/task-due-picker';
import { format, startOfToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const RELATIVE_TONE = {
  late: 'bg-destructive-soft text-destructive-soft-foreground',
  soon: 'bg-warning-soft text-warning-soft-foreground',
  later: 'bg-accent text-muted-foreground',
} as const;

/** The task modal's "Due date": the date, its time, and how far off it is. */
export function TaskDueField({
  day,
  time,
  onChange,
}: {
  /** `yyyy-MM-dd`. */
  day: string;
  /** `HH:mm`. */
  time: string;
  onChange: (next: { day: string; time: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = startOfToday();
  const relative = day ? dueRelative(day, today) : null;
  return (
    <FieldPopover
      open={open}
      onOpenChange={setOpen}
      label="Choose due date"
      className="w-[min(27rem,calc(100vw-2rem))] p-2.5"
      trigger={
        <FieldButton aria-haspopup="dialog">
          {day ? (
            <>
              <span>{format(fromDay(day), 'EEE, d MMM')}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="tabular-nums text-muted-foreground">{timeLabel(time)}</span>
              {relative ? (
                <span
                  className={cn(
                    'rounded-sm px-1.5 text-xs leading-5',
                    RELATIVE_TONE[relative.tone]
                  )}
                >
                  {relative.text}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground/70">Set due date</span>
          )}
        </FieldButton>
      }
    >
      <DuePicker day={day} time={time} today={today} onChange={onChange} />
    </FieldPopover>
  );
}

function DuePicker({
  day,
  time,
  today,
  onChange,
}: {
  day: string;
  time: string;
  today: Date;
  onChange: (next: { day: string; time: string }) => void;
}) {
  const shown = day ? fromDay(day) : today;
  const [view, setView] = useState({ year: shown.getFullYear(), month: shown.getMonth() });
  const cells = useMemo(() => monthCells(view.year, view.month), [view]);
  const todayKey = format(today, 'yyyy-MM-dd');
  const shift = (by: number) =>
    setView(({ year, month }) => {
      const next = new Date(year, month + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  const pick = (next: string) => {
    onChange({ day: next, time });
    const date = fromDay(next);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  };
  return (
    <>
      <div className="mb-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {quickDueDates(today).map((quick) => (
          <button
            key={quick.label}
            type="button"
            onClick={() => pick(quick.day)}
            className="cursor-pointer disabled:cursor-not-allowed flex h-7.5 min-w-0 items-center justify-between gap-1.5 whitespace-nowrap rounded-lg border border-border/60 px-2 text-[12.5px] transition-colors hover:border-border hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {quick.label}
            <span className="text-[11.5px] text-muted-foreground/80">{quick.hint}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <div className="w-61">
          <div className="flex h-8 items-center justify-between pl-1.5">
            <strong className="text-[13.5px] font-semibold">
              {format(new Date(view.year, view.month, 1), 'MMMM yyyy')}
            </strong>
            <span className="flex">
              <MonthButton label="Previous month" onClick={() => shift(-1)}>
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              </MonthButton>
              <MonthButton label="Next month" onClick={() => shift(1)}>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </MonthButton>
            </span>
          </div>
          <div className="mt-1 grid grid-cols-7 gap-px">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((weekday) => (
              <span
                key={weekday}
                className="text-center text-[11px] font-medium leading-6 text-muted-foreground/70"
              >
                {weekday}
              </span>
            ))}
            {cells.map((cell) => {
              const date = fromDay(cell);
              const selected = cell === day;
              return (
                <button
                  key={cell}
                  type="button"
                  aria-pressed={selected}
                  aria-label={format(date, 'EEEE d MMMM')}
                  onClick={() => pick(cell)}
                  className={cn(
                    'cursor-pointer disabled:cursor-not-allowed relative h-8 rounded-lg text-[13px] tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'bg-primary font-medium text-primary-foreground' : 'hover:bg-accent',
                    !selected && date.getMonth() !== view.month && 'text-muted-foreground/50',
                    !selected && cell === todayKey && 'font-semibold text-primary'
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
        <div className="hidden w-px bg-border/50 sm:block" />
        <div className="min-w-24 flex-1">
          <div className="flex h-8 items-center gap-1.5 px-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" /> Time
          </div>
          <div className="mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto pr-0.5">
            {dueTimes(time).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === time}
                onClick={() => onChange({ day: day || todayKey, time: option })}
                ref={(element) => {
                  if (element && option === time) element.scrollIntoView({ block: 'center' });
                }}
                className={cn(
                  'cursor-pointer disabled:cursor-not-allowed h-7.5 shrink-0 rounded-md px-2.5 text-left text-[12.5px] tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                  option === time
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-accent'
                )}
              >
                {timeLabel(option)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="-mx-2.5 -mb-2.5 mt-2.5 border-t border-border/50 px-2.5 py-2 text-right text-[11.5px] text-muted-foreground/80">
        {zoneName()}
      </p>
    </>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer disabled:cursor-not-allowed grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}
