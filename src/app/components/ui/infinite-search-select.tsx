import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChevronDown, Loader2, X } from 'lucide-react';

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
import {
  searchSelectTriggerSizes,
  type SearchSelectSize,
} from '@app/components/ui/search-select-size';
import { useDebouncedCallback } from '@app/hooks/use-debounced-callback';
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
  onOptionChange?: (option: InfiniteSearchSelectOption | null) => void;
  selectedOption?: InfiniteSearchSelectOption | null;
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
  searchDebounceMs?: number;
  size?: SearchSelectSize;
  triggerClassName?: string;
  contentClassName?: string;
  placeholderClassName?: string;
  testId?: string;
};

function getOptionKey(option: InfiniteSearchSelectOption) {
  return option.value;
}

function areOptionsEqual(
  first: InfiniteSearchSelectOption | undefined,
  second: InfiniteSearchSelectOption
) {
  return (
    first?.value === second.value &&
    first.label === second.label &&
    first.description === second.description &&
    first.badge === second.badge &&
    first.disabled === second.disabled
  );
}

function HighlightMatch({ text, search }: { text: string; search: string }) {
  const query = search.trim();
  if (!query) return <>{text}</>;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'i');
  const splitRegex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(splitRegex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-primary/20 text-foreground font-medium rounded-xs px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function InfiniteSearchSelect({
  options,
  value,
  onValueChange,
  onOptionChange,
  selectedOption,
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
  searchDebounceMs = 300,
  size = 'md',
  triggerClassName,
  contentClassName,
  placeholderClassName,
  testId,
}: InfiniteSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);
  const [cachedOptionByValue, setCachedOptionByValue] = useState(
    () => new Map<string, InfiniteSearchSelectOption>()
  );

  const optionByValue = useMemo(() => {
    const map = new Map<string, InfiniteSearchSelectOption>();
    for (const option of options) {
      map.set(getOptionKey(option), option);
    }
    return map;
  }, [options]);

  useEffect(() => {
    setCachedOptionByValue((previous) => {
      let next: Map<string, InfiniteSearchSelectOption> | undefined;
      const addToCache = (option: InfiniteSearchSelectOption) => {
        const key = getOptionKey(option);
        const existing = (next ?? previous).get(key);
        if (areOptionsEqual(existing, option)) return;
        next ??= new Map(previous);
        next.set(key, option);
      };

      for (const option of options) {
        addToCache(option);
      }

      if (selectedOption) {
        addToCache(selectedOption);
      }

      return next ?? previous;
    });
  }, [options, selectedOption]);

  const resolvedSelectedOption = useMemo(() => {
    if (value === null) return null;
    if (selectedOption?.value === value) return selectedOption;
    return optionByValue.get(value) ?? cachedOptionByValue.get(value) ?? null;
  }, [cachedOptionByValue, optionByValue, selectedOption, value]);

  const renderedOptions = useMemo(() => {
    if (resolvedSelectedOption && !optionByValue.has(resolvedSelectedOption.value)) {
      return [resolvedSelectedOption, ...options];
    }
    return options;
  }, [optionByValue, options, resolvedSelectedOption]);

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const debouncedOnSearchChange = useDebouncedCallback(onSearchChange, searchDebounceMs);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    debouncedOnSearchChange(val);
  };

  const handleSelectOption = useCallback(
    (option: InfiniteSearchSelectOption) => {
      if (option.disabled) return;

      setCachedOptionByValue((previous) => {
        const key = getOptionKey(option);
        if (areOptionsEqual(previous.get(key), option)) return previous;
        const next = new Map(previous);
        next.set(key, option);
        return next;
      });

      const nextValue = option.value === value ? null : option.value;
      onValueChange(nextValue);
      onOptionChange?.(nextValue ? option : null);
      setOpen(false);
    },
    [onOptionChange, onValueChange, value]
  );

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
            'flex w-full items-center justify-between rounded-md border border-input bg-background font-normal outline-none transition-shadow aria-expanded:border-ring aria-expanded:ring-[3px] aria-expanded:ring-ring/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
            searchSelectTriggerSizes[size],
            triggerClassName
          )}
        >
          <span
            className={cn(
              'truncate',
              resolvedSelectedOption ? undefined : (placeholderClassName ?? 'text-muted-foreground')
            )}
          >
            {resolvedSelectedOption ? resolvedSelectedOption.label : placeholder}
          </span>
          {resolvedSelectedOption?.badge && (
            <Badge variant="secondary" size="sm" className="shrink-0">
              {resolvedSelectedOption.badge}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 opacity-60 -me-0.5 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('overflow-hidden p-0', contentClassName)}
        align="start"
        sideOffset={4}
        style={triggerWidth > 0 ? { width: triggerWidth } : undefined}
      >
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              value={localSearch}
              onValueChange={handleSearchChange}
              placeholder={searchPlaceholder}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xs p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
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
            {isLoading && options.length === 0 ? (
              <div className="space-y-2.5 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-1.5 px-2 py-1.5 animate-pulse">
                    <div className="h-4.5 w-2/3 rounded bg-muted/80" />
                    <div className="h-3 w-1/2 rounded bg-muted/40" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {isLoading && options.length > 0 && (
                  <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-1.5 border-b border-border bg-muted/10">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>{loadingMessage}</span>
                  </div>
                )}
                <CommandEmpty>
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center text-muted-foreground">
                    <p className="text-sm font-medium">{emptyMessage}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Check spelling or try a different term
                    </p>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {renderedOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, option.description ?? '']}
                      disabled={option.disabled}
                      onSelect={() => handleSelectOption(option)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate">
                            <HighlightMatch text={option.label} search={localSearch} />
                          </span>
                          {option.badge && (
                            <Badge variant="secondary" size="sm" className="shrink-0">
                              {option.badge}
                            </Badge>
                          )}
                        </div>
                        {option.description && (
                          <span className="block truncate text-xs text-muted-foreground">
                            <HighlightMatch text={option.description} search={localSearch} />
                          </span>
                        )}
                      </div>
                      {option.value === value && <CommandCheck />}
                    </CommandItem>
                  ))}
                  {isFetchingNextPage && (
                    <CommandItem value="loading-more" disabled>
                      <Loader2 className="h-3 w-3 animate-spin me-2" />
                      Loading more...
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
