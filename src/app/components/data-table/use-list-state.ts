import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCancellableDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';

import { DEFAULT_PAGE_SIZE, DEFAULT_SEARCH_DEBOUNCE_MS } from './constants';
import {
  filterApiKey,
  filterUrlKeys,
  isClearableFilter,
  isMultiFilter,
  parseMultiValue,
  readFilterValue,
  serializeMultiValue,
  writeFilterValue,
} from './filters';
import type {
  AnyFilterDef,
  FilterValues,
  ListStateConfig,
  SearchFilterDef,
  SortOrder,
} from './types';

export interface ListState<
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string = string,
> {
  page: number;
  size: number;
  /** Empty on a list declared without `sort`, which sorts nowhere. */
  sortBy: TField;
  sortOrder: SortOrder;
  /** Committed filter values, keyed by each filter's `key`. */
  values: FilterValues<TDefs>;
  /**
   * The same values as an untyped record. Exists so the kit's own internals can
   * iterate the schema without re-casting `values` at every call site.
   */
  rawValues: Record<string, string | undefined>;
  /**
   * Multi-value filters parsed into lists, keyed by filter key.
   *
   * The URL and `rawValues` hold the comma-separated string — the one shape both
   * ends of the stack can carry, see `MultiSelectFilterBase`. This is the same
   * data as a list, so a page never splits the string itself. Every multi filter
   * in the schema has an entry; an unset one is an empty array, so a caller can
   * read `.length` without a null check.
   */
  listValues: Record<string, string[]>;
  /** Draft search text. Debounced into the URL; never used for requests. */
  searchInput: string;
  /** Ready-to-spread request params, with `apiKey` renames and value conversion applied. */
  apiParams: Record<string, unknown>;
  hasActiveFilters: boolean;
  filters: TDefs;
  /**
   * The fields this list can actually sort by. Exposed so `useListTable` can
   * decide which columns render a sort control, rather than every column file
   * hand-maintaining `enableSorting` against a list it cannot see. Empty when
   * the list declared no `sort`.
   */
  sortFields: readonly TField[];
  setSearchInput: (value: string) => void;
  setFilterValue: (key: string, value: string | undefined) => void;
  /**
   * Commits a multi-value filter from a list. Serializing is the kit's job, so
   * a page hands the picker's `string[]` straight through. An empty list clears
   * the filter, firing its `onClear` like any other clear would.
   *
   */
  setFilterListValue: (key: string, values: readonly string[]) => void;
  /**
   * Commits several keys in one URL write. Required for anything owning more
   * than one key — two `setFilterValue` calls in a tick lose the first.
   */
  setFilterValues: (values: Record<string, string | undefined>) => void;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  setSort: (field: string, order: SortOrder) => void;
  /** Drop sorting back to the configured defaults. */
  resetSort: () => void;
  clearFilters: () => void;
}

function isSearchDef(def: AnyFilterDef<never>): def is SearchFilterDef<'search', never> {
  return def.kind === 'search';
}

/** Stable identity for a list that declares no sort, so memos do not churn. */
const NO_SORT_FIELDS: readonly string[] = [];

/**
 * Owns every piece of list URL state: page, size, sort and all filters.
 *
 * Everything is derived from the filter schema, so a module never hand-writes
 * `hasActiveFilters`, never hand-writes `clearFilters`, and never re-implements
 * the "omit this param when it matches the default" rule that is currently
 * copy-pasted — with hardcoded literals — across thirteen list pages.
 *
 * Declare the schema at module scope, not inline in the component. A fresh array
 * every render gives `values` and `apiParams` a new identity every render, which
 * churns every memo downstream. When options come from a query, hoist the static
 * parts and memoize the rest.
 */
export function useListState<
  const TDefs extends readonly AnyFilterDef<never>[],
  TField extends string = string,
