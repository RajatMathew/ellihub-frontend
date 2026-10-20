import { useMemo, useState } from 'react';

import { cn } from '@/app/lib/utils';
import { fromDay, monthCells } from '@/modules/tasks/lib/task-due-picker';
import { format, startOfToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** A month to pick a day from, Monday first — the task picker's, on its own. */
export function MonthGrid({ value, onPick }: { value: string; onPick: (day: string) => void }) {
  const shown = value ? fromDay(value) : startOfToday();
  const [view, setView] = useState({ year: shown.getFullYear(), month: shown.getMonth() });
  const cells = useMemo(() => monthCells(view.year, view.month), [view]);
  const today = format(startOfToday(), 'yyyy-MM-dd');
  const shift = (by: number) =>
    setView(({ year, month }) => {
      const next = new Date(year, month + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  return (
    <div className="w-61">
      <div className="flex h-8 items-center justify-between pl-1.5">
        <strong className="text-[13.5px] font-semibold">
          {format(new Date(view.year, view.month, 1), 'MMMM yyyy')}
        </strong>
        <span className="flex">
          {[
            { label: 'Previous month', by: -1, Icon: ChevronLeft },
            { label: 'Next month', by: 1, Icon: ChevronRight },
          ].map(({ label, by, Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => shift(by)}
              className="cursor-pointer disabled:cursor-not-allowed grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </button>
          ))}
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
          const selected = cell === value;
          return (
            <button
              key={cell}
              type="button"
              aria-pressed={selected}
              aria-label={format(date, 'EEEE d MMMM')}
              onClick={() => onPick(cell)}
              className={cn(
                'cursor-pointer disabled:cursor-not-allowed h-8 rounded-lg text-[13px] tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'bg-primary font-medium text-primary-foreground' : 'hover:bg-accent',
                !selected && date.getMonth() !== view.month && 'text-muted-foreground/50',
                !selected && cell === today && 'font-semibold text-primary'
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
