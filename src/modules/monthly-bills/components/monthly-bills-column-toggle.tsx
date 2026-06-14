import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  MONTHLY_BILL_COLUMNS,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { Columns3 } from 'lucide-react';

interface MonthlyBillsColumnToggleProps {
  visibleColumns: Set<MonthlyBillColumnKey>;
  onToggleColumn: (key: MonthlyBillColumnKey) => void;
}

export function MonthlyBillsColumnToggle({
  visibleColumns,
  onToggleColumn,
}: MonthlyBillsColumnToggleProps) {
  const hiddenCount = MONTHLY_BILL_COLUMNS.length - visibleColumns.size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
          <Columns3 className="size-3.5" />
          Columns
          {hiddenCount > 0 && (
            <span className="ml-1 rounded-sm bg-muted px-1.5 text-xs text-muted-foreground">
              {hiddenCount} hidden
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {MONTHLY_BILL_COLUMNS.map((column) => {
                const checked = visibleColumns.has(column.key);
                // Keep at least one column visible.
                const isLastVisible = checked && visibleColumns.size === 1;
                return (
                  <CommandItem
                    key={column.key}
                    value={column.label}
                    disabled={isLastVisible}
                    onSelect={() => onToggleColumn(column.key)}
                  >
                    <span className="flex-1">{column.label}</span>
                    {checked && <CommandCheck />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
