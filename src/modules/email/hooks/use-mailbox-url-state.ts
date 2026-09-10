import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCancellableDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import {
  applyMailboxUrlState,
  buildMailboxSearchString,
  MAILBOX_FILTER_RESET,
  parseMailboxUrlState,
  type MailboxUrlState,
} from '@/modules/email/lib/mailbox-url-state';
import { useSearchParams } from 'react-router-dom';

/**
 * How long typing settles before the search term reaches the URL. The term is a
 * filter like any other, but a keystroke is not a view worth recording —
 * debouncing keeps `history.replaceState` off the hot path and keeps the mail
 * query key stable while a word is being typed.
 */
const MAILBOX_SEARCH_DEBOUNCE_MS = 150;

export interface UseMailboxUrlStateResult {
  /** The view/filter state currently encoded in the URL. */
  state: MailboxUrlState;
  /** The search box's live value, which leads `state.search` by the debounce. */
  searchDraft: string;
  /** Writes a patch back to the URL. Defaults to `replace` — see the hook doc. */
  setState: (patch: Partial<MailboxUrlState>, options?: { replace?: boolean }) => void;
  /** Types into the search box; the URL follows once typing settles. */
  setSearchDraft: (value: string) => void;
  /** Puts every mail filter (search included) back to its default. */
  resetFilters: () => void;
  /**
   * The query string a path-changing navigation should carry, with `patch`
   * applied — so opening a message or switching folders keeps (or deliberately
   * drops) the active filters instead of losing them to `navigate()`.
   */
  buildSearchString: (patch?: Partial<MailboxUrlState>) => string;
}

/**
 * Binds the mailbox's view and filter state to the query string.
 *
 * Writes default to `replace`: refining a filter narrows the view you are
 * already on, so Back should leave the mailbox — or step to the previous folder
 * or message, both of which are path changes and stay push-based — rather than
 * unwinding every toggle and every prefix of a search term.
 */
export function useMailboxUrlState(): UseMailboxUrlStateResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseMailboxUrlState(searchParams), [searchParams]);
  const urlSearch = state.search;

  const setState = useCallback(
    (patch: Partial<MailboxUrlState>, options?: { replace?: boolean }) => {
      setSearchParams((previous) => applyMailboxUrlState(previous, patch), {
        replace: options?.replace ?? true,
      });
    },
    [setSearchParams]
  );

  const [searchDraft, setSearchDraftValue] = useState(urlSearch);
  // Mirrors the term the URL held as of the last render, and is set alongside
  // the hook's own commits. A URL term that does not match it therefore came
  // from somewhere else — Back/Forward, a filter reset, a folder switch — and
  // has to be typed back into the box.
  const [committedSearch, setCommittedSearch] = useState(urlSearch);
  // The same value again, for the code that runs after render: adjusting state
  // during render is what keeps the box from painting stale text, but it also
  // means `committedSearch` has already caught up by the time effects run.
  const committedSearchRef = useRef(urlSearch);

  const commitSearch = useCancellableDebouncedCallback((value: string) => {
    const term = value.trim();
    committedSearchRef.current = term;
    setCommittedSearch(term);
    setState({ search: term });
  }, MAILBOX_SEARCH_DEBOUNCE_MS);

  // Adjusted during render rather than in an effect so the box never paints a
  // frame of stale text after Back/Forward.
  if (committedSearch !== urlSearch) {
    setCommittedSearch(urlSearch);
    setSearchDraftValue(urlSearch);
  }

  // Drop a keystroke still in flight when the term changed from outside, so it
  // cannot reinstate a search the user has already navigated away from. A term
  // this hook committed itself is not an outside change, and must not cancel a
  // key pressed while that commit was on its way to the URL.
  useEffect(() => {
    if (committedSearchRef.current === urlSearch) return;
    committedSearchRef.current = urlSearch;
    commitSearch.cancel();
  }, [commitSearch, urlSearch]);

  const setSearchDraft = useCallback(
    (value: string) => {
      setSearchDraftValue(value);
      commitSearch.run(value);
    },
    [commitSearch]
  );

  const resetFilters = useCallback(() => {
    commitSearch.cancel();
    setState(MAILBOX_FILTER_RESET);
  }, [commitSearch, setState]);

  const buildSearchString = useCallback(
    (patch: Partial<MailboxUrlState> = {}) => buildMailboxSearchString(searchParams, patch),
    [searchParams]
  );

  return { state, searchDraft, setState, setSearchDraft, resetFilters, buildSearchString };
}
