import type { ReactNode } from 'react';

import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderTabs,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Skeleton } from '@/app/components/ui/skeleton';

import type { AnyFilterDef } from './types';
import type { ListState } from './use-list-state';

const ALL_VALUE = 'all';

/**
 * Shared trigger styling so pickers sit flush with the other header controls
 * instead of each page restating the same class string.
 */
const dataTableFilterTriggerClassName =
  'h-8 rounded-md !border-table-card-header-foreground/25 !bg-card-header !text-xs !font-medium !text-table-card-header-foreground shadow-xs shadow-black/10 hover:!border-table-card-header-foreground/40 hover:!bg-card-header [&_svg]:!text-table-card-header-foreground';

const dataTableFilterPlaceholderClassName = '!text-table-card-header-foreground/75';

interface DataTableFiltersProps<
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string,
> {
  state: ListState<TDefs, TField>;
  /** Rendered to the left of the controls. Tabs take this slot automatically. */
  title?: ReactNode;
  /** Extra controls appended after the schema-driven ones. */
  actions?: ReactNode;
}

/**
 * Renders a filter schema into the shared table card header.
 *
 * Control order is fixed — tabs occupy the title slot, then search, then selects,
 * then custom controls, then the clear button — so every list in the app reads
 * the same way without each module re-deciding its own layout.
 */
export function DataTableFilters<
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string,
>({ state, title, actions }: DataTableFiltersProps<TDefs, TField>) {
  const { filters, hasActiveFilters, rawValues, searchInput, setFilterValue, setSearchInput } =
    state;

  const schema = filters as readonly AnyFilterDef<never>[];
  const tabsDef = schema.find((def) => def.kind === 'tabs');
  const controls = schema.filter((def) => def.kind !== 'tabs');

  const titleContent =
    title ??
    (tabsDef ? (
      <TableCardHeaderTabs
        activeValue={rawValues[tabsDef.key]}
        isLoading={tabsDef.isLoading}
        tabs={[{ label: 'All', value: undefined }, ...tabsDef.options]}
        onChange={(value) => setFilterValue(tabsDef.key, value)}
      />
    ) : undefined);

  return (
    <TableCardHeader
      title={titleContent}
      actions={
        <TableCardHeaderToolbar className="flex-wrap">
          {controls.map((def) => {
            if (def.kind === 'search') {
              return (
                <TableCardHeaderSearch
                  key={def.key}
                  className={def.className}
                  placeholder={def.placeholder}
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
                return <Skeleton key={def.key} className="h-8 w-full sm:w-44" />;
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
                    placeholderClassName={dataTableFilterPlaceholderClassName}
                    search={def.search}
                    searchPlaceholder={def.searchPlaceholder}
                    triggerClassName={dataTableFilterTriggerClassName}
                    value={rawValues[def.key] ?? null}
                    onFetchNextPage={def.onFetchNextPage}
                    onSearchChange={def.onSearchChange}
                    onValueChange={(value) => setFilterValue(def.key, value ?? undefined)}
                  />
                </div>
              );
            }

            if (def.kind === 'custom') {
              return (
                <span key={def.key}>
                  {def.render({
                    clearAll: state.clearFilters,
                    setValue: (value) => setFilterValue(def.key, value),
                    value: rawValues[def.key],
                  })}
                </span>
              );
            }

            return null;
          })}

          {actions}

          <TableCardHeaderClearButton active={hasActiveFilters} onClick={state.clearFilters} />
        </TableCardHeaderToolbar>
      }
    />
  );
}
