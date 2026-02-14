'use client';

import * as React from 'react';

import { ChevronDown } from 'lucide-react';

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
          className={cn(
            // Match SelectTrigger variants (md size)
            'flex h-8.5 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-[0.8125rem] leading-[var(--text-sm--line-height)] gap-1 shadow-xs shadow-black/5 transition-shadow outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            '[&>span]:line-clamp-1',
            className,
          )}
        >
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
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
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? null : option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  {option.value === value && <CommandCheck />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { SearchableSelect };
