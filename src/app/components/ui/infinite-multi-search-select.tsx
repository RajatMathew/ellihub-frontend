import { useEffect, useRef, useState } from 'react';

import { ChevronDown, X } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
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

export type InfiniteMultiSearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

type InfiniteMultiSearchSelectProps = {
  options: InfiniteMultiSearchSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
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
  testId?: string;
};

export function InfiniteMultiSearchSelect({
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
  testId,
}: InfiniteMultiSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);
  const selectedOptions = value
    .map((selected) => options.find((option) => option.value === selected))
    .filter(Boolean) as InfiniteMultiSearchSelectOption[];

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((item) => item !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  }

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
          className="flex min-h-8.5 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-[0.8125rem] font-normal shadow-xs shadow-black/5 outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge key={option.value} variant="secondary" appearance="outline" size="sm">
                  <span className="max-w-[180px] truncate">{option.label}</span>
                  {option.badge && <span className="text-muted-foreground">{option.badge}</span>}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 inline-flex"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggle(option.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        toggle(option.value);
                      }
                    }}
                  >
                    <X className="size-3" />
                  </span>
                </Badge>
              ))
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60 -me-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="overflow-hidden p-0"
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
              {options.map((option) => {
                const selected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label, option.description ?? '']}
                    disabled={option.disabled}
                    onSelect={() => {
                      if (option.disabled) return;
                      toggle(option.value);
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
                    {selected && <CommandCheck />}
                  </CommandItem>
                );
              })}
              {isFetchingNextPage && (
                <CommandItem value="loading-more" disabled>
                  Loading more...
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
        {value.length > 0 && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onValueChange([])}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
