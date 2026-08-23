import type { ReactNode } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import { Card } from '@/app/components/ui/card';
import type { DataGridProps } from '@/app/components/ui/data-grid';

import { DataTableBulkBar, type DataTableItemLabel } from './data-table-bulk-bar';
import { DataTableFilters } from './data-table-filters';
import type { AnyFilterDef } from './types';
import type { ListState } from './use-list-state';
import type { ListTable } from './use-list-table';

export interface DataTableEmptyState {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface DataTableProps<
  TData extends object,
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string,
> {
  list: ListTable<TData>;
  state: ListState<TDefs, TField>;
  /**
   * Accessible name for the table, e.g. "Departments". Required, not optional:
   * rules/accessibility.md mandates it and an optional prop is one nobody passes.
   */
  ariaLabel: string;
  empty: DataTableEmptyState;
  error: { title: string; description?: string };
  /**
   * Render these filter definitions instead of `state.filters` — same keys, live
   * data attached. See `DataTableFilters`.
   */
  filters?: readonly AnyFilterDef<never>[];
  /** Overrides the schema-driven title slot (tabs, by default). */
  title?: ReactNode;
  /**
   * Buttons for the rows currently selected — a Delete, typically. Rendered in a
   * bar that takes over the header while a selection is live; the count and the
   * Clear control come with it. Requires `selection` on `useListTable`, and
   * should already be gated on the user's permission to run the action.
   */
  bulkActions?: ReactNode;
  /** Names the records in the bar, e.g. `{ one: 'vendor', many: 'vendors' }`. */
  bulkItemLabel?: DataTableItemLabel;
  /**
   * Rendered in place of the table body and pagination. For states where the
   * list cannot exist at all — an unconnected integration, say — rather than
   * for an empty result, which `empty` already covers.
   */
  replaceBody?: ReactNode;
  /** Card-per-row rendering below the breakpoint. Omit for a scrolling table. */
  mobileItem?: (row: TData) => ReactNode;
  mobileBreakpoint?: 'lg' | 'xl' | '2xl';
  tableLayout?: DataGridProps<TData>['tableLayout'];
  tableClassNames?: DataGridProps<TData>['tableClassNames'];
  className?: string;
}

/**
 * A complete resource list: card, schema-driven header, table body and pagination.
 *
 * Composes the existing `DataGridSection` rather than replacing or overriding it.
 * If the body needs to change, change `DataGridSection` directly — do not fight it
 * from out here with className overrides.
 */
export function DataTable<
  TData extends object,
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string,
>({
  list,
  state,
  ariaLabel,
  filters,
  empty,
  error,
  title,
  bulkActions,
  bulkItemLabel,
  replaceBody,
  mobileItem,
  mobileBreakpoint,
  tableLayout,
  tableClassNames,
  className,
}: DataTableProps<TData, TDefs, TField>) {
  const showBulkBar = Boolean(bulkActions) && list.selection.count > 0;

  return (
    <Card className={className}>
      {showBulkBar ? (
        <DataTableBulkBar
          actions={bulkActions}
          count={list.selection.count}
          itemLabel={bulkItemLabel}
          onClear={list.selection.clear}
        />
      ) : (
        <DataTableFilters filters={filters} state={state} title={title} />
      )}

      {replaceBody ?? (
        <DataGridSection
          emptyAction={empty.action}
          emptyDescription={empty.description}
          emptyIcon={empty.icon}
          emptyTitle={empty.title}
          errorDescription={error.description}
          errorTitle={error.title}
          isError={list.isError}
          isLoading={list.isInitialLoading}
          isRefreshing={list.isRefreshing}
          mobileBreakpoint={mobileBreakpoint}
          mobileItem={mobileItem}
          table={list.table}
          tableAriaLabel={ariaLabel}
          tableClassNames={tableClassNames}
          tableLayout={tableLayout}
          totalCount={list.totalCount}
          onRetry={list.retry}
        />
      )}
    </Card>
  );
}
