import type {
  AnyFilterDef,
  CustomFilterDef,
  DateRangeFilterDef,
  HiddenFilterDef,
  InfiniteSelectFilterDef,
  SearchFilterDef,
  SelectFilterDef,
  TabsFilterDef,
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

function custom<TKey extends string, TData = unknown>(
  def: Omit<CustomFilterDef<TKey, TData>, 'kind'>
): CustomFilterDef<TKey, TData> {
  return { ...def, kind: 'custom' };
}

export const f = { custom, dateRange, hidden, infiniteSelect, search, select, tabs };

/** Every URL key a filter owns. A date range owns two. */
export function filterUrlKeys(def: AnyFilterDef<never>): string[] {
  return def.kind === 'dateRange' ? [def.key, def.toKey] : [def.key];
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
