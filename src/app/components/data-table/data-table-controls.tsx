import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Calendar } from '@/app/components/ui/calendar';
import { Input } from '@/app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import { formatDate } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { CalendarDays } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import type {
  DateRangePopoverFilterDef,
  NumberRangeFilterDef,
  SortSelectFilterDef,
  ToggleGroupFilterDef,
} from './types';

/** Shared with the other header controls so all of them sit on the same row. */
const CONTROL_SHADOW = 'shadow-xs shadow-black/10';

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined;

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

interface DateRangePopoverControlProps {
  def: DateRangePopoverFilterDef<string, never>;
  from: string | undefined;
  to: string | undefined;
  onChange: (from: string | undefined, to: string | undefined) => void;
}

/**
 * A from/to pair behind one trigger.
 *
 * The pending range is local until Apply, so dragging out a range does not fire
 * a request per click. An active range deliberately steps outside the header
 * palette — it is the one control that has to read as "this is narrowing the
 * list" from across the screen.
 */
export function DateRangePopoverControl({ def, from, to, onChange }: DateRangePopoverControlProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DateRange | undefined>(() => {
    const start = parseDateString(from);
    return start ? { from: start, to: parseDateString(to) } : undefined;
  });

  const hasRange = Boolean(from || to);
  const label =
    from && to
      ? `${formatDate(from)} - ${formatDate(to)}`
      : from
        ? `From ${formatDate(from)}`
        : to
          ? `Until ${formatDate(to)}`
          : (def.placeholder ?? 'Date range');

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const start = parseDateString(from);
          setPending(start ? { from: start, to: parseDateString(to) } : undefined);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          size="toolbar"
          variant="outline"
          className={cn(
            'min-w-0 justify-start lg:max-w-64',
            CONTROL_SHADOW,
            hasRange && 'border-primary bg-background text-primary',
            def.className
          )}
        >
          <CalendarDays />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(calc(100vw-1rem),22rem)] p-0" align="start" sideOffset={6}>
        <div className="flex min-w-0 flex-col">
          {def.presets && def.presets.length > 0 && (
            <div className="flex min-w-0 flex-wrap gap-1.5 border-b p-3">
              {def.presets.map((preset) => (
                <Button
                  key={preset.label}
                  size="sm"
                  variant="outline"
                  onClick={() => setPending(preset.getValue())}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={pending}
            disabled={{ after: def.maxDate ?? new Date() }}
            onSelect={setPending}
          />
          <div className="flex items-center justify-between border-t p-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPending(undefined);
                onChange(undefined, undefined);
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(
                  pending?.from ? toDateString(pending.from) : undefined,
                  pending?.to ? toDateString(pending.to) : undefined
                );
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ToggleGroupControlProps {
  def: ToggleGroupFilterDef<string, string, never>;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function ToggleGroupControl({ def, value, onChange }: ToggleGroupControlProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="toolbar"
      value={value ?? def.defaultValue ?? ''}
      className={cn('w-full justify-start sm:w-auto', CONTROL_SHADOW, def.className)}
      onValueChange={(next) => {
        // Radix reports '' when the active item is pressed again. A segmented
        // control has no "none" state, so hold the current value instead.
        if (!next) return;
        onChange(next);
      }}
    >
      {def.options.map((option) => {
        const Icon = option.icon;

        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel ?? option.label}
            className="flex-1 sm:flex-none"
          >
            {Icon && <Icon />}
            {!def.iconOnly && option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

interface NumberRangeControlProps {
  def: NumberRangeFilterDef<string, never>;
  min: string | undefined;
  max: string | undefined;
  onChange: (key: string, value: string | undefined) => void;
}

export function NumberRangeControl({ def, min, max, onChange }: NumberRangeControlProps) {
  const inputClassName = cn('w-full font-medium sm:w-32', CONTROL_SHADOW, def.className);

  return (
    <>
      <Input
        aria-label={def.minLabel ?? 'Minimum'}
        className={inputClassName}
        min={0}
        placeholder={def.minLabel ?? 'Min'}
        step={def.step ?? '1'}
        type="number"
        value={min ?? ''}
        variant="toolbar"
        onChange={(event) => onChange(def.key, event.target.value || undefined)}
      />
      <Input
        aria-label={def.maxLabel ?? 'Maximum'}
        className={inputClassName}
        min={0}
        placeholder={def.maxLabel ?? 'Max'}
        step={def.step ?? '1'}
        type="number"
        value={max ?? ''}
        variant="toolbar"
        onChange={(event) => onChange(def.toKey, event.target.value || undefined)}
      />
    </>
  );
}

interface SortSelectControlProps {
  def: SortSelectFilterDef<string, never>;
  value: string;
  onChange: (field: string) => void;
}

/**
 * Sorts the list from the header rather than from a column header.
 *
 * For lists whose default view has no column headers to click — Files in grid
 * view. Writes through `setSort`, so it stays in step with whatever the table
 * headers do in list view.
 */
export function SortSelectControl({ def, value, onChange }: SortSelectControlProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="toolbar"
        aria-label={def.placeholder ?? 'Sort by'}
        className={cn('w-full sm:w-40', CONTROL_SHADOW, def.className)}
      >
        <SelectValue placeholder={def.placeholder ?? 'Sort by'} />
      </SelectTrigger>
      <SelectContent>
        {def.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
