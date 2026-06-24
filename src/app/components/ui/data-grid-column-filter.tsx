import { useState, type ComponentType } from 'react';

import { type Column } from '@tanstack/react-table';
import { Check, ChevronDown } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@app/components/ui/popover';
import { cn } from '@app/lib/utils';

interface DataGridColumnFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: ComponentType<{ className?: string }>;
  }[];
}

function DataGridColumnFilter<TData, TValue>({
  column,
  title,
  options,
}: DataGridColumnFilterProps<TData, TValue>) {
  const [open, setOpen] = useState(false);
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);
  const selectedCount = selectedValues.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="justify-between gap-2 rounded-md border-border bg-background px-3 font-medium shadow-sm transition-all hover:border-success/40 data-[state=open]:border-success/50 data-[state=open]:ring-2 data-[state=open]:ring-success/15"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{title}</span>
            {selectedCount > 0 && (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-[11px] font-semibold leading-none text-success-foreground">
                {selectedCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(calc(100vw-1.5rem),16rem)] overflow-hidden rounded-lg border-border p-0 shadow-xl shadow-black/10"
        align="start"
        sideOffset={8}
      >
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-[min(20rem,var(--radix-popover-content-available-height))]">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="p-2">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    className="min-h-10 gap-3 rounded-md px-2 py-2"
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(filterValues.length ? filterValues : undefined);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
                        isSelected
                          ? 'border-success bg-success text-success-foreground'
                          : 'border-muted-foreground/40 bg-background text-transparent'
                      )}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                    {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                    {facets?.get(option.value) && (
                      <span className="ms-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup className="p-2">
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { DataGridColumnFilter, type DataGridColumnFilterProps };
