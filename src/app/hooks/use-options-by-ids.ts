import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

export interface ResolvedOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

interface UseOptionsByIdsParams<TItem> {
  /** The selected ids, in any order. */
  ids: readonly string[];
  /** Query key prefix identifying the source — e.g. `['vendors', 'by-ids']`. */
  queryKey: readonly unknown[];
  /** Fetches exactly these ids. Called with a de-duplicated, sorted list. */
  fetchByIds: (ids: string[]) => Promise<TItem[]>;
  toOption: (item: TItem) => ResolvedOption;
  /** Options already on hand. An id found here is never fetched. */
  known?: readonly ResolvedOption[];
}

/**
 * Resolves labels for the values a multi-select filter holds.
 *
 * A single-value picker can recover its label from the rows on screen — the one
 * vendor being filtered on owns every row. A multi-value one cannot: filter by
 * three vendors and the third may own no row on this page, so its badge would
 * read as a raw id. On a deep link, before the first page lands, every badge
 * would.
 *
 * So the ids are resolved against their own source instead of against the list.
 * Only the ids that are not already known are fetched, and the key is built from
 * the sorted list, so reordering a selection is a cache hit rather than a
 * request.
 */
export function useOptionsByIds<TItem>({
  ids,
  queryKey,
  fetchByIds,
  toOption,
  known = [],
}: UseOptionsByIdsParams<TItem>) {
  const knownByValue = useMemo(() => {
    const map = new Map<string, ResolvedOption>();
    for (const option of known) map.set(option.value, option);
    return map;
  }, [known]);

  // Sorted, so the cache key describes the *set* being resolved rather than the
  // order the user happened to click them in.
  const missingIds = useMemo(
    () => [...new Set(ids)].filter((id) => !knownByValue.has(id)).sort(),
    [ids, knownByValue]
  );

  const query = useQuery({
    enabled: missingIds.length > 0,
    queryFn: () => fetchByIds(missingIds),
    queryKey: [...queryKey, missingIds],
    // An id's label does not change while the user is filtering by it.
    staleTime: 5 * 60 * 1000,
  });

  return useMemo<ResolvedOption[]>(() => {
    const resolved = new Map(knownByValue);

    for (const item of query.data ?? []) {
      const option = toOption(item);
      resolved.set(option.value, option);
    }

    // Every selected id gets an entry, in selection order. An id still in flight
    // — or one whose record has since been deleted — falls back to itself, which
    // at least keeps its badge removable.
    return ids.map((id) => resolved.get(id) ?? { label: id, value: id });
  }, [ids, knownByValue, query.data, toOption]);
}
