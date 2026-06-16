import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChevronDown, Loader2, X } from 'lucide-react';

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
import { useDebouncedCallback } from '@app/hooks/use-debounced-callback';
import { cn } from '@app/lib/utils';

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
  onOptionsChange?: (options: InfiniteMultiSearchSelectOption[]) => void;
  selectedOptions?: InfiniteMultiSearchSelectOption[];
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
  triggerClassName?: string;
  contentClassName?: string;
  testId?: string;
};

function getOptionKey(option: InfiniteMultiSearchSelectOption) {
  return option.value;
}

function areOptionsEqual(
  first: InfiniteMultiSearchSelectOption | undefined,
  second: InfiniteMultiSearchSelectOption
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

export function InfiniteMultiSearchSelect({
  options,
  value,
  onValueChange,
  onOptionsChange,
  selectedOptions: selectedOptionsProp = [],
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
  triggerClassName,
  contentClassName,
  testId,
}: InfiniteMultiSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);
  const [localSearch, setLocalSearch] = useState(search);
  const [cachedOptionByValue, setCachedOptionByValue] = useState(
    () => new Map<string, InfiniteMultiSearchSelectOption>()
  );

  const optionByValue = useMemo(() => {
    const map = new Map<string, InfiniteMultiSearchSelectOption>();
    for (const option of options) {
      map.set(getOptionKey(option), option);
    }
    return map;
  }, [options]);

  const selectedPropOptionByValue = useMemo(() => {
    const map = new Map<string, InfiniteMultiSearchSelectOption>();
    for (const option of selectedOptionsProp) {
      map.set(getOptionKey(option), option);
    }
    return map;
  }, [selectedOptionsProp]);

  useEffect(() => {
    setCachedOptionByValue((previous) => {
      let next: Map<string, InfiniteMultiSearchSelectOption> | undefined;
      const addToCache = (option: InfiniteMultiSearchSelectOption) => {
        const key = getOptionKey(option);
        const existing = (next ?? previous).get(key);
        if (areOptionsEqual(existing, option)) return;
        next ??= new Map(previous);
        next.set(key, option);
      };

      for (const option of options) addToCache(option);
      for (const option of selectedOptionsProp) addToCache(option);

      return next ?? previous;
    });
  }, [options, selectedOptionsProp]);

  const resolveOption = useCallback(
    (optionValue: string): InfiniteMultiSearchSelectOption => {
      return (
        selectedPropOptionByValue.get(optionValue) ??
        optionByValue.get(optionValue) ??
        cachedOptionByValue.get(optionValue) ?? {
          value: optionValue,
          label: 'Selected item',
        }
      );
    },
    [cachedOptionByValue, optionByValue, selectedPropOptionByValue]
  );

  const selectedOptions = useMemo(
    () => value.map((selected) => resolveOption(selected)),
    [resolveOption, value]
  );

  const renderedOptions = useMemo(() => {
    const next = [...options];
    const seen = new Set(next.map((option) => option.value));
    for (const option of selectedOptions) {
      if (!seen.has(option.value)) {
        next.unshift(option);
        seen.add(option.value);
      }
    }
    return next;
  }, [options, selectedOptions]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const debouncedOnSearchChange = useDebouncedCallback(onSearchChange, searchDebounceMs);

  const handleSearchChange = (nextSearch: string) => {
    setLocalSearch(nextSearch);
    debouncedOnSearchChange(nextSearch);
  };

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const emitValueChange = useCallback(
    (nextValue: string[]) => {
      onValueChange(nextValue);
      onOptionsChange?.(nextValue.map((optionValue) => resolveOption(optionValue)));
    },
    [onOptionsChange, onValueChange, resolveOption]
  );

  const toggle = useCallback(
    (option: InfiniteMultiSearchSelectOption) => {
      if (option.disabled) return;

      setCachedOptionByValue((previous) => {
        const key = getOptionKey(option);
        if (areOptionsEqual(previous.get(key), option)) return previous;
        const next = new Map(previous);
        next.set(key, option);
        return next;
      });

      emitValueChange(
        value.includes(option.value)
          ? value.filter((item) => item !== option.value)
          : [...value, option.value]
      );
    },
    [emitValueChange, value]
  );

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
            'flex min-h-8.5 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-[0.8125rem] font-normal shadow-xs shadow-black/5 outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName
          )}
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
                    aria-label={`Remove ${option.label}`}
                    className="ml-1 inline-flex rounded-xs"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggle(option);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        toggle(option);
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
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {renderedOptions.map((option) => {
                    const selected = value.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={[option.label, option.description ?? '']}
                        disabled={option.disabled}
                        onSelect={() => toggle(option)}
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
                        {selected && <CommandCheck />}
                      </CommandItem>
                    );
                  })}
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
        {value.length > 0 && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => emitValueChange([])}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