>({
  filters,
  sort,
  pageSize = DEFAULT_PAGE_SIZE,
  apiKeys,
}: ListStateConfig<TDefs, TField>): ListState<TDefs, TField> {
  const { searchParams, updateParams } = useUrlParamPatch();

  const pageKey = apiKeys?.page ?? 'page';
  const sizeKey = apiKeys?.size ?? 'size';
  const sortByKey = apiKeys?.sortBy ?? 'sortBy';
  const sortOrderKey = apiKeys?.sortOrder ?? 'sortOrder';
  const defaultSortOrder: SortOrder = sort?.order ?? 'asc';
  const defaultSortField = sort?.by;
  const sortFields = (sort?.fields ?? NO_SORT_FIELDS) as readonly TField[];

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), pageSize);

  const rawSortBy = searchParams.get('sortBy');
  // An unsorted list reports an empty field rather than a placeholder: the table
  // reads this to decide whether to hold any sorting state at all.
  const sortBy = defaultSortField
    ? (sortFields.find((field) => field === rawSortBy) ?? defaultSortField)
    : ('' as TField);

  const rawSortOrder = searchParams.get('sortOrder');
  const sortOrder: SortOrder =
    sort && (rawSortOrder === 'asc' || rawSortOrder === 'desc') ? rawSortOrder : defaultSortOrder;

  const searchDef = useMemo(() => filters.find(isSearchDef), [filters]);
  const searchQuery = searchParams.get('search') ?? '';
  const [searchInput, setSearchInputState] = useState(searchQuery);

  const commitSearch = useCancellableDebouncedCallback(
    (value: string) => updateParams({ page: undefined, search: value || undefined }),
    searchDef?.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS
  );

  // An external URL change (back/forward, or clearFilters) wins over pending
  // draft input. Sync during render rather than in an effect so the input never
  // paints one frame of stale text.
  const [syncedSearchQuery, setSyncedSearchQuery] = useState(searchQuery);

  if (syncedSearchQuery !== searchQuery) {
    setSyncedSearchQuery(searchQuery);
    setSearchInputState(searchQuery);
  }

  // Drop any keystroke still in flight, so it cannot reinstate a value the user
  // already navigated away from. A no-op when our own commit caused the change.
  useEffect(() => {
    commitSearch.cancel();
  }, [commitSearch, searchQuery]);

  const setSearchInput = useCallback(
    (value: string) => {
      setSearchInputState(value);
      commitSearch.run(value);
    },
    [commitSearch]
  );

  const rawValues = useMemo(() => {
    const next: Record<string, string | undefined> = {};

    for (const def of filters) {
      for (const key of filterUrlKeys(def)) {
        const value =
          key === def.key
            ? readFilterValue(def, searchParams)
            : (searchParams.get(key) ?? undefined);

        if (value !== undefined) next[key] = value;
      }
    }

    return next;
  }, [filters, searchParams]);

  // The only cast in the hook. `rawValues` is assembled dynamically from the
  // schema, so its keys cannot be proven to TypeScript; the schema guarantees them.
  const values = rawValues as FilterValues<TDefs>;

  const listValues = useMemo(() => {
    const next: Record<string, string[]> = {};

    for (const def of filters) {
      if (isMultiFilter(def)) next[def.key] = parseMultiValue(rawValues[def.key]);
    }

    return next;
  }, [filters, rawValues]);

  // Persistent controls — a view toggle, a sort select — live in the same row and
  // the same URL, but they are not filters. Counting them would light up Clear on
  // a list nobody has filtered.
  const clearableKeys = useMemo(() => {
    const keys = new Set<string>();

    for (const def of filters) {
      if (!isClearableFilter(def)) continue;
      for (const key of filterUrlKeys(def)) {
        // A search scope narrows the text it belongs to and filters nothing on
        // its own, so it must not light up Clear on a list with an empty search
        // box. `clearFilters` still resets it — it walks the schema itself.
        if (def.kind === 'search' && key === def.scope?.key) continue;
        keys.add(key);
      }
    }

    return keys;
  }, [filters]);

  const hasActiveFilters = useMemo(
    () =>
      Object.entries(rawValues).some(([key, value]) => Boolean(value) && clearableKeys.has(key)),
    [clearableKeys, rawValues]
  );

  const apiParams = useMemo(() => {
    const params: Record<string, unknown> = { [pageKey]: page, [sizeKey]: size };

    // An unsorted list must not send sort params at all — an API that does not
    // sort should not be handed a field name it will either ignore or reject.
    if (sortBy) {
      params[sortByKey] = sortBy;
      params[sortOrderKey] = sortOrder;
    }

    const raw = rawValues;

    for (const def of filters) {
      // Client-side filters never reach the API.
      if (def.clientPredicate) continue;

      // A sort select writes through `setSort`, so sorting is already in `params`.
      if (def.kind === 'sortSelect') continue;

      if (
        def.kind === 'dateRange' ||
        def.kind === 'dateRangePopover' ||
        def.kind === 'numberRange'
      ) {
        params[filterApiKey(def)] = raw[def.key];
        params[def.toApiKey ?? def.toKey] = raw[def.toKey];
        continue;
      }

      // A search scope narrows the request alongside the text it belongs to.
      if (def.kind === 'search' && def.scope) {
        params[def.scope.key] = raw[def.scope.key];
      }

      const value = raw[def.key];

      params[filterApiKey(def)] =
        value !== undefined && def.toApiValue ? def.toApiValue(value) : value;
    }

    return params;
  }, [
    filters,
    page,
    pageKey,
    rawValues,
    size,
    sizeKey,
    sortBy,
    sortByKey,
    sortOrder,
    sortOrderKey,
  ]);

  const setPage = useCallback(
    (next: number) => updateParams({ page: next <= 1 ? undefined : String(next) }),
    [updateParams]
  );

  const setSize = useCallback(
    (next: number) =>
      updateParams({ page: undefined, size: next === pageSize ? undefined : String(next) }),
    [pageSize, updateParams]
  );

  // Defect A, fixed structurally: both params are compared against *this list's*
  // configured defaults rather than a literal typed into the page component.
  const setSort = useCallback(
    (field: string, order: SortOrder) => {
      // A column whose id is not a declared sort field cannot be sorted by the
      // API, so keep it out of the URL rather than writing a value that reads
      // back as the default anyway. A list with no `sort` declares none of them,
      // so `sortFields` is empty and every field falls out here.
      if (!defaultSortField || !sortFields.includes(field as TField)) return;

      updateParams({
        page: undefined,
        sortBy: field === defaultSortField ? undefined : field,
        sortOrder: order === defaultSortOrder ? undefined : order,
      });
    },
    [defaultSortField, defaultSortOrder, sortFields, updateParams]
  );

  const resetSort = useCallback(
    () => updateParams({ page: undefined, sortBy: undefined, sortOrder: undefined }),
    [updateParams]
  );

  const setFilterValue = useCallback(
    (key: string, value: string | undefined) => {
      const def = filters.find((entry) => filterUrlKeys(entry).includes(key));

      if (!def) return;

      if (value === undefined && key === def.key) def.onClear?.();

      // Search owns a draft value, so it routes through the debounced setter
      // rather than writing to the URL immediately. Only its *own* key does:
      // a search that owns a scope key answers to that key too, and routing the
      // scope through here typed the scope's value into the search box instead
      // of narrowing anything.
      if (def.kind === 'search' && key === def.key) {
        setSearchInput(value ?? '');
        return;
      }

      updateParams({
        page: undefined,
        [key]: key === def.key ? writeFilterValue(def, value) : value || undefined,
      });
    },
    [filters, setSearchInput, updateParams]
  );

  const setFilterListValue = useCallback(
    (key: string, values: readonly string[]) => setFilterValue(key, serializeMultiValue(values)),
    [setFilterValue]
  );

  /**
   * Commits several filter keys in one URL write.
   *
   * `setFilterValue` twice in a tick loses the first: each call starts its own
   * navigation, and the second reads a location the first has not landed in yet.
   * Anything owning more than one key — every range — has to come through here.
   */
  const setFilterValues = useCallback(
    (values: Record<string, string | undefined>) => {
      const patch: Record<string, string | undefined> = { page: undefined };

      for (const [key, value] of Object.entries(values)) {
        const def = filters.find((entry) => filterUrlKeys(entry).includes(key));

        if (!def) continue;
        if (value === undefined && key === def.key) def.onClear?.();

        // Search keeps a draft value and its own debounce, so it never goes
        // straight to the URL — route it the way a single set would. A scope key
        // is an ordinary URL key even though the search owns it.
        if (def.kind === 'search' && key === def.key) {
          setSearchInput(value ?? '');
          continue;
        }

        patch[key] = key === def.key ? writeFilterValue(def, value) : value || undefined;
      }

      updateParams(patch);
    },
    [filters, setSearchInput, updateParams]
  );

  const clearFilters = useCallback(() => {
    commitSearch.cancel();
    setSearchInputState('');

    const patch: Record<string, undefined> = { page: undefined };
    for (const def of filters) {
      if (!isClearableFilter(def)) continue;

      def.onClear?.();
      for (const key of filterUrlKeys(def)) patch[key] = undefined;
    }

    updateParams(patch);
  }, [commitSearch, filters, updateParams]);

  return {
    apiParams,
    clearFilters,
    filters,
    sortFields,
    hasActiveFilters,
    listValues,
    page,
    rawValues,
    resetSort,
    searchInput,
    setFilterListValue,
    setFilterValue,
    setFilterValues,
    setPage,
    setSearchInput,
    setSize,
    setSort,
    size,
    sortBy,
    sortOrder,
    values,
  };
}
