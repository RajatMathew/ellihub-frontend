import type {
  AnyFilterDef,
  CustomFilterDef,
  DateRangeFilterDef,
  DateRangePopoverFilterDef,
  HiddenFilterDef,
  InfiniteMultiSelectFilterDef,
  InfiniteSelectFilterDef,
  MultiSelectFilterDef,
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

function multiSelect<TKey extends string, TData = unknown>(
  def: Omit<MultiSelectFilterDef<TKey, TData>, 'kind'>
): MultiSelectFilterDef<TKey, TData> {
  return { ...def, kind: 'multiSelect' };
}

function infiniteMultiSelect<TKey extends string, TData = unknown>(
  def: Omit<InfiniteMultiSelectFilterDef<TKey, TData>, 'kind'>
): InfiniteMultiSelectFilterDef<TKey, TData> {
  return { ...def, kind: 'infiniteMultiSelect' };
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
  infiniteMultiSelect,
  infiniteSelect,
  multiSelect,
  numberRange,
  search,
  select,
  sortSelect,
  tabs,
  toggleGroup,
};

/**
 * Whether this filter holds several values in one comma-separated URL param.
 *
 * The kit branches on this rather than on each kind, so adding a third multi
 * control does not mean revisiting `readFilterValue`, the chips and the
 * client-side predicates.
 */
export function isMultiFilter(def: AnyFilterDef<never>): boolean {
  return def.kind === 'multiSelect' || def.kind === 'infiniteMultiSelect';
}

/**
 * Reads a multi filter's URL value as a list.
 *
 * Order is preserved and duplicates are dropped, so `?vendorId=a,,b,a` and
 * `?vendorId=a,b` are the same selection — and, more usefully, the same React
 * Query cache key.
 */
export function parseMultiValue(raw: string | undefined): string[] {
  if (!raw) return [];

  const seen = new Set<string>();

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (trimmed) seen.add(trimmed);
  }

  return [...seen];
}

/** Writes a list back to its URL value. An empty selection drops the param. */
export function serializeMultiValue(values: readonly string[]): string | undefined {
  const joined = parseMultiValue(values.join(','));
  return joined.length > 0 ? joined.join(',') : undefined;
}

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

  // A multi filter is normalised on the way in as well as out, so a value typed
  // or pasted into the address bar reaches the request in the one canonical
  // form. Without this, `?vendorId=a,b` and `?vendorId=b,a,b` are the same
  // filter but two React Query cache entries and two API round trips.
  if (isMultiFilter(def)) return serializeMultiValue(parseMultiValue(parsed));

  return parsed;
}

/** Serialize a filter value for the URL, collapsing "unset" to `undefined`. */
export function writeFilterValue(
  def: AnyFilterDef<never>,
  value: string | undefined
): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (def.defaultValue !== undefined && value === def.defaultValue) return undefined;

  // Deselecting the last option leaves an empty list, which is "no filter" —
  // not "match nothing". `serializeMultiValue` collapses it to `undefined` so
  // the param is dropped rather than written as a bare `?vendorId=`.
  if (isMultiFilter(def)) {
    const normalized = serializeMultiValue(parseMultiValue(value));
    if (normalized === undefined) return undefined;
    return def.serialize ? def.serialize(normalized) : normalized;
  }

  return def.serialize ? def.serialize(value) : value;
}
