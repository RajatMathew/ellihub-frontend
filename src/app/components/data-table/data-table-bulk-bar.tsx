import type { ReactNode } from 'react';

import { TableCardHeader, TableCardHeaderToolbar } from '@/app/components/table-card-header';
import { Button } from '@/app/components/ui/button';
import { X } from 'lucide-react';

export interface DataTableItemLabel {
  one: string;
  many: string;
}

interface DataTableBulkBarProps {
  count: number;
  itemLabel?: DataTableItemLabel;
  actions: ReactNode;
  onClear: () => void;
}

/**
 * Replaces the filter header while rows are selected.
 *
 * Taking over the header rather than stacking another bar above it is the point:
 * changing a filter mid-selection would silently drop the checked rows, so the
 * controls that would do it are not on screen while a selection is live.
 */
export function DataTableBulkBar({ count, itemLabel, actions, onClear }: DataTableBulkBarProps) {
  const noun = itemLabel
    ? count === 1
      ? itemLabel.one
      : itemLabel.many
    : count === 1
      ? 'row'
      : 'rows';

  return (
    <TableCardHeader
      title={
        <span
          aria-live="polite"
          className="flex min-h-11 items-center text-sm font-bold tracking-normal text-table-card-header-foreground"
        >
          {count} {noun} selected
        </span>
      }
      actions={
        <TableCardHeaderToolbar className="flex-wrap justify-end">
          {actions}
          <Button
            className="h-8 text-xs text-table-card-header-foreground hover:bg-table-card-header-foreground/10 hover:text-table-card-header-foreground"
            size="sm"
            variant="ghost"
            onClick={onClear}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        </TableCardHeaderToolbar>
      }
    />
  );
}
