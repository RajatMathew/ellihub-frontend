import type { ReactNode } from 'react';

import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderFilters,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderTabs,
  TableCardHeaderTitle,
  TableCardHeaderTrailing,
} from '@/app/components/table-card-header';
import { InfiniteMultiSearchSelect } from '@/app/components/ui/infinite-multi-search-select';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';

import { collectActiveFilterChips } from './active-filter-chips';
import { DataTableFilterChips } from './data-table-chips';
import {
  DateRangeControl,
  DateRangePopoverControl,
  MultiSelectControl,
  NumberRangeControl,
  SortSelectControl,
  ToggleGroupControl,
} from './data-table-controls';
import { parseMultiValue } from './filters';
import type { AnyFilterDef } from './types';
import type { ListState } from './use-list-state';

const ALL_VALUE = 'all';


/**
 * Controls carry no colour here: the header stamps `data-surface="card-header"`
 * and the token block in globals.css remaps the palette for the subtree. All a
 * control needs is `size="toolbar"` — the 32px row this header sits on — and its
 * width. See docs/table-consistency-plan.md, phase 1.
 */
const dataTableFilterShadowClassName = 'shadow-xs shadow-black/10';

/**
 * The multi pickers need one addition to the above.
 *
 * Their selected values render as badges *on* the trigger rather than in the
 * header, so they sit outside the `data-surface="card-header"` token scope and
 * do not inherit its palette. Everything else about the control still does.
 */
const dataTableMultiFilterTriggerClassName = cn(
  dataTableFilterShadowClassName,
  '[&_[data-slot=badge]]:border-primary-alpha [&_[data-slot=badge]]:bg-primary-soft [&_[data-slot=badge]]:text-primary-soft-foreground'
);

/**
 * The order controls are rendered in, by kind.
 *
 * Order is a property of the kind, decided once here. Previously it was implicit
 * in schema order, so a page could reorder its own header by rearranging its
 * array and no two lists were guaranteed to read the same way. Tabs are absent
 * because they occupy the title slot instead.
 */
const CONTROL_ORDER: Record<string, number> = {
  search: 0,
  select: 1,
  // Beside their single-value twins: whether a filter takes one value or several
  // is a property of the filter, not a reason to move it in the row. A list that
  // widens its vendor picker to multi must not have its header reshuffle.
  multiSelect: 1,
  infiniteSelect: 2,
  infiniteMultiSelect: 2,
  numberRange: 3,
  dateRange: 4,
  dateRangePopover: 4,
  custom: 5,
  // Not filters: they sort or switch the view, so they sit after everything that
  // narrows the list.
  sortSelect: 6,
  toggleGroup: 7,
  hidden: 8,
};

function controlRank(def: AnyFilterDef<never>): number {
  return CONTROL_ORDER[def.kind] ?? 99;
}

interface DataTableFiltersProps<
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string = string,
> {
  state: ListState<TDefs, TField>;
  /**
   * Render these definitions instead of `state.filters` — same keys, live data
   * attached. Omit it and the state's own schema is used.
   */
  schema?: readonly AnyFilterDef<never>[];
  /** Clears every filter, including companion local state. Owned by `DataTable`. */
  onClearAll: () => void;
  /**
   * A string is rendered with the shared title treatment; a node is rendered as
   * given, for the rare header that is genuinely its own thing. Tabs take this
   * slot automatically when neither is supplied.
   */
  title?: ReactNode;
  /** Second line under a string title. */
  description?: ReactNode;
  /** Holds the title's shape with a skeleton while the list's first page loads. */
  isTitleLoading?: boolean;
  /** Extra controls for the trailing slot, beside Clear. */
  trailing?: ReactNode;
  /** Hides the active-filter chip row. */
  hideChips?: boolean;
}

/**
 * Renders a filter schema into the shared table card header.
 *
 * Slot order is fixed — tabs or a title, then the controls in `CONTROL_ORDER`,
 * then the trailing group holding Clear — so every list in the app reads the same
 * way without each module re-deciding its own layout.
 */
