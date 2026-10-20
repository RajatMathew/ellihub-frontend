import { useMemo, useState } from 'react';

import {
  FieldButton,
  FieldPopover,
  PickerEmpty,
  PickerOption,
  PickerSearch,
} from '@/app/components/record-modal';
import { Switch } from '@/app/components/ui/switch';
import { cn } from '@/app/lib/utils';
import { MonthGrid } from '@/modules/email/components/calendar/event-modal/month-grid';
import {
  durationLabel,
  endTimeOptions,
  minutesOf,
  startTimeOptions,
  timeOfMinutes,
  zoneShortName,
} from '@/modules/email/lib/event-modal-times';
import { timeLabel } from '@/modules/tasks/lib/task-due-picker';
import { format, parse } from 'date-fns';
import { Check, Globe } from 'lucide-react';

type ZoneOption = { value: string; label: string };

/**
 * "When" in the event modal (elli-ui#1379): the day, the start and end times
 * (the end list says how long each choice runs), the time zone, and All day.
 */
export function EventWhenField({
  date,
  startTime,
  endTime,
  allDay,
  timeZone,
  zones,
  onChange,
}: {
  /** `yyyy-MM-dd`. */
  date: string;
  /** `HH:mm`. */
  startTime: string;
  endTime: string;
  allDay: boolean;
  timeZone: string;
  zones: readonly ZoneOption[];
  onChange: (
    next: Partial<{
      date: string;
      startTime: string;
      endTime: string;
      allDay: boolean;
      timeZone: string;
    }>
  ) => void;
}) {
  const [open, setOpen] = useState<null | 'date' | 'start' | 'end' | 'zone'>(null);
  const toggle = (name: NonNullable<typeof open>) => (next: boolean) => setOpen(next ? name : null);
  const day = parse(date, 'yyyy-MM-dd', new Date());
  const setStart = (time: string) => {
    // Moving the start keeps the length, the way calendars do.
    const length = minutesOf(endTime) - minutesOf(startTime);
    const end = Math.min(minutesOf(time) + Math.max(length, 15), 23 * 60 + 59);
    onChange({ startTime: time, endTime: timeOfMinutes(end) });
    setOpen(null);
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-0.5">
      <FieldPopover
        open={open === 'date'}
        onOpenChange={toggle('date')}
        label="Choose date"
        className="w-auto p-2.5"
        trigger={<FieldButton aria-haspopup="dialog">{format(day, 'EEE, d MMM')}</FieldButton>}
      >
        <MonthGrid
          value={date}
          onPick={(next) => {
            onChange({ date: next });
            setOpen(null);
          }}
        />
      </FieldPopover>
      {!allDay ? (
        <>
          <TimePopover
            open={open === 'start'}
            onOpenChange={toggle('start')}
            label="Start time"
            value={startTime}
            options={startTimeOptions()}
            onPick={setStart}
          />
          <span aria-hidden="true" className="px-0.5 text-muted-foreground/60">
            –
          </span>
          <TimePopover
            open={open === 'end'}
            onOpenChange={toggle('end')}
            label="End time"
            value={endTime}
            options={endTimeOptions(startTime)}
            hint={(time) => durationLabel(minutesOf(time) - minutesOf(startTime))}
            onPick={(time) => {
              onChange({ endTime: time });
              setOpen(null);
            }}
          />
          <ZonePopover
            open={open === 'zone'}
            onOpenChange={toggle('zone')}
            value={timeZone}
            zones={zones}
            onPick={(zone) => {
              onChange({ timeZone: zone });
              setOpen(null);
            }}
          />
        </>
      ) : null}
      <label className="ml-auto flex h-8 cursor-pointer items-center gap-2 px-1.5 text-[13px] text-muted-foreground">
        All day
        <Switch checked={allDay} onCheckedChange={(next) => onChange({ allDay: next })} />
      </label>
    </div>
  );
}

function TimePopover({
  open,
  onOpenChange,
  label,
  value,
  options,
  hint,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  value: string;
  options: string[];
  hint?: (time: string) => string;
  onPick: (time: string) => void;
}) {
  return (
    <FieldPopover
      open={open}
      onOpenChange={onOpenChange}
      label={label}
      className={hint ? 'w-44' : 'w-36'}
      trigger={
        <FieldButton aria-label={`${label}: ${timeLabel(value)}`} className="tabular-nums">
          {timeLabel(value)}
        </FieldButton>
      }
    >
      <div
        className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
        role="listbox"
        aria-label={label}
      >
        {options.map((time) => (
          <button
            key={time}
            type="button"
            role="option"
            aria-selected={time === value}
            onClick={() => onPick(time)}
            ref={(element) => {
              if (element && time === value) element.scrollIntoView({ block: 'center' });
            }}
            className={cn(
              'cursor-pointer disabled:cursor-not-allowed flex min-h-8 shrink-0 items-center justify-between rounded-lg px-2.5 text-[13px] tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              time === value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            {timeLabel(time)}
            {hint ? (
              <span
                className={cn('text-xs', time === value ? 'opacity-70' : 'text-muted-foreground')}
              >
                {hint(time)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </FieldPopover>
  );
}

function ZonePopover({
  open,
  onOpenChange,
  value,
  zones,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  zones: readonly ZoneOption[];
  onPick: (zone: string) => void;
}) {
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = needle
      ? zones.filter((zone) => zone.label.toLowerCase().includes(needle))
      : zones;
    return matches.slice(0, 80);
  }, [search, zones]);
  return (
    <FieldPopover
      open={open}
      onOpenChange={onOpenChange}
      label="Time zone"
      className="w-80"
      trigger={
        <FieldButton
          aria-label={`Time zone: ${value}`}
          className="gap-1.5 px-2 text-muted-foreground"
        >
          <Globe className="size-4" aria-hidden="true" />
          <span className="text-[12.5px]">{zoneShortName(value)}</span>
        </FieldButton>
      }
    >
      <PickerSearch
        value={search}
        onChange={setSearch}
        placeholder="Search time zones…"
        label="Search time zones"
      />
      <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="Time zones">
        {shown.map((zone) => (
          <PickerOption
            key={zone.value}
            role="option"
            aria-selected={zone.value === value}
            onClick={() => onPick(zone.value)}
          >
            <span className="min-w-0 flex-1 truncate">{zone.label}</span>
            {zone.value === value ? <Check className="size-4" aria-hidden="true" /> : null}
          </PickerOption>
        ))}
        {shown.length === 0 ? <PickerEmpty>No zone matches “{search}”</PickerEmpty> : null}
      </div>
    </FieldPopover>
  );
}
