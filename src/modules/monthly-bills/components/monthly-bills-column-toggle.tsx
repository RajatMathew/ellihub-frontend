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
}

const tableHeaderActionButtonClassName =
  '!border-input !bg-background !text-foreground hover:!border-success/40 hover:!bg-background hover:!text-foreground data-[state=open]:!border-success/50 data-[state=open]:!ring-2 data-[state=open]:!ring-success/15 [&_svg]:!text-muted-foreground';

export function MonthlyBillsColumnToggle({
  visibleColumns,
  onToggleColumn,
}: MonthlyBillsColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const selectedCount = visibleColumns.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`w-full shrink-0 justify-between gap-2 rounded-md px-3 font-medium shadow-sm transition-all sm:w-auto ${tableHeaderActionButtonClassName}`}
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
        className="w-[min(calc(100vw-1.5rem),18rem)] overflow-hidden rounded-lg border-border p-0 shadow-xl shadow-black/10"
      >
        <div className="px-4 pt-4 pb-2 text-xs font-medium text-muted-foreground">
          Select columns
        </div>
        <ScrollArea className="h-[min(20rem,calc(var(--radix-popover-content-available-height)-4rem))] px-3 pb-3">
          <div className="space-y-1 pr-1">
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
                    'flex min-h-10 w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-foreground outline-hidden transition-colors duration-150',
                    'hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/20',
                    isLastVisible && 'cursor-not-allowed opacity-60'
                  )}
                  onClick={() => onToggleColumn(column.key)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
                      checked
                        ? 'border-success bg-success text-success-foreground'
                        : 'border-muted-foreground/40 bg-background text-transparent'
                    )}
                  >
                    <Check className="size-3.5 stroke-[3]" />
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
