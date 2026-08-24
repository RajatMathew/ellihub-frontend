import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCancellableDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { useUrlParamPatch } from '@/app/hooks/use-url-param-patch';
import { parsePageParam, parseSizeParam } from '@/app/lib/helpers';

import { DEFAULT_PAGE_SIZE, DEFAULT_SEARCH_DEBOUNCE_MS } from './constants';
import {
  filterApiKey,
  filterUrlKeys,
  isClearableFilter,
  readFilterValue,
  writeFilterValue,
} from './filters';
import type {
  AnyFilterDef,
  FilterValues,
  ListStateConfig,
  SearchFilterDef,
  SortOrder,
} from './types';

export interface ListState<TDefs extends readonly AnyFilterDef<never>[], TField extends string> {
  page: number;
  size: number;
  sortBy: TField;
  sortOrder: SortOrder;
  /** Committed filter values, keyed by each filter's `key`. */
  values: FilterValues<TDefs>;
  /**
   * The same values as an untyped record. Exists so the kit's own internals can
   * iterate the schema without re-casting `values` at every call site.
   */
  rawValues: Record<string, string | undefined>;
  /** Draft search text. Debounced into the URL; never used for requests. */
  searchInput: string;
  /** Ready-to-spread request params, with `apiKey` renames and value conversion applied. */
  apiParams: Record<string, unknown>;
  hasActiveFilters: boolean;
  filters: TDefs;
  /**
   * The fields this list can actually sort by. Exposed so `useListTable` can
   * decide which columns render a sort control, rather than every column file
   * hand-maintaining `enableSorting` against a list it cannot see.
   */
  sortFields: readonly TField[];
  setSearchInput: (value: string) => void;
  setFilterValue: (key: string, value: string | undefined) => void;
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
  TField extends string,
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
  const defaultSortOrder: SortOrder = sort.order ?? 'asc';

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), pageSize);

  const rawSortBy = searchParams.get('sortBy');
  const sortBy = sort.fields.find((field) => field === rawSortBy) ?? sort.by;

  const rawSortOrder = searchParams.get('sortOrder');
  const sortOrder: SortOrder =
    rawSortOrder === 'asc' || rawSortOrder === 'desc' ? rawSortOrder : defaultSortOrder;

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

  // Persistent controls — a view toggle, a sort select — live in the same row and
  // the same URL, but they are not filters. Counting them would light up Clear on
  // a list nobody has filtered.
  const clearableKeys = useMemo(() => {
    const keys = new Set<string>();

    for (const def of filters) {
      if (!isClearableFilter(def)) continue;
      for (const key of filterUrlKeys(def)) keys.add(key);
    }

    return keys;
  }, [filters]);

  const hasActiveFilters = useMemo(
    () =>
      Object.entries(rawValues).some(([key, value]) => Boolean(value) && clearableKeys.has(key)),
    [clearableKeys, rawValues]
  );

  const apiParams = useMemo(() => {
    const params: Record<string, unknown> = {
      [pageKey]: page,
      [sizeKey]: size,
      [sortByKey]: sortBy,
      [sortOrderKey]: sortOrder,
    };
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
      // back as the default anyway.
      if (!sort.fields.includes(field as TField)) return;

      updateParams({
        page: undefined,
        sortBy: field === sort.by ? undefined : field,
        sortOrder: order === defaultSortOrder ? undefined : order,
      });
    },
    [defaultSortOrder, sort.by, sort.fields, updateParams]
  );

  const resetSort = useCallback(
    () => updateParams({ page: undefined, sortBy: undefined, sortOrder: undefined }),
    [updateParams]
  );

  const setFilterValue = useCallback(
    (key: string, value: string | undefined) => {
      const def = filters.find((entry) => filterUrlKeys(entry).includes(key));

      if (!def) return;

      // Search owns a draft value, so it routes through the debounced setter
      // rather than writing to the URL immediately.
      if (value === undefined) def.onClear?.();

      if (def.kind === 'search') {
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
    sortFields: sort.fields,
    hasActiveFilters,
    page,
    rawValues,
    resetSort,
    searchInput,
    setFilterValue,
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
