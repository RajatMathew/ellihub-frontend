import { useEffect, useRef, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@app/components/ui/popover';
import { cn } from '@app/lib/utils';

export type InfiniteSearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

type InfiniteSearchSelectProps = {
  options: InfiniteSearchSelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onFetchNextPage?: () => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  triggerClassName?: string;
  contentClassName?: string;
  placeholderClassName?: string;
  testId?: string;
};

export function InfiniteSearchSelect({
  options,
  value,
  onValueChange,
  search,
  onSearchChange,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onFetchNextPage,
  disabled,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  loadingMessage = 'Loading...',
  triggerClassName,
  contentClassName,
  placeholderClassName,
  testId,
}: InfiniteSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

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
            'flex h-8.5 w-full items-center justify-between gap-1 rounded-md border border-input bg-background px-3 text-[0.8125rem] font-normal leading-[var(--text-sm--line-height)] shadow-xs shadow-black/5 outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName,
          )}
        >
          <span
            className={cn(
              'truncate',
              selectedOption ? undefined : placeholderClassName ?? 'text-muted-foreground',
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
        className={cn('overflow-hidden p-0', contentClassName)}
        align="start"
        sideOffset={4}
        style={triggerWidth > 0 ? { width: triggerWidth } : undefined}
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
          <CommandList
            onScroll={(event) => {
              const target = event.currentTarget;
              const isNearBottom =
                target.scrollTop + target.clientHeight >= target.scrollHeight - 24;
              if (isNearBottom && hasNextPage && !isFetchingNextPage) {
                onFetchNextPage?.();
              }
            }}
          >
            <CommandEmpty>{isLoading ? loadingMessage : emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, option.description ?? '']}
                  disabled={option.disabled}
                  onSelect={() => {
                    if (option.disabled) return;
                    onValueChange(option.value === value ? null : option.value);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{option.label}</span>
                      {option.badge && (
                        <Badge variant="secondary" size="sm" className="shrink-0">
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    {option.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                  {option.value === value && <CommandCheck />}
                </CommandItem>
              ))}
              {isFetchingNextPage && (
                <CommandItem value="loading-more" disabled>
                  Loading more...
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
