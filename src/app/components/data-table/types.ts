import type { ComponentType, ReactNode } from 'react';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import type { LucideProps } from 'lucide-react';

export type SortOrder = 'asc' | 'desc';

export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Properties shared by every filter kind.
 *
 * A filter definition owns four things that were previously spread across a
 * page component, a params hook and a constants file: its URL key, its API key,
 * how it parses and serializes, and what counts as "unset". Because the
 * definition owns all four, `hasActiveFilters` and `clearFilters` are derived
 * rather than hand-maintained per module.
 */
interface FilterBase<TKey extends string, TValue, TData> {
  /** URL search-param key. Also this filter's identity in the values object. */
  key: TKey;
  /** API request key, when the backend names it differently (e.g. `size` vs `limit`). */
  apiKey?: string;
  /** Parse a raw URL value into the typed value. Return `undefined` to treat it as unset. */
  parse?: (raw: string | null) => TValue | undefined;
  /** Serialize back to a URL value. Return `undefined` to drop the param entirely. */
  serialize?: (value: TValue) => string | undefined;
  /** Treated as unset: omitted from the URL, the API request and `hasActiveFilters`. */
  defaultValue?: TValue;
  /**
   * When supplied, this filter is applied in memory against already-fetched rows
   * instead of being sent to the API. Orthogonal to the filter's kind — any
   * control can be client-side.
   */
  clientPredicate?: (row: TData, value: TValue) => boolean;
  /**
   * Called when this filter is cleared, individually or by `clearFilters`. For
   * controls that keep companion local state — a picker's own search box, say —
   * which the URL knows nothing about.
   */
  onClear?: () => void;
}

export interface SearchFilterDef<TKey extends string = string, TData = unknown> extends FilterBase<
  TKey,
  string,
  TData
> {
  kind: 'search';
  placeholder: string;
  /** Debounce applies to the draft input only; the URL always holds the committed value. */
  debounceMs?: number;
  className?: string;
}

export interface SelectFilterDef<
  TKey extends string = string,
  TValue extends string = string,
  TData = unknown,
> extends FilterBase<TKey, TValue, TData> {
  kind: 'select';
  placeholder: string;
  options: FilterOption[];
  icon?: ComponentType<LucideProps>;
  /** Sentinel option meaning "no filter". Defaults to `'all'`. */
  allValue?: string;
  isLoading?: boolean;
  className?: string;
}

export interface TabsFilterDef<
  TKey extends string = string,
  TValue extends string = string,
  TData = unknown,
> extends FilterBase<TKey, TValue, TData> {
  kind: 'tabs';
  options: FilterOption[];
  isLoading?: boolean;
}

/**
 * A picker backed by its own paginated query. The definition carries the query's
 * state and callbacks rather than owning them, so the page keeps control of how
 * the options are fetched.
 */
export interface InfiniteSelectFilterDef<
  TKey extends string = string,
  TData = unknown,
> extends FilterBase<TKey, string, TData> {
  kind: 'infiniteSelect';
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  options: InfiniteSearchSelectOption[];
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onFetchNextPage?: () => void;
  /** Width wrapper, e.g. `w-full sm:w-52`. */
  className?: string;
}

export interface CustomFilterDef<TKey extends string = string, TData = unknown> extends FilterBase<
  TKey,
  string,
  TData
> {
  kind: 'custom';
  render: (context: CustomFilterRenderContext) => ReactNode;
}

export interface CustomFilterRenderContext {
  value: string | undefined;
  setValue: (value: string | undefined) => void;
  clearAll: () => void;
}

export type AnyFilterDef<TData = unknown> =
  | SearchFilterDef<string, TData>
  | SelectFilterDef<string, string, TData>
  | TabsFilterDef<string, string, TData>
  | InfiniteSelectFilterDef<string, TData>
  | CustomFilterDef<string, TData>;

type FilterValueOf<TDef> = TDef extends FilterBase<string, infer TValue, unknown> ? TValue : never;

/** Maps a filter schema to the typed values object `useListState` returns. */
export type FilterValues<TDefs extends readonly AnyFilterDef<never>[]> = {
  [TDef in TDefs[number] as TDef['key']]?: FilterValueOf<TDef>;
};

export interface SortConfig<TField extends string = string> {
  /** Sortable field names. Anything else arriving from the URL falls back to `by`. */
  fields: readonly TField[];
  /** Default sort field. Omitted from the URL when active. */
  by: TField;
  /** Default sort direction. Omitted from the URL when active. */
  order?: SortOrder;
}

export interface ListStateConfig<
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string,
> {
  filters: TDefs;
  sort: SortConfig<TField>;
  /** Defaults to 10. Must be one of the shared page-size options. */
  pageSize?: number;
  /**
   * Rename the pagination and sorting params for backends that expect different
   * names. Filter params are renamed on the filter itself, via its `apiKey`.
   */
  apiKeys?: {
    page?: string;
    size?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}
