import type { ComponentType, ReactNode } from 'react';

import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
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
  /**
   * Human name for this filter, used by the active-filter chips. Falls back to
   * the control's own placeholder, then to the key — so a filter with a visible
   * placeholder rarely needs to set it, and a `hidden` filter always should.
   */
  label?: string;
  /** API request key, when the backend names it differently (e.g. `size` vs `limit`). */
  apiKey?: string;
  /** Parse a raw URL value into the typed value. Return `undefined` to treat it as unset. */
  parse?: (raw: string | null) => TValue | undefined;
  /** Serialize back to a URL value. Return `undefined` to drop the param entirely. */
  serialize?: (value: TValue) => string | undefined;
  /**
   * Convert the URL string into whatever the API expects. URL values are always
   * strings; a request body may want a boolean or a number.
   */
  toApiValue?: (value: TValue) => unknown;
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
  /**
   * A control that lives in the filter row but is not a filter: a view toggle, a
   * sort select. It reaches the URL and renders in order with everything else,
   * but `clearFilters` leaves it alone and it never counts toward
   * `hasActiveFilters` — clearing a filter set should not throw the user back to
   * list view or reset how the list is sorted.
   */
  persistent?: boolean;
}

export interface SearchScopeConfig {
  /** URL key holding the scope. Owned by the search filter, cleared with it. */
  key: string;
  options: FilterOption[];
  /** The scope that means "no narrowing". Omitted from the URL when active. */
  defaultValue: string;
  /** Placeholder per scope, so the input says what it will search. */
  placeholders?: Record<string, string>;
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
  /**
   * A segmented control inside the input, narrowing what the search covers —
   * Files searches either the current folder or everything. Inline rather than a
   * popover on focus, which is what Files did and nothing else in the app does.
   */
  scope?: SearchScopeConfig;
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

/**
 * Shared by both multi-value pickers.
 *
 * A multi filter's value is a **comma-separated string**, not an array. Two
 * constraints force it and they meet in the middle: `useUrlParamPatch` writes
 * with `URLSearchParams.set`, one value per key, so a repeated param cannot be
 * written; and the API's `paginationMiddleware` reads through Hono's
 * `c.req.query()`, which returns only the *first* value of a repeated key, so a
 * repeated param could not be read either. CSV is the shape both ends already
 * agreed on before this kind existed — see `csvNanoIdsSchema` in the API.
 *
 * Keeping the value a string is also what lets these kinds drop into the
 * existing schema untouched: `rawValues`, `clearFilters`, `hasActiveFilters` and
 * the chips all keep working on `string | undefined`. Read the parsed list off
 * `state.listValues[key]`, or with `parseMultiValue`.
 */
interface MultiSelectFilterBase<TKey extends string, TData>
  extends FilterBase<TKey, string, TData> {
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /**
   * Selected labels shown before the rest collapse into a `+N more` badge.
   * Defaults to 1 — the trigger sits on a 32px header row and must not grow.
   */
  maxVisibleSelectedOptions?: number;
  overflowLabel?: (count: number) => string;
  isLoading?: boolean;
  /** Width wrapper, e.g. `w-full sm:w-52`. */
  className?: string;
}

/**
 * A multi-value select over a fixed option set, searched in the browser.
 *
 * For options that arrive whole — a lookup table, an enum. When the option list
 * is paginated, use `infiniteMultiSelect` instead.
 */
export interface MultiSelectFilterDef<
  TKey extends string = string,
  TData = unknown,
> extends MultiSelectFilterBase<TKey, TData> {
  kind: 'multiSelect';
  options: FilterOption[];
}

/**
 * A multi-value picker backed by its own paginated query.
 *
 * The infinite-scroll twin of `infiniteSelect`. Like it, the definition carries
 * the query's state and callbacks rather than owning them.
 */
export interface InfiniteMultiSelectFilterDef<
  TKey extends string = string,
  TData = unknown,
> extends MultiSelectFilterBase<TKey, TData> {
  kind: 'infiniteMultiSelect';
  options: InfiniteMultiSearchSelectOption[];
  search: string;
  onSearchChange: (value: string) => void;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onFetchNextPage?: () => void;
  /**
   * Labels for values the loaded pages do not contain.
   *
   * A single-value picker can recover its label from the rows on screen. A
   * multi-value one cannot: filter by three vendors and the third may own no row
   * on this page, so its badge would read as a raw id — and on a deep link, before
   * the first page lands, every badge would. Resolve the selected ids against
   * their own source and pass the results here.
   */
  selectedOptions?: InfiniteMultiSearchSelectOption[];
}

/**
 * A from/to pair owning two URL keys. `key` holds the start, `toKey` the end.
 */
export interface DateRangeFilterDef<
  TKey extends string = string,
  TData = unknown,
> extends FilterBase<TKey, string, TData> {
  kind: 'dateRange';
  toKey: string;
  toApiKey?: string;
  fromLabel?: string;
  toLabel?: string;
  /** Trigger text while empty, and the panel heading. */
  placeholder?: string;
  /** One line under the heading. */
  description?: string;
  className?: string;
}

/**
 * A filter with no control of its own. Arrives by deep link, participates in the
 * request params and in `clearFilters`, and renders nothing.
 */
export interface HiddenFilterDef<TKey extends string = string, TData = unknown> extends FilterBase<
  TKey,
  string,
  TData
> {
  kind: 'hidden';
}

/**
 * A from/to date pair behind a single trigger, with presets.
 *
 * Owns the same two keys as `dateRange`; the difference is the control. Prefer
 * this one — two bare date inputs eat two slots of a header row and offer no
 * "last 7 days".
 */
export interface DateRangePopoverFilterDef<
  TKey extends string = string,
  TData = unknown,
> extends FilterBase<TKey, string, TData> {
  kind: 'dateRangePopover';
  toKey: string;
  toApiKey?: string;
  /** Trigger text when nothing is picked, and the panel heading. */
  placeholder?: string;
  /** One line under the heading. */
  description?: string;
  presets?: readonly { label: string; getValue: () => { from: Date; to: Date } }[];
  /** Latest selectable day. Defaults to today. */
  maxDate?: Date;
  className?: string;
}

/** A segmented single-choice control. For view modes and short option sets. */
export interface ToggleGroupFilterDef<
  TKey extends string = string,
  TValue extends string = string,
  TData = unknown,
> extends FilterBase<TKey, TValue, TData> {
  kind: 'toggleGroup';
  options: (FilterOption & { icon?: ComponentType<LucideProps>; ariaLabel?: string })[];
  /** Show the icon only, with the label as the accessible name. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * A min/max number pair owning two URL keys. `key` holds the minimum, `toKey`
 * the maximum.
 */
export interface NumberRangeFilterDef<
  TKey extends string = string,
  TData = unknown,
> extends FilterBase<TKey, string, TData> {
  kind: 'numberRange';
  toKey: string;
  toApiKey?: string;
  minLabel?: string;
  maxLabel?: string;
  step?: string;
  /** Trigger text while empty, and the panel heading. Defaults to `label`. */
  placeholder?: string;
  /** One line under the heading. */
  description?: string;
  /** A currency mark or unit rendered inside each field, e.g. `$`. */
  prefix?: string;
  /** Formats each end for the trigger summary. Defaults to the raw value. */
  formatValue?: (value: string) => string;
  className?: string;
}

/**
 * A select bound to the list's sort, not to a filter.
 *
 * Sorting already lives in `ListState`, so this control writes through
 * `setSort` rather than owning a key of its own. For lists that sort from the
 * header instead of from column headers — Files does, and its grid view has no
 * column headers to click.
 */
export interface SortSelectFilterDef<
  TKey extends string = string,
  TData = unknown,
> extends FilterBase<TKey, string, TData> {
  kind: 'sortSelect';
  options: FilterOption[];
  placeholder?: string;
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
  | MultiSelectFilterDef<string, TData>
  | InfiniteMultiSelectFilterDef<string, TData>
  | DateRangeFilterDef<string, TData>
  | DateRangePopoverFilterDef<string, TData>
  | ToggleGroupFilterDef<string, string, TData>
  | NumberRangeFilterDef<string, TData>
  | SortSelectFilterDef<string, TData>
  | HiddenFilterDef<string, TData>
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
  TField extends string = string,
> {
  filters: TDefs;
  /**
   * Omit it for a list whose API does not sort — the QuickBooks register returns
   * one fixed order. The list then declares no sort fields, so no column renders
   * a sort control and neither sort param is sent.
   */
  sort?: SortConfig<TField>;
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
