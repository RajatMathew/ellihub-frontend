import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const today = startOfMonth(new Date());
const MONTHS = Array.from({ length: 12 }, (_, index) => index);
const YEARS = Array.from(
  { length: today.getFullYear() - 1969 },
  (_, index) => today.getFullYear() - index
);

const monthShortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
const monthLongFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function setMonth(date: Date, month: number) {
  return new Date(date.getFullYear(), month, 1);
}

function setYear(date: Date, year: number) {
  return new Date(year, date.getMonth(), 1);
}

function isAfterMonth(left: Date, right: Date) {
  return (
    left.getFullYear() > right.getFullYear() ||
    (left.getFullYear() === right.getFullYear() && left.getMonth() > right.getMonth())
  );
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function formatMonth(date: Date, variant: 'short' | 'long') {
  return (variant === 'short' ? monthShortFormatter : monthLongFormatter).format(date);
}

interface MonthYearPickerProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function MonthYearPicker({ date, onChange }: MonthYearPickerProps) {
  const selectedDate = startOfMonth(date);
  const availableMonths =
    selectedDate.getFullYear() === today.getFullYear()
      ? MONTHS.filter((month) => month <= today.getMonth())
      : MONTHS;
  const isAtCurrent = isSameMonth(selectedDate, today);

  const update = (next: Date) => {
    onChange(isAfterMonth(next, today) ? today : startOfMonth(next));
  };

  const go = (direction: 1 | -1) => {
    const nextMonth = selectedDate.getMonth() + direction;
    if (nextMonth < 0) {
      update(new Date(selectedDate.getFullYear() - 1, 11, 1));
      return;
    }
    if (nextMonth > 11) {
      update(new Date(selectedDate.getFullYear() + 1, 0, 1));
      return;
    }
    update(setMonth(selectedDate, nextMonth));
  };

  return (
    <div className="flex w-fit items-center gap-0.5 rounded-md border border-border bg-background px-1 py-1 shadow-sm">
      <button
        type="button"
        onClick={() => go(-1)}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={2.5} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {formatMonth(selectedDate, 'short')}
            <ChevronDown
              className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={2.5}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-48 overflow-y-auto">
          {availableMonths.map((month) => (
            <DropdownMenuItem
              key={month}
              onClick={() => update(setMonth(selectedDate, month))}
              className={cn(month === selectedDate.getMonth() && 'bg-muted font-semibold')}
            >
              {formatMonth(setMonth(today, month), 'long')}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {selectedDate.getFullYear()}
            <ChevronDown
              className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={2.5}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-48 overflow-y-auto">
          {YEARS.map((year) => (
            <DropdownMenuItem
              key={year}
              onClick={() => update(setYear(selectedDate, year))}
              className={cn(year === selectedDate.getFullYear() && 'bg-muted font-semibold')}
            >
              {year}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => go(1)}
        disabled={isAtCurrent}
        className={cn(
          'flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          isAtCurrent && 'cursor-not-allowed text-muted-foreground/40 hover:bg-transparent'
        )}
      >
        <ChevronRight className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
