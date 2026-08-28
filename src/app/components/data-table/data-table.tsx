import type { ComponentType, ReactNode } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import type { DataGridProps } from '@/app/components/ui/data-grid';
import { SearchX, type LucideProps } from 'lucide-react';

import { DataTableBulkBar, type DataTableItemLabel } from './data-table-bulk-bar';
import { DataTableFilters } from './data-table-filters';
import type { AnyFilterDef } from './types';
import type { ListState } from './use-list-state';
import type { ListTable } from './use-list-table';

export interface DataTableEmptyState {
  /**
   * The icon component itself, not an element — the kit sizes and tints it, so
   * every empty state in the app matches without each page restating the class.
   */
  icon: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Shown instead of `empty` when filters are active and nothing matched.
 *
 * A list with filters applied and no results is not the same state as a list
 * with no records: the first-run copy ("No vendors yet — click Add Vendor")
 * names the wrong problem and offers the wrong action. Only `title` and
 * `description` are worth overriding; the icon and the Clear-filters action are
 * the same on every list, so the kit supplies them.
 */
export interface DataTableFilteredEmptyState {
  title?: string;
  description?: string;
}

export interface DataTableProps<
  TData extends object,
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string = string,
> {
  list: ListTable<TData>;
  state: ListState<TDefs, TField>;
  /**
   * Accessible name for the table, e.g. "Departments". Required, not optional:
   * rules/accessibility.md mandates it and an optional prop is one nobody passes.
   */
  ariaLabel: string;
  empty: DataTableEmptyState;
  /** Overrides the copy shown when filters match nothing. */
  filteredEmpty?: DataTableFilteredEmptyState;
  error: { title: string; description?: string };
  /**
   * Render these filter definitions instead of `state.filters` — same keys, live
   * data attached. See `DataTableFilters`.
   */
  filters?: readonly AnyFilterDef<never>[];
  /**
   * Names the list. A string takes the shared title treatment; a node is
   * rendered as given, for a header that is genuinely its own thing. Omit both
   * and a `tabs` filter takes the slot.
   */
  title?: ReactNode;
  /** Second line under a string title. */
  titleDescription?: ReactNode;
  /** Extra controls in the header's trailing slot, beside Clear. */
  headerTrailing?: ReactNode;
  /**
   * Pinned above the filter header, inside the card.
   *
   * For a control the list is scoped *by* rather than filtered by — the register
   * cannot show a row until an account is picked, so its picker is not one
   * control among the filters and must not be swept up by Clear.
   */
  banner?: ReactNode;
  /** Hides the active-filter chip row. */
  hideFilterChips?: boolean;
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
  /**
   * Card-per-row rendering below the breakpoint. Omit for a scrolling table.
   * The second argument is the row's selection checkbox, or null when the table
   * has no selection — render it so a card layout does not silently lose the
   * ability to select.
   */
  mobileItem?: (row: TData, selectionCheckbox: ReactNode) => ReactNode;
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
  TField extends string = string,
>({
  list,
  state,
  ariaLabel,
  filters,
  empty,
  filteredEmpty,
  error,
  title,
  titleDescription,
  headerTrailing,
  banner,
  hideFilterChips,
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

  const schema = (filters ?? state.filters) as readonly AnyFilterDef<never>[];

  // Fire onClear from the *rendered* schema: when a page attaches live data via
  // the `filters` override, that copy is the one holding the real callbacks.
  // Owned here rather than in the header, because the filtered-empty state needs
  // the same action.
  const clearAll = () => {
    for (const def of schema) def.onClear?.();
    state.clearFilters();
  };

  // A filtered list with no rows is its own state, and it is not "no records".
  const isFilteredEmpty =
    state.hasActiveFilters && !list.isInitialLoading && !list.isError && list.totalCount === 0;

  const activeEmpty: DataTableEmptyState = isFilteredEmpty
    ? {
        action: (
          <Button className="mt-1" size="sm" variant="outline" onClick={clearAll}>
            Clear filters
          </Button>
        ),
        description:
          filteredEmpty?.description ??
          'Try a different search, or clear the filters to start over.',
        icon: SearchX,
        title: filteredEmpty?.title ?? 'No matching results',
      }
    : empty;

  return (
    <Card className={className}>
      {banner}

      {showBulkBar ? (
        <DataTableBulkBar
          actions={bulkActions}
          count={list.selection.count}
          itemLabel={bulkItemLabel}
          onClear={list.selection.clear}
        />
      ) : (
        <DataTableFilters
          description={titleDescription}
          hideChips={hideFilterChips}
          isTitleLoading={list.isInitialLoading}
          schema={filters}
          state={state}
          title={title}
          trailing={headerTrailing}
          onClearAll={clearAll}
        />
      )}

      {replaceBody ?? (
        <DataGridSection
          emptyAction={activeEmpty.action}
          emptyDescription={activeEmpty.description}
          emptyIcon={activeEmpty.icon}
          emptyTitle={activeEmpty.title}
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
