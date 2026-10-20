import { useCallback, useState } from 'react';

import { mergeOptionCache, type SearchSelectOption } from '@/app/lib/search-select-option-cache';

/**
 * Every option a search select has been given, by value — so a selected value
 * keeps its label after a new search replaces the option list.
 *
 * This used to be an effect that merged `options` into state after each render.
 * That rendered once with the old cache, then again with the new one, and it is
 * what `react-hooks/set-state-in-effect` flags. The merge now happens during
 * render; state is written only when it added something, so this settles after
 * at most one extra pass, and the current render already sees the merged cache.
 * Comparing contents rather than array identity matters: the multi-select
 * defaults `selectedOptions` to a fresh `[]` on every render.
 *
 * `remember` adds one option from an event handler, as picking an option did
 * before.
 */
export function useOptionCache<O extends SearchSelectOption>(
  ...lists: ReadonlyArray<readonly O[]>
): readonly [cache: ReadonlyMap<string, O>, remember: (option: O) => void] {
  const [cache, setCache] = useState(() => mergeOptionCache(new Map<string, O>(), lists));

  const merged = mergeOptionCache(cache, lists);
  if (merged !== cache) setCache(merged);

  const remember = useCallback(
    (option: O) => setCache((previous) => mergeOptionCache(previous, [[option]])),
    []
  );

  return [merged, remember] as const;
}
