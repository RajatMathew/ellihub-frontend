/** The option shape both search selects share. */
export type SearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

function sameOption(first: SearchSelectOption | undefined, second: SearchSelectOption) {
  return (
    first?.value === second.value &&
    first.label === second.label &&
    first.description === second.description &&
    first.badge === second.badge &&
    first.disabled === second.disabled
  );
}

/**
 * Adds every option in `lists` to `cache`, keyed by value, keeping the newest
 * version of each.
 *
 * Returns `cache` itself when nothing is new or changed, so a caller can tell
 * "no update" by identity. The search selects rely on that: they merge on every
 * render and store the result only when it differs, which settles after one
 * pass however often the parent hands them new arrays with the same options.
 */
export function mergeOptionCache<O extends SearchSelectOption>(
  cache: ReadonlyMap<string, O>,
  lists: ReadonlyArray<readonly O[]>
): ReadonlyMap<string, O> {
  // Resolve the lists first, later winning, and only then compare with the
  // cache. Comparing option by option let two lists that disagree about one
  // value overwrite each other on every call — the result always differed from
  // the cache, and a select merging during render never settled (React #301).
  const incoming = new Map<string, O>();
  for (const list of lists) {
    for (const option of list) incoming.set(option.value, option);
  }

  let next: Map<string, O> | undefined;
  for (const option of incoming.values()) {
    if (sameOption(cache.get(option.value), option)) continue;
    next ??= new Map(cache);
    next.set(option.value, option);
  }

  return next ?? cache;
}
