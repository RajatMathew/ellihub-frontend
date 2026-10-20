import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.className;
const getServerSnapshot = () => '';

/**
 * Changes whenever the theme class on `<html>` does.
 *
 * Watched on the element rather than taken from `useTheme()`: next-themes
 * applies the class in its own effect, which runs after a child's — so a child
 * reacting to `resolvedTheme` would read the previous theme's colours.
 */
export function useDocumentThemeKey(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
