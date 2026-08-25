import { useState, type ComponentType, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { ChevronDown, type LucideProps } from 'lucide-react';

/**
 * The shell every "from and to" filter shares.
 *
 * There were three of these and no two looked alike: a cost range as two bare
 * number inputs eating two slots of the header row, a date range as two bare
 * date inputs doing the same, and a third behind a popover with presets and a
 * calendar. One trigger, one panel, one footer — what differs is the fields
 * inside, which is the only thing that should.
 *
 * The caller owns the pending values, because a number pair and a calendar
 * range are not the same shape. The shell owns everything else: whether the
 * panel is open, what the trigger says, and the Clear/Apply pair.
 *
 * @example
 * <RangePopover
 *   icon={DollarSign}
 *   label="Cost range"
 *   description="Set a minimum and maximum amount."
 *   summary={hasRange ? `${min} – ${max}` : null}
 *   error={invalid ? 'Minimum is above the maximum.' : undefined}
 *   onOpen={reseedPending}
 *   onApply={commit}
 *   onClear={reset}
 * >
 *   <RangeFields>…</RangeFields>
 * </RangePopover>
 */
export interface RangePopoverProps {
  /** Trigger icon — a currency mark, a calendar. */
  icon?: ComponentType<LucideProps>;
  /** Trigger text while empty, and the panel's heading. */
  label: string;
  /** One quiet line under the heading, saying what the range does. */
  description?: string;
  /** Trigger text once a value is set. `null` means nothing is set. */
  summary?: string | null;
  /** Blocks Apply and is shown under the fields. */
  error?: string;
  /** Called as the panel opens, to re-seed pending values from the committed ones. */
  onOpen?: () => void;
  onApply: () => void;
  onClear: () => void;
  children: ReactNode;
  /** Width of the trigger. The panel sizes itself. */
  className?: string;
}

export function RangePopover({
  icon: Icon,
  label,
  description,
  summary,
  error,
  onOpen,
  onApply,
  onClear,
  children,
  className,
}: RangePopoverProps) {
  const [open, setOpen] = useState(false);
  const isActive = Boolean(summary);

  const apply = () => {
    if (error) return;

    onApply();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpen?.();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          size="toolbar"
          variant="outline"
          aria-label={isActive ? `${label}: ${summary}` : label}
          className={cn(
            'min-w-0 justify-start shadow-xs shadow-black/10 sm:max-w-56',
            // An applied range steps out of the header palette deliberately: it
            // is the one control that has to read as "this is narrowing the
            // list" without being opened.
            isActive && 'border-primary bg-background text-primary',
            className
          )}
        >
          {Icon && <Icon />}
          <span className="min-w-0 flex-1 truncate text-left">{summary || label}</span>
          <ChevronDown className="shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        // Never wider than the viewport allows. At 320px this lands at 288px,
        // which still fits two fields side by side.
        className="w-[min(calc(100vw-1.5rem),20rem)] p-0"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            apply();
          }
        }}
      >
        <div className="flex flex-col">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>

          <div className="px-4 py-3">
            {children}
            {error && (
              <p className="mt-2 text-xs font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button size="sm" disabled={Boolean(error)} onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The two-up field row inside a range panel. */
export function RangeFields({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export interface RangeFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'number' | 'date';
  /** A currency mark or unit, rendered inside the field. */
  prefix?: string;
  placeholder?: string;
  min?: string;
  step?: string;
}

/**
 * One end of a range.
 *
 * A real `<Label htmlFor>` rather than a placeholder standing in for one: the
 * placeholder disappears the moment there is a value, and "which box was the
 * maximum" is exactly what a user needs on returning to a filter.
 */
export function RangeField({
  id,
  label,
  value,
  onChange,
  type = 'number',
  prefix,
  placeholder,
  min,
  step,
}: RangeFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {prefix ? (
        <InputWrapper variant="md" className="min-w-0">
          <span aria-hidden="true" className="shrink-0 text-sm text-muted-foreground">
            {prefix}
          </span>
          <Input
            id={id}
            className="min-w-0"
            min={min}
            placeholder={placeholder}
            step={step}
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </InputWrapper>
      ) : (
        <Input
          id={id}
          className="min-w-0"
          min={min}
          placeholder={placeholder}
          step={step}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
