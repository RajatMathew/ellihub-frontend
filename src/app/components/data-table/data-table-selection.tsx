/* eslint-disable react-refresh/only-export-components -- the column id and the
   column factory belong beside the cells they render, as in ui/data-grid.tsx */

import { Checkbox } from '@/app/components/ui/checkbox';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type { ColumnDef, Row, Table } from '@tanstack/react-table';

/** Column id the kit reserves for the checkbox column. Never a sortable field. */
export const SELECTION_COLUMN_ID = '__select';

export interface ListSelectionConfig<TData> {
  /**
   * Accessible name for a row's checkbox, e.g. `"Acme Corp"` — rendered as
   * "Select Acme Corp". Required, not optional: twenty checkboxes all labelled
   * "Select row" is not a table anyone can use with a screen reader.
   */
  getRowLabel: (row: TData) => string;
  /**
   * Rows the user may check. A row that fails this renders a disabled checkbox
   * rather than silently being skipped later. Omit when every row is eligible.
   */
  canSelect?: (row: TData) => boolean;
  /** Tooltip on the disabled checkbox, explaining what would make the row eligible. */
  ineligibleReason?: string;
}

function SelectAllHeader<TData>({ table }: { table: Table<TData> }) {
  // Deliberately page-scoped. "Select all 240 across every page" is a footgun on
  // an action whose only purpose is deletion — the user cannot see what they are
  // agreeing to. Selection survives paging, so selecting each page still works.
  const selectableRows = table.getRowModel().rows.filter((row) => row.getCanSelect());
  const selectedCount = selectableRows.filter((row) => row.getIsSelected()).length;

  return (
    <Checkbox
      aria-label="Select all rows on this page"
      checked={
        selectableRows.length > 0 && selectedCount === selectableRows.length
          ? true
          : selectedCount > 0
            ? 'indeterminate'
            : false
      }
      disabled={selectableRows.length === 0}
      size="sm"
      onCheckedChange={(value) => {
        for (const row of selectableRows) row.toggleSelected(!!value);
      }}
    />
  );
}

function SelectRowCell<TData>({
  row,
  label,
  ineligibleReason,
}: {
  row: Row<TData>;
  label: string;
  ineligibleReason?: string;
}) {
  const canSelect = row.getCanSelect();

  return (
    <>
      {/* Accent bar. The row <td> is position:relative whenever selection is on. */}
      <div
        className={cn(
          'absolute bottom-0 start-0 top-0 hidden w-0.5 bg-primary',
          row.getIsSelected() && 'block'
        )}
      />
      <Checkbox
        aria-label={`Select ${label}`}
        checked={row.getIsSelected()}
        disabled={!canSelect}
        size="sm"
        title={canSelect ? undefined : ineligibleReason}
        // Rows carry links and their own action menus; a checkbox click must not
        // bubble into either.
        onClick={(event) => event.stopPropagation()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    </>
  );
}

/**
 * Builds the checkbox column.
 *
 * Lives in the kit and is prepended by `useListTable`, so a module never adds a
 * select column to its own `ColumnDef[]` — nine hand-written copies is exactly
 * what the shared table exists to prevent.
 */
export function createSelectionColumn<TData>(config: ListSelectionConfig<TData>): ColumnDef<TData> {
  return {
    cell: ({ row }) => (
      <SelectRowCell
        ineligibleReason={config.ineligibleReason}
        label={config.getRowLabel(row.original)}
        row={row}
      />
    ),
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => <SelectAllHeader table={table} />,
    id: SELECTION_COLUMN_ID,
    meta: {
      cellClassName: 'w-11',
      headerClassName: 'w-11',
      skeleton: <Skeleton className="size-4 rounded-sm" />,
    },
    size: 44,
  };
}
