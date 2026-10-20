import { useSyncExternalStore } from 'react';

/**
 * The resolved values of some `--token`s, for code that paints to a
 * `<canvas>` and so cannot say `var(--token)` itself.
 *
 * Read again whenever the theme class on `<html>` changes. That is the whole
 * reason this is a store subscription rather than a value read once: the ruler
 * is pixels in a canvas, not styled DOM, so nothing repaints it when the
 * viewer switches theme. It would keep the previous theme's greys until
 * something unrelated forced a render.
 *
 * Where a custom property resolves to `''` the fallback is used, so a paint is
 * never transparent. That happens under happy-dom in the unit suite, which
 * does not render computed styles, and it would happen in a theme that had
 * forgotten one of these tokens -- `tests/pdf-editor-theme-tokens.test.ts` is
 * what keeps the second case hypothetical.
 */

/**
 * Watched on the element rather than taken from `useTheme()`, because
 * next-themes applies the class in its own effect -- which runs after a
 * child's, so a child reacting to `resolvedTheme` reads the previous theme's
 * colours. `src/modules/email` has the same subscription for the same reason;
 * it is not shared because one module may not import another's hooks, and a
 * MutationObserver is four lines.
 */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

/**
 * The last result per (theme, token list).
 *
 * `useSyncExternalStore` compares snapshots by identity and re-renders when
 * they differ, so returning a freshly built object every call would loop
 * forever. Keyed by the theme class and the names asked for, which between
 * them decide the answer; that is four themes times the one or two call sites
 * this module has, so it does not grow.
 */
const cache = new Map<string, Record<string, string>>();

function readTokens(names: readonly string[], fallbacks: Record<string, string>) {
  const key = `${document.documentElement.className}\u0000${names.join(',')}`;
  const hit = cache.get(key);

  if (hit) return hit;

  const styles = getComputedStyle(document.documentElement);
  const resolved: Record<string, string> = {};

  for (const name of names) {
    const value = styles.getPropertyValue(name).trim();
    resolved[name] = value === '' ? fallbacks[name]! : value;
  }

  cache.set(key, resolved);

  return resolved;
}

export function useThemeTokens<K extends string>(fallbacks: Record<K, string>): Record<K, string> {
  const names = Object.keys(fallbacks);

  return useSyncExternalStore(
    subscribeToTheme,
    () => readTokens(names, fallbacks) as Record<K, string>,
    () => fallbacks
  );
}

/**
 * The app's own font family, for the same canvas.
 *
 * Read off `<body>`, where `globals.css` declares it, rather than from a
 * token: there is no `--font-sans` to read, and a ruler labelled in a
 * different face from the rest of the app reads as a bug. A string needs no
 * caching -- `useSyncExternalStore` compares it by value.
 */
export function useBodyFontFamily(fallback: string): string {
  return useSyncExternalStore(
    subscribeToTheme,
    () => getComputedStyle(document.body).fontFamily || fallback,
    () => fallback
  );
}
