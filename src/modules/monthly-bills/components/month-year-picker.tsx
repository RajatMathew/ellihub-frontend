import { useMemo } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import {
  createMonthlyBillDate,
  formatMonthlyBillMonthName,
  getCurrentMonthlyBillPeriod,
  getMonthlyBillPeriod,
  type MonthlyBillPeriod,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TextMorph } from 'torph/react';

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

  const nextButton = (
    <button
      type="button"
      onClick={() => go(1)}
      disabled={isAtCurrent}
      className={cn(
        'flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground/80 transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-foreground',
        isAtCurrent &&
          'cursor-not-allowed text-muted-foreground/35 hover:bg-transparent hover:text-muted-foreground/35'
      )}
    >
      <ChevronRight className="size-4" strokeWidth={2.25} />
    </button>
  );

  return (
    <div className="flex w-fit items-center gap-0.5 rounded-xl border border-input bg-transparent p-1 shadow-sm shadow-black/5 transition-shadow duration-150 ease-out hover:shadow-md hover:shadow-black/5">
      <button
        type="button"
        onClick={() => go(-1)}
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground/80 transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={2.25} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group relative flex h-7 w-[3.375rem] cursor-pointer items-center justify-center overflow-hidden rounded-md text-sm font-semibold text-foreground transition-colors duration-150 ease-out hover:bg-surface-hover"
          >
            <span className="transition-transform duration-150 ease-out group-hover:-translate-x-1">
              <TextMorph>{formatMonthlyBillMonthName(date, 'short')}</TextMorph>
            </span>
            <ChevronDown
              className="pointer-events-none absolute right-1.5 size-3 translate-x-1 text-muted-foreground/70 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              strokeWidth={2.25}
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
            className="group relative flex h-7 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-md text-sm font-semibold text-foreground transition-colors duration-150 ease-out hover:bg-surface-hover"
          >
            <span className="transition-transform duration-150 ease-out group-hover:-translate-x-1">
              <TextMorph>{selectedPeriod.year}</TextMorph>
            </span>
            <ChevronDown
              className="pointer-events-none absolute right-1.5 size-3 translate-x-1 text-muted-foreground/70 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              strokeWidth={2.25}
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

      {isAtCurrent ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-not-allowed">{nextButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">You cannot go past the current month.</TooltipContent>
        </Tooltip>
      ) : (
        nextButton
      )}
    </div>
  );
}
