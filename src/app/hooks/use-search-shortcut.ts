import { useEffect, type RefObject } from 'react';

import { isSearchShortcut } from '@/app/lib/search-shortcut';

/** Focuses (and selects) the search box when `/` is pressed - see `isSearchShortcut`. */
export function useSearchShortcut(
  inputRef: RefObject<HTMLInputElement | null>,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const input = inputRef.current;
      if (!input || !isSearchShortcut(event, target)) return;

      event.preventDefault();
      input.focus();
      input.select();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, inputRef]);
}
