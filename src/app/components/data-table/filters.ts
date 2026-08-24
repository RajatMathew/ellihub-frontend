import type {
  AnyFilterDef,
  CustomFilterDef,
  DateRangeFilterDef,
  DateRangePopoverFilterDef,
  HiddenFilterDef,
  InfiniteSelectFilterDef,
  NumberRangeFilterDef,
  SearchFilterDef,
  SelectFilterDef,
  SortSelectFilterDef,
  TabsFilterDef,
  ToggleGroupFilterDef,
} from './types';

/**
 * Builders for filter schemas.
 *
 * These exist so a filter is declared as data rather than JSX. Each builder
 * infers its `key` as a string literal, which is what lets `useListState`
 * return a typed `values` object without the caller writing `as const`.
 *
 * @example
 * const VENDOR_FILTERS = [
 *   f.search({ placeholder: 'Search vendors...' }),
 *   f.tabs({ key: 'type', options: typeTabs }),
 *   f.select({ key: 'status', placeholder: 'All Statuses', options: STATUS_OPTIONS }),
 * ];
 */

function search<TData = unknown>(
  def: Omit<SearchFilterDef<'search', TData>, 'kind' | 'key'> & { key?: 'search' }
): SearchFilterDef<'search', TData> {
  return { ...def, key: 'search', kind: 'search' };
}

function select<TKey extends string, TValue extends string = string, TData = unknown>(
  def: Omit<SelectFilterDef<TKey, TValue, TData>, 'kind'>
): SelectFilterDef<TKey, TValue, TData> {
  return { ...def, kind: 'select' };
}

function tabs<TKey extends string, TValue extends string = string, TData = unknown>(
  def: Omit<TabsFilterDef<TKey, TValue, TData>, 'kind'>
): TabsFilterDef<TKey, TValue, TData> {
  return { ...def, kind: 'tabs' };
}

function infiniteSelect<TKey extends string, TData = unknown>(
  def: Omit<InfiniteSelectFilterDef<TKey, TData>, 'kind'>
): InfiniteSelectFilterDef<TKey, TData> {
  return { ...def, kind: 'infiniteSelect' };
}

function dateRange<TKey extends string, TData = unknown>(
  def: Omit<DateRangeFilterDef<TKey, TData>, 'kind'>
): DateRangeFilterDef<TKey, TData> {
  return { ...def, kind: 'dateRange' };
}

function hidden<TKey extends string, TData = unknown>(
  def: Omit<HiddenFilterDef<TKey, TData>, 'kind'>
): HiddenFilterDef<TKey, TData> {
  return { ...def, kind: 'hidden' };
}

function dateRangePopover<TKey extends string, TData = unknown>(
  def: Omit<DateRangePopoverFilterDef<TKey, TData>, 'kind'>
): DateRangePopoverFilterDef<TKey, TData> {
  return { ...def, kind: 'dateRangePopover' };
}

function toggleGroup<TKey extends string, TValue extends string = string, TData = unknown>(
  // `defaultValue` is wrapped in `NoInfer` so a literal default cannot narrow
  // `TValue` to itself — `defaultValue: 'list'` would otherwise make the whole
  // definition `ToggleGroupFilterDef<'view', 'list'>`, which no longer fits the
  // `AnyFilterDef` union.
  def: Omit<ToggleGroupFilterDef<TKey, TValue, TData>, 'kind' | 'defaultValue'> & {
    defaultValue?: NoInfer<TValue>;
  }
): ToggleGroupFilterDef<TKey, TValue, TData> {
  return { ...def, kind: 'toggleGroup' } as ToggleGroupFilterDef<TKey, TValue, TData>;
}

function numberRange<TKey extends string, TData = unknown>(
  def: Omit<NumberRangeFilterDef<TKey, TData>, 'kind'>
): NumberRangeFilterDef<TKey, TData> {
  return { ...def, kind: 'numberRange' };
}

function sortSelect<TKey extends string = 'sortBy', TData = unknown>(
  def: Omit<SortSelectFilterDef<TKey, TData>, 'kind' | 'key' | 'persistent'> & { key?: TKey }
): SortSelectFilterDef<TKey, TData> {
  // Writes through `setSort`, not through a key of its own, so it must never be
  // swept up by `clearFilters` or counted as an active filter.
  return { ...def, key: (def.key ?? 'sortBy') as TKey, kind: 'sortSelect', persistent: true };
}

function custom<TKey extends string, TData = unknown>(
  def: Omit<CustomFilterDef<TKey, TData>, 'kind'>
): CustomFilterDef<TKey, TData> {
  return { ...def, kind: 'custom' };
}

export const f = {
  custom,
  dateRange,
  dateRangePopover,
  hidden,
  infiniteSelect,
  numberRange,
  search,
  select,
  sortSelect,
  tabs,
  toggleGroup,
};

/**
 * Every URL key a filter owns.
 *
 * Most own one. A range owns two, and a search with a scope segment owns its own
 * key plus the scope's — the scope belongs to the search, so it is cleared with
 * it rather than lingering after the text is gone.
 */
export function filterUrlKeys(def: AnyFilterDef<never>): string[] {
  if (def.kind === 'dateRange' || def.kind === 'dateRangePopover' || def.kind === 'numberRange') {
    return [def.key, def.toKey];
  }

  if (def.kind === 'search' && def.scope) return [def.key, def.scope.key];

  // A sort select writes through `setSort`; it owns nothing.
  if (def.kind === 'sortSelect') return [];

  return [def.key];
}

/** Whether `clearFilters` and `hasActiveFilters` should see this filter at all. */
export function isClearableFilter(def: AnyFilterDef<never>): boolean {
  return !def.persistent;
}

/** The API request key for a filter, falling back to its URL key. */
export function filterApiKey(def: AnyFilterDef<never>): string {
  return def.apiKey ?? def.key;
}

/**
 * Read one filter's value out of the URL, applying its parser and treating its
 * `defaultValue` as unset.
 */
export function readFilterValue(
  def: AnyFilterDef<never>,
  searchParams: URLSearchParams
): string | undefined {
  const raw = searchParams.get(def.key);
  const parsed = def.parse ? def.parse(raw) : (raw ?? undefined);

  if (parsed === undefined || parsed === '') return undefined;
  if (def.defaultValue !== undefined && parsed === def.defaultValue) return undefined;

  return parsed;
}

/** Serialize a filter value for the URL, collapsing "unset" to `undefined`. */
export function writeFilterValue(
  def: AnyFilterDef<never>,
  value: string | undefined
): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (def.defaultValue !== undefined && value === def.defaultValue) return undefined;

  return def.serialize ? def.serialize(value) : value;
}
