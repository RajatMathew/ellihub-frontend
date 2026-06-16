import { useEffect, useRef, useState } from 'react';

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

function HighlightMatch({ text, search }: { text: string; search: string }) {
  if (!search.trim()) return <>{text}</>;
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
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

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const debouncedOnSearchChange = useDebouncedCallback(onSearchChange, 300);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    debouncedOnSearchChange(val);
  };

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
          <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 -me-0.5 transition-transform duration-200", open && "rotate-180")} />
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