export function DataTableFilters<
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string = string,
>({
  state,
  schema: schemaOverride,
  onClearAll,
  title,
  description,
  isTitleLoading,
  trailing,
  hideChips,
}: DataTableFiltersProps<TDefs, TField>) {
  const {
    hasActiveFilters,
    rawValues,
    searchInput,
    setFilterListValue,
    setFilterValue,
    setFilterValues,
    setSearchInput,
  } = state;

  // The one cast in the renderer. A schema is a tuple of concrete definitions;
  // the union it belongs to cannot be proven from the tuple's own variance.
  const defs = (schemaOverride ?? state.filters) as readonly AnyFilterDef<never>[];

  const tabsDef = defs.find((def) => def.kind === 'tabs');
  const controls = defs
    .filter((def) => def.kind !== 'tabs')
    .slice()
    .sort((a, b) => controlRank(a) - controlRank(b));

  const titleContent =
    typeof title === 'string' ? (
      <TableCardHeaderTitle description={description} isLoading={isTitleLoading}>
        {title}
      </TableCardHeaderTitle>
    ) : (
      (title ??
      (tabsDef ? (
        <TableCardHeaderTabs
          activeValue={rawValues[tabsDef.key]}
          isLoading={tabsDef.isLoading}
          tabs={[{ label: 'All', value: undefined }, ...tabsDef.options]}
          onChange={(value) => setFilterValue(tabsDef.key, value)}
        />
      ) : undefined))
    );

  const chips = hideChips ? [] : collectActiveFilterChips(defs, rawValues);

  return (
    <>
      <TableCardHeader
        title={titleContent}
        actions={
          <TableCardHeaderFilters>
            {controls.map((def) => {
              if (def.kind === 'search') {
                const scope = def.scope;
                const scopeValue = scope ? (rawValues[scope.key] ?? scope.defaultValue) : undefined;

                return (
                  <TableCardHeaderSearch
                    key={def.key}
                    className={def.className}
                    placeholder={
                      (scope && scopeValue && scope.placeholders?.[scopeValue]) || def.placeholder
                    }
                    scope={
                      scope && scopeValue
                        ? {
                            // Drop the default scope from the URL rather than
                            // writing it: otherwise the unfiltered state carries
                            // a param, and `hasActiveFilters` lights up Clear on
                            // a list nobody has filtered.
                            onChange: (value) =>
                              setFilterValue(
                                scope.key,
                                value === scope.defaultValue ? undefined : value
                              ),
                            // The segment labels are two words; the placeholder
                            // for that scope is the sentence that explains it.
                            options: scope.options.map((option) => ({
                              ...option,
                              title: scope.placeholders?.[option.value],
                            })),
                            value: scopeValue,
                          }
                        : undefined
                    }
                    value={searchInput}
                    onChange={setSearchInput}
                  />
                );
              }

              if (def.kind === 'select') {
                const allValue = def.allValue ?? ALL_VALUE;

                // Options often arrive from their own query. Hold the row's shape
                // with a skeleton rather than flashing an empty select.
                if (def.isLoading) {
                  return (
                    <Skeleton key={def.key} className={cn('h-8 w-full sm:w-44', def.className)} />
                  );
                }

                return (
                  <TableCardHeaderSelect
                    key={def.key}
                    className={def.className}
                    icon={def.icon}
                    options={[{ label: def.placeholder, value: allValue }, ...def.options]}
                    placeholder={def.placeholder}
                    value={rawValues[def.key] ?? allValue}
                    onValueChange={(value) =>
                      setFilterValue(def.key, value === allValue ? undefined : value)
                    }
                  />
                );
              }

              if (def.kind === 'dateRange') {
                return (
                  <DateRangeControl
                    key={def.key}
                    def={def}
                    from={rawValues[def.key]}
                    to={rawValues[def.toKey]}
                    onChange={setFilterValues}
                  />
                );
              }

              if (def.kind === 'infiniteSelect') {
                return (
                  <div className={def.className ?? 'w-full sm:w-52'} key={def.key}>
                    <InfiniteSearchSelect
                      emptyMessage={def.emptyMessage}
                      hasNextPage={def.hasNextPage}
                      isFetchingNextPage={def.isFetchingNextPage}
                      isLoading={def.isLoading}
                      options={def.options}
                      placeholder={def.placeholder}
                      search={def.search}
                      searchPlaceholder={def.searchPlaceholder}
                      size="toolbar"
                      triggerClassName={dataTableFilterShadowClassName}
                      value={rawValues[def.key] ?? null}
                      onFetchNextPage={def.onFetchNextPage}
                      onSearchChange={def.onSearchChange}
                      onValueChange={(value) => setFilterValue(def.key, value ?? undefined)}
                    />
                  </div>
                );
              }

              if (def.kind === 'multiSelect') {
                // Same reason `select` does it: options usually arrive from
                // their own query, and a skeleton holds the row's shape rather
                // than flashing an empty control.
                if (def.isLoading) {
                  return (
                    <Skeleton key={def.key} className={cn('h-8 w-full sm:w-52', def.className)} />
                  );
                }

                return (
                  <MultiSelectControl
                    key={def.key}
                    def={def}
                    values={parseMultiValue(rawValues[def.key])}
                    onChange={(values) => setFilterListValue(def.key, values)}
                  />
                );
              }

              if (def.kind === 'infiniteMultiSelect') {
                return (
                  <div className={def.className ?? 'w-full sm:w-52'} key={def.key}>
                    <InfiniteMultiSearchSelect
                      emptyMessage={def.emptyMessage ?? 'No results found.'}
                      hasNextPage={def.hasNextPage}
                      isFetchingNextPage={def.isFetchingNextPage}
                      isLoading={def.isLoading}
                      maxVisibleSelectedOptions={def.maxVisibleSelectedOptions}
                      options={def.options}
                      overflowLabel={def.overflowLabel}
                      placeholder={def.placeholder}
                      search={def.search}
                      searchPlaceholder={def.searchPlaceholder ?? 'Search...'}
                      selectedOptions={def.selectedOptions}
                      size="toolbar"
                      triggerClassName={dataTableMultiFilterTriggerClassName}
                      value={parseMultiValue(rawValues[def.key])}
                      onFetchNextPage={def.onFetchNextPage}
                      onSearchChange={def.onSearchChange}
                      onValueChange={(values) => setFilterListValue(def.key, values)}
                    />
                  </div>
                );
              }

              if (def.kind === 'dateRangePopover') {
                return (
                  <DateRangePopoverControl
                    key={def.key}
                    def={def}
                    from={rawValues[def.key]}
                    to={rawValues[def.toKey]}
                    onChange={setFilterValues}
                  />
                );
              }

              if (def.kind === 'numberRange') {
                return (
                  <NumberRangeControl
                    key={def.key}
                    def={def}
                    max={rawValues[def.toKey]}
                    min={rawValues[def.key]}
                    onChange={setFilterValues}
                  />
                );
              }

              if (def.kind === 'toggleGroup') {
                return (
                  <ToggleGroupControl
                    key={def.key}
                    def={def}
                    value={rawValues[def.key]}
                    onChange={(value) => setFilterValue(def.key, value)}
                  />
                );
              }

              if (def.kind === 'sortSelect') {
                return (
                  <SortSelectControl
                    key={def.key}
                    def={def}
                    value={state.sortBy}
                    onChange={(field) => state.setSort(field, state.sortOrder)}
                  />
                );
              }

              if (def.kind === 'custom') {
                return (
                  <span key={def.key}>
                    {def.render({
                      clearAll: onClearAll,
                      setValue: (value) => setFilterValue(def.key, value),
                      value: rawValues[def.key],
                    })}
                  </span>
                );
              }

              // 'hidden' filters deliberately render nothing. Their chip does.
              return null;
            })}
          </TableCardHeaderFilters>
        }
        trailing={
          <TableCardHeaderTrailing>
            {trailing}
            <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearAll} />
          </TableCardHeaderTrailing>
        }
      />

      <DataTableFilterChips
        chips={chips}
        onRemove={(keys) => {
          for (const key of keys) setFilterValue(key, undefined);
        }}
      />
    </>
  );
}
