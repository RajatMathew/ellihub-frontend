import { useCallback } from 'react';

import { useSearchParams } from 'react-router-dom';

export type UrlParamPatch = Record<string, string | null | undefined>;

/**
 * The query string a patch leaves: an empty value removes its key, anything
 * else sets it. Returns `null` when the patch changes nothing.
 */
export function applyUrlParamPatch(current: string, patch: UrlParamPatch): string | null {
  const next = new URLSearchParams(current);

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, value);
  }

  const nextSearch = next.toString();
  return nextSearch === new URLSearchParams(current).toString() ? null : nextSearch;
}

export function useUrlParamPatch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateParams = useCallback(
    (patch: UrlParamPatch) => {
      // The address bar, not this render's searchParams: navigation writes it
      // synchronously, so it already holds any change made earlier in the same
      // tick, and two patches in a row compose instead of the second undoing
      // the first.
      const next = applyUrlParamPatch(window.location.search, patch);

      // Nothing to change. Navigating anyway pushed the same URL a second
      // time — opening a folder in Files, whose cleared search box writes
      // "no search" once its debounce ends, left two history entries for the
      // folder, and Back seemed to do nothing the first time.
      if (next === null) return;

      setSearchParams(new URLSearchParams(next));
    },
    [setSearchParams]
  );

  return { searchParams, updateParams };
}
