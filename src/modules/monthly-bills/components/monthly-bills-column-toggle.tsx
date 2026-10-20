import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { cn } from '@/app/lib/utils';
import {
  MONTHLY_BILL_COLUMNS,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { Check, ChevronDown } from 'lucide-react';

interface MonthlyBillsColumnToggleProps {
  visibleColumns: Set<MonthlyBillColumnKey>;
  onToggleColumn: (key: MonthlyBillColumnKey) => void;
  triggerClassName?: string;
  contentClassName?: string;
}

export function MonthlyBillsColumnToggle({
  visibleColumns,
  onToggleColumn,
  triggerClassName,
  contentClassName,
}: MonthlyBillsColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const selectedCount = visibleColumns.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="toolbar"
          className={cn(
            'w-full shrink-0 justify-between font-medium shadow-xs shadow-black/10 sm:w-auto',
            triggerClassName
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">Columns</span>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-[11px] font-semibold leading-none text-success-foreground">
              {selectedCount}
            </span>
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
        align="end"
        sideOffset={8}
        className={cn(
          'w-[min(calc(100vw-1.5rem),15rem)] overflow-hidden rounded-lg border-border p-0 shadow-xl shadow-black/10',
          contentClassName
        )}
      >
        <div className="px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground">
          Select columns
        </div>
        <ScrollArea className="h-[min(16rem,calc(var(--radix-popover-content-available-height)-3.5rem))] px-2 pb-2">
          <div className="space-y-0.5 pr-1">
            {MONTHLY_BILL_COLUMNS.map((column) => {
              const checked = visibleColumns.has(column.key);
              const isLastVisible = checked && visibleColumns.size === 1;
              return (
                <button
                  key={column.key}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={isLastVisible}
                  className={cn(
                    'flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground outline-hidden transition-colors duration-150',
                    'hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/20',
                    isLastVisible && 'cursor-not-allowed opacity-60'
                  )}
                  onClick={() => onToggleColumn(column.key)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-4.5 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150',
                      checked
                        ? 'border-success bg-success text-success-foreground'
                        : 'border-muted-foreground/40 bg-background text-transparent'
                    )}
                  >
                    <Check className="size-3 stroke-[3]" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{column.label}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
