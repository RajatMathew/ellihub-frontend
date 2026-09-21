import { useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Calendar } from '@/app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { format, parse } from 'date-fns';
import { CalendarDays } from 'lucide-react';

/**
 * The app's date and time fields, in place of the browser's own.
 *
 * `<input type="date">` and `<input type="time">` are drawn by the OS: a
 * different widget on every platform, a locale order nobody here chose, and a
 * calendar that looks nothing like the one the rest of the app opens. The
 * calendar dialog replaced both a while ago; these are the same two controls,
 * moved out of it so the task form — and anything else that needs a day and a
 * time — asks the question the same way.
 *
 * Values are the native input formats either way, `yyyy-MM-dd` and `HH:mm`, so
 * a caller can swap an input for one of these without touching its state.
 */

/** A day, chosen from the shared shadcn calendar in a popover. */
export function DatePickerButton({
  value,
  onChange,
  className,
  size = 'sm',
  placeholder = 'Pick a date',
  'aria-label': ariaLabel,
}: {
  /** `yyyy-MM-dd`, or empty for no date yet. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseDateValue(value);
  const valid = !Number.isNaN(parsed.getTime());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          aria-label={ariaLabel}
          className={cn('w-fit shrink-0 gap-1.5 font-medium', className)}
        >
          <CalendarDays aria-hidden="true" className="size-3.5 text-muted-foreground" />
          {valid ? format(parsed, 'MMM d, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={valid ? parsed : undefined}
          onSelect={(next) => {
            if (!next) return;
            onChange(format(next, 'yyyy-MM-dd'));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Every quarter-hour of the day as {value: "HH:mm", label: "9:30 am"}. */
const TIME_OF_DAY_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const label = format(parse(value, 'HH:mm', new Date()), 'h:mm a').toLowerCase();
  return { value, label };
});

/**
 * A time of day, chosen from a quarter-hour list.
 *
 * Free typing is deliberately not offered: every caller so far wants a meeting
 * time or a deadline, both of which land on a quarter hour, and a list is one
 * scroll rather than four keystrokes and a format to get wrong. A value off the
 * grid — one that arrived from the server — still displays; it simply is not in
 * the list to pick again.
 */
export function TimePickerButton({
  value,
  onChange,
  className,
  size = 'sm',
  'aria-label': ariaLabel,
}: {
  /** `HH:mm`. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const parsed = parse(value, 'HH:mm', new Date());
  const display = Number.isNaN(parsed.getTime()) ? value : format(parsed, 'h:mm a').toLowerCase();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          // Scroll the current value into view instead of always opening at
          // midnight — most edits are to a time later in the day.
          requestAnimationFrame(() => {
            listRef.current
              ?.querySelector('[data-selected="true"]')
              ?.scrollIntoView({ block: 'center' });
          });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          aria-label={ariaLabel}
          className={cn('w-fit shrink-0 font-medium', className)}
        >
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-32 p-1">
        <div ref={listRef} className="max-h-64 overflow-y-auto">
          {TIME_OF_DAY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'flex h-8 w-full cursor-pointer items-center rounded-sm px-2 text-sm',
                option.value === value
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseDateValue(dateString: string): Date {
  return parse(dateString, 'yyyy-MM-dd', new Date());
}
