import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import {
  CALENDAR_EVENT_STYLES,
  type CalendarEventColor,
} from '@/modules/email/components/calendar/email-calendar-types';
import {
  EVENT_COLOR_KEYS,
  eventColorLabel,
  type EventColorKey,
} from '@/modules/email/lib/calendar-event-colors';
import { Check, ChevronDown } from 'lucide-react';

interface EventColorPickerProps {
  /** The user's own color, or null when the event follows its calendar. */
  value: EventColorKey | null;
  /** The calendar's color — what "Default" draws and what null means. */
  calendarColor: CalendarEventColor;
  onChange: (value: EventColorKey | null) => void;
  className?: string;
}

/**
 * Google Calendar's event color menu: a swatch grid, then "Default" to put the
 * event back on its calendar's color. Picking closes the menu; the dialog
 * saves the choice with the rest of the event.
 */
export function EventColorPicker({
  value,
  calendarColor,
  onChange,
  className,
}: EventColorPickerProps) {
  const [open, setOpen] = useState(false);
  const shown = value ?? calendarColor;
  const pick = (next: EventColorKey | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Event color: ${value ? eventColorLabel(value) : 'calendar default'}`}
          className={cn(
            'flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md bg-muted/60 px-2 transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
            className
          )}
        >
          <span
            aria-hidden="true"
            className={cn('size-3.5 rounded-full', CALENDAR_EVENT_STYLES[shown].accent)}
          />
          <ChevronDown aria-hidden="true" className="size-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-2"
        role="radiogroup"
        aria-label="Event color"
      >
        <div className="grid grid-cols-10 gap-1.5 p-1">
          {EVENT_COLOR_KEYS.map((key) => (
            <Swatch
              key={key}
              label={eventColorLabel(key)}
              tone={key}
              selected={value === key}
              onSelect={() => pick(key)}
            />
          ))}
        </div>
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => pick(null)}
          className={cn(
            'mt-1.5 flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-md text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            value === null && 'bg-muted'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex size-4 items-center justify-center rounded-full text-white',
              CALENDAR_EVENT_STYLES[calendarColor].accent
            )}
          >
            {value === null && <Check className="size-2.5" strokeWidth={3} />}
          </span>
          Default
        </button>
      </PopoverContent>
    </Popover>
  );
}

function Swatch({
  label,
  tone,
  selected,
  onSelect,
}: {
  label: string;
  tone: EventColorKey;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={cn(
        'flex size-6 cursor-pointer items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
        CALENDAR_EVENT_STYLES[tone].accent
      )}
    >
      {selected && <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />}
    </button>
  );
}
