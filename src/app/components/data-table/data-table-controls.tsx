import { useState } from 'react';

import { RangeField, RangeFields, RangePopover } from '@/app/components/range-popover';
import { Button } from '@/app/components/ui/button';
import { Calendar } from '@/app/components/ui/calendar';
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
import { CalendarDays, DollarSign } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import type {
  DateRangeFilterDef,
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
  onChange: (values: Record<string, string | undefined>) => void;
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
  const [pending, setPending] = useState<DateRange | undefined>(() => {
    const start = parseDateString(from);
    return start ? { from: start, to: parseDateString(to) } : undefined;
  });

  const summary =
    from && to
      ? `${formatDate(from)} - ${formatDate(to)}`
      : from
        ? `From ${formatDate(from)}`
        : to
          ? `Until ${formatDate(to)}`
          : null;

  return (
    <RangePopover
      className={def.className}
      description={def.description ?? 'Pick a start and end date.'}
      icon={CalendarDays}
      label={def.placeholder ?? def.label ?? 'Date range'}
      summary={summary}
      onOpen={() => {
        const start = parseDateString(from);
        setPending(start ? { from: start, to: parseDateString(to) } : undefined);
      }}
      onApply={() =>
        onChange({
          [def.key]: pending?.from ? toDateString(pending.from) : undefined,
          [def.toKey]: pending?.to ? toDateString(pending.to) : undefined,
        })
      }
      onClear={() => {
        setPending(undefined);
        onChange({ [def.key]: undefined, [def.toKey]: undefined });
      }}
    >
      <div className="flex min-w-0 flex-col gap-3">
        {def.presets && def.presets.length > 0 && (
          <div className="flex min-w-0 flex-wrap gap-1.5">
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
          className="p-0"
          onSelect={setPending}
        />
      </div>
    </RangePopover>
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
  onChange: (values: Record<string, string | undefined>) => void;
}

/**
 * A min/max pair behind one trigger.
 *
 * Was two bare number inputs sitting directly in the header, which ate two of
 * its slots and left the pair unlabelled once a value replaced the placeholder.
 * Values are pending until Apply, so typing a minimum does not fire a request
 * per keystroke — and it gives somewhere to catch a minimum above the maximum
 * before it becomes a query that can only return nothing.
 */
export function NumberRangeControl({ def, min, max, onChange }: NumberRangeControlProps) {
  const [pendingMin, setPendingMin] = useState(min ?? '');
  const [pendingMax, setPendingMax] = useState(max ?? '');

  const format = def.formatValue ?? ((value: string) => value);
  const summary =
    min && max
      ? `${format(min)} – ${format(max)}`
      : min
        ? `From ${format(min)}`
        : max
          ? `Up to ${format(max)}`
          : null;

  const invalid = pendingMin !== '' && pendingMax !== '' && Number(pendingMin) > Number(pendingMax);

  return (
    <RangePopover
      className={def.className}
      description={def.description ?? 'Set a minimum and maximum amount.'}
      error={invalid ? 'The minimum is above the maximum.' : undefined}
      icon={def.prefix === '$' ? DollarSign : undefined}
      label={def.placeholder ?? def.label ?? 'Range'}
      summary={summary}
      onOpen={() => {
        setPendingMin(min ?? '');
        setPendingMax(max ?? '');
      }}
      onApply={() =>
        onChange({ [def.key]: pendingMin || undefined, [def.toKey]: pendingMax || undefined })
      }
      onClear={() => {
        setPendingMin('');
        setPendingMax('');
        onChange({ [def.key]: undefined, [def.toKey]: undefined });
      }}
    >
      <RangeFields>
        <RangeField
          id={`${def.key}-min`}
          label={def.minLabel ?? 'Min'}
          min="0"
          placeholder={def.prefix ? `${def.prefix}0` : '0'}
          prefix={def.prefix}
          step={def.step ?? '1'}
          value={pendingMin}
          onChange={setPendingMin}
        />
        <RangeField
          id={`${def.toKey}-max`}
          label={def.maxLabel ?? 'Max'}
          min="0"
          placeholder={def.prefix ? `${def.prefix}0` : '0'}
          prefix={def.prefix}
          step={def.step ?? '1'}
          value={pendingMax}
          onChange={setPendingMax}
        />
      </RangeFields>
    </RangePopover>
  );
}

interface DateRangeControlProps {
  def: DateRangeFilterDef<string, never>;
  from: string | undefined;
  to: string | undefined;
  onChange: (values: Record<string, string | undefined>) => void;
}

/**
 * A from/to date pair behind one trigger.
 *
 * The same shell as the number range and the calendar range, so all three read
 * as one control rather than three. Two date fields rather than a calendar,
 * because this is the "type a bound" case; reach for `f.dateRangePopover` when
 * picking dates visually is the point.
 */
export function DateRangeControl({ def, from, to, onChange }: DateRangeControlProps) {
  const [pendingFrom, setPendingFrom] = useState(from ?? '');
  const [pendingTo, setPendingTo] = useState(to ?? '');

  const summary =
    from && to
      ? `${formatDate(from)} - ${formatDate(to)}`
      : from
        ? `From ${formatDate(from)}`
        : to
          ? `Until ${formatDate(to)}`
          : null;

  const invalid = pendingFrom !== '' && pendingTo !== '' && pendingFrom > pendingTo;

  return (
    <RangePopover
      className={def.className}
      description={def.description ?? 'Set a start and end date.'}
      error={invalid ? 'The start date is after the end date.' : undefined}
      icon={CalendarDays}
      label={def.placeholder ?? def.label ?? 'Date range'}
      summary={summary}
      onOpen={() => {
        setPendingFrom(from ?? '');
        setPendingTo(to ?? '');
      }}
      onApply={() =>
        onChange({ [def.key]: pendingFrom || undefined, [def.toKey]: pendingTo || undefined })
      }
      onClear={() => {
        setPendingFrom('');
        setPendingTo('');
        onChange({ [def.key]: undefined, [def.toKey]: undefined });
      }}
    >
      <RangeFields>
        <RangeField
          id={`${def.key}-from`}
          label={def.fromLabel ?? 'From'}
          type="date"
          value={pendingFrom}
          onChange={setPendingFrom}
        />
        <RangeField
          id={`${def.toKey}-to`}
          label={def.toLabel ?? 'To'}
          type="date"
          value={pendingTo}
          onChange={setPendingTo}
        />
      </RangeFields>
    </RangePopover>
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
