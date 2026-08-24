import type { ReactNode } from 'react';

import {
  TableCardHeader,
  TableCardHeaderFilters,
  TableCardHeaderTrailing,
} from '@/app/components/table-card-header';
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
      // Same three slots as the filter header, so the bar taking it over does not
      // move anything sideways. Actions arrive from the page as plain buttons, so
      // the bar sizes them itself rather than trusting each caller to pass
      // `size="toolbar"` — without it the page's Delete sat 4px shorter than Clear.
      actions={
        <TableCardHeaderFilters className="[&>[data-slot=button]]:h-8">
          {actions}
        </TableCardHeaderFilters>
      }
      trailing={
        <TableCardHeaderTrailing>
          <Button size="toolbar" variant="ghost" onClick={onClear}>
            <X strokeWidth={2} />
            Clear
          </Button>
        </TableCardHeaderTrailing>
      }
    />
  );
}
