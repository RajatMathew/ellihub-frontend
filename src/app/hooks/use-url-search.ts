import { useCallback, useEffect, useState } from 'react';

import { useCancellableDebouncedCallback } from '@/app/hooks/use-debounced-callback';

/** How long typing settles before the search reaches the URL. */
export const DEFAULT_URL_SEARCH_DEBOUNCE_MS = 300;

const NO_PARAMS: readonly string[] = [];

interface SearchSync {
  /** The search the box last showed the URL holding. */
  synced: string;
  /** The search this box last wrote to the URL itself. */
  committed: string;
}

/**
 * What a change in the URL's search means for the box.
 *
 * - The URL now holds what this box just wrote: the box keeps exactly what is
 *   typed. The URL holds it trimmed, so adopting it would eat the space the
 *   person just typed before their next word ("nyu " became "nyu", and the next
 *   word ran on: "nyulangone").
 * - Anything else - Back or Forward, a link, a Clear elsewhere - wins: the box
 *   shows the URL's search, and any keystroke still waiting is dropped, so it
 *   cannot put back a search the person navigated away from.
 */
export function resolveUrlSearchChange(
  query: string,
  state: SearchSync
): { kind: 'unchanged' } | { kind: 'own' } | { kind: 'external'; input: string } {
  if (query === state.synced) return { kind: 'unchanged' };
  if (query === state.committed) return { kind: 'own' };
  return { kind: 'external', input: query };
}

export interface UrlSearch {
  /** The search in the URL - what requests use. */
  query: string;
  /** What the box shows: the URL's search, or what is being typed. */
  input: string;
  /** Types into the box; reaches the URL, trimmed, once typing settles. */
  setInput: (value: string) => void;
  /** Empties the box and the URL at once. */
  clear: () => void;
  /**
   * Empties the box and drops any waiting keystroke, leaving the URL to the
   * caller - for a Clear that removes the search along with other filters in
   * one URL change.
   */
  discard: () => void;
}

/**
 * A search box whose search lives in the URL, so it survives a reload, a
 * shared link and Back. Typing is debounced into the URL; the URL's search is
 * what requests use.
 *
 * The caller owns the URL (`useUrlParamPatch`, or the list kit's own) and says
 * which other params a new search resets - the page, typically.
 */
export function useUrlSearch({
  searchParams,
  updateParams,
  param = 'search',
  debounceMs = DEFAULT_URL_SEARCH_DEBOUNCE_MS,
  resetParams = NO_PARAMS,
}: {
  searchParams: URLSearchParams;
  updateParams: (patch: Record<string, string | undefined>) => void;
  param?: string;
  debounceMs?: number;
  resetParams?: readonly string[];
}): UrlSearch {
  const query = searchParams.get(param) ?? '';
  const [input, setInputState] = useState(query);
  const [sync, setSync] = useState<SearchSync>({ synced: query, committed: query });
  const [externalChanges, setExternalChanges] = useState(0);

  const write = useCallback(
    (value: string) => {
      const patch: Record<string, string | undefined> = { [param]: value || undefined };
      for (const key of resetParams) patch[key] = undefined;
      updateParams(patch);
    },
    [param, resetParams, updateParams]
  );

  const commit = useCancellableDebouncedCallback((value: string) => {
    const next = value.trim();
    setSync((current) => ({ ...current, committed: next }));
    write(next);
  }, debounceMs);

  // Read during render, so the box never paints a frame of stale text.
  const change = resolveUrlSearchChange(query, sync);
  if (change.kind !== 'unchanged') {
    setSync({ synced: query, committed: query });
    if (change.kind === 'external') {
      setInputState(change.input);
      setExternalChanges((count) => count + 1);
    }
  }

  useEffect(() => {
    if (externalChanges > 0) commit.cancel();
  }, [commit, externalChanges]);

  const setInput = useCallback(
    (value: string) => {
      setInputState(value);
      commit.run(value);
    },
    [commit]
  );

  const discard = useCallback(() => {
    commit.cancel();
    setInputState('');
    setSync((current) => ({ ...current, committed: '' }));
  }, [commit]);

  const clear = useCallback(() => {
    discard();
    write('');
  }, [discard, write]);

  return { query, input, setInput, clear, discard };
}
