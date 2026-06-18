import { useMemo } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import {
  createMonthlyBillDate,
  formatMonthlyBillMonthName,
  getCurrentMonthlyBillPeriod,
  getMonthlyBillPeriod,
  type MonthlyBillPeriod,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function isAfterMonth(left: MonthlyBillPeriod, right: MonthlyBillPeriod) {
  return (
    left.year > right.year || (left.year === right.year && left.month > right.month)
  );
}

function isSameMonth(left: MonthlyBillPeriod, right: MonthlyBillPeriod) {
  return left.year === right.year && left.month === right.month;
}

interface MonthYearPickerProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function MonthYearPicker({ date, onChange }: MonthYearPickerProps) {
  const today = useMemo(() => getCurrentMonthlyBillPeriod(), []);

  const years = useMemo(() => {
    return Array.from({ length: today.year - 1969 }, (_, index) => today.year - index);
  }, [today]);

  const selectedPeriod = getMonthlyBillPeriod(date);
  const availableMonths =
    selectedPeriod.year === today.year
      ? MONTHS.filter((month) => month <= today.month)
      : MONTHS;
  const isAtCurrent = isSameMonth(selectedPeriod, today);

  const update = (next: MonthlyBillPeriod) => {
    const period = isAfterMonth(next, today) ? today : next;
    onChange(createMonthlyBillDate(period.year, period.month));
  };

  const go = (direction: 1 | -1) => {
    const nextMonth = selectedPeriod.month + direction;
    if (nextMonth < 1) {
      update({ year: selectedPeriod.year - 1, month: 12 });
      return;
    }
    if (nextMonth > 12) {
      update({ year: selectedPeriod.year + 1, month: 1 });
      return;
    }
    update({ year: selectedPeriod.year, month: nextMonth });
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
            {formatMonthlyBillMonthName(date, 'short')}
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
              onClick={() => update({ year: selectedPeriod.year, month })}
              className={cn(month === selectedPeriod.month && 'bg-muted font-semibold')}
            >
              {formatMonthlyBillMonthName(createMonthlyBillDate(selectedPeriod.year, month))}
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
            {selectedPeriod.year}
            <ChevronDown
              className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={2.5}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-48 overflow-y-auto">
          {years.map((year) => (
            <DropdownMenuItem
              key={year}
              onClick={() => update({ year, month: selectedPeriod.month })}
              className={cn(year === selectedPeriod.year && 'bg-muted font-semibold')}
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
