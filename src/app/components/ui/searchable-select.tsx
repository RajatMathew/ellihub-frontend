'use client';

import * as React from 'react';

import { ChevronDown, Plus } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';
import { cn } from '@app/lib/utils';

import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
  swatchClassName?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
  /** Callback to create a new item — renders a "+ Add" button at the bottom */
  onAdd?: () => void;
  /** Label for the add button (default: "Add New") */
  addLabel?: string;
}

function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
  testId,
  onAdd,
  addLabel = 'Add New',
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = React.useState<number>(0);

  React.useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            // Match SelectTrigger variants (md size)
            'flex h-8.5 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-[0.8125rem] leading-[var(--text-sm--line-height)] gap-1 shadow-xs shadow-black/5 transition-shadow outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          {selectedOption?.swatchClassName && (
            <span
              aria-hidden="true"
              className={cn('size-[9px] shrink-0 rounded-sm', selectedOption.swatchClassName)}
            />
          )}
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left font-normal',
              !selectedOption && 'text-muted-foreground'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <Badge variant="secondary" size="sm" className="shrink-0">
              {selectedOption.badge}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60 -me-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 overflow-hidden"
        align="start"
        sideOffset={4}
        style={triggerWidth > 0 ? { width: triggerWidth } : undefined}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  disabled={option.disabled}
                  onSelect={() => {
                    if (option.disabled) return;
                    onValueChange(option.value === value ? null : option.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {option.swatchClassName && (
                      <span
                        aria-hidden="true"
                        className={cn('size-[9px] shrink-0 rounded-sm', option.swatchClassName)}
                      />
                    )}
                    <span className="truncate font-normal">{option.label}</span>
                    {option.badge && (
                      <Badge variant="secondary" size="sm" className="shrink-0">
                        {option.badge}
                      </Badge>
                    )}
                  </div>
                  {option.value === value && <CommandCheck />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {onAdd && (
            <div className="border-t">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAdd();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent cursor-pointer"
              >
                <Plus className="size-4" />
                {addLabel}
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { SearchableSelect };
