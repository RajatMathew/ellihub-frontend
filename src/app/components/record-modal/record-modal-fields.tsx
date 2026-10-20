import { forwardRef, type ComponentProps, type ReactNode } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { Search, type LucideIcon } from 'lucide-react';

/** One labelled property: an icon and a name on the left, its value on the right. */
export function PropRow({
  icon: Icon,
  label,
  count,
  htmlFor,
  children,
}: {
  icon: LucideIcon;
  label: string;
  /** Shown beside the label for lists: how many emails, how many items. */
  count?: number;
  htmlFor?: string;
  children: ReactNode;
}) {
  const Label = htmlFor ? 'label' : 'div';
  return (
    <div className="grid grid-cols-1 items-start sm:grid-cols-[10rem_minmax(0,1fr)]">
      <Label
        {...(htmlFor ? { htmlFor } : {})}
        className="flex h-7 items-center gap-2 whitespace-nowrap px-2.5 text-[13px] text-muted-foreground sm:h-9"
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
        {count ? (
          <span className="rounded-sm bg-accent px-1.5 text-[11px] font-medium tabular-nums text-foreground/70">
            {count}
          </span>
        ) : null}
      </Label>
      <div className="relative min-w-0 py-0.5">{children}</div>
    </div>
  );
}

/** A value that opens a picker: flat until hovered, grey while open. */
export const FieldButton = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(
  function FieldButton({ className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'cursor-pointer disabled:cursor-not-allowed inline-flex h-8 max-w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-[13.5px] text-foreground transition-colors hover:bg-accent data-[state=open]:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

/** "+ Link email": the quiet action that adds to a list. */
export const AddButton = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function AddButton(
  { className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'cursor-pointer disabled:cursor-not-allowed inline-flex h-7.5 items-center gap-1.5 self-start rounded-md py-1 pl-1.5 pr-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary-soft data-[state=open]:bg-primary-soft focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/** A popover anchored to a field, in the sheet's own white. */
export function FieldPopover({
  open,
  onOpenChange,
  trigger,
  children,
  className,
  side = 'bottom',
  align = 'start',
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  side?: 'top' | 'bottom';
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'end';
  label: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={6}
        aria-label={label}
        className={cn('w-72 rounded-xl border-border/60 bg-popover p-1.5 shadow-xl', className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** The search box across the top of a picker. */
export function PickerSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="-mx-1.5 -mt-1.5 mb-1.5 flex h-9.5 items-center gap-2 border-b border-border/50 px-2.5 text-muted-foreground">
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <input
        autoFocus
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/70"
      />
    </label>
  );
}

/** One row of a picker list. */
export const PickerOption = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(
  function PickerOption({ className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'cursor-pointer disabled:cursor-not-allowed flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden aria-selected:font-medium',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export function PickerEmpty({ children }: { children: ReactNode }) {
  return <div className="px-2 py-4 text-center text-[13px] text-muted-foreground">{children}</div>;
}
