import type { AnyFilterDef } from './types';

export interface ActiveFilterChip {
  /** Identity for React, and the key(s) this chip clears. */
  id: string;
  keys: string[];
  label: string;
  value: string;
}

/**
 * Reads the active filters out of the schema as chips.
 *
 * `search` and `tabs` are deliberately excluded: both render their own value
 * prominently, so a chip would only repeat it. Everything else is included —
 * especially `hidden`, which arrives by deep link and until now had no way to
 * tell the user it was narrowing the list at all.
 *
 * Its own module because `DataTableFilterChips` is a component, and a component
 * file that also exports a function breaks fast refresh.
 */
export function collectActiveFilterChips(
  schema: readonly AnyFilterDef<never>[],
  rawValues: Record<string, string | undefined>
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const def of schema) {
    // Persistent controls are not filters — a view toggle or a sort select has
    // nothing to clear.
    if (def.persistent) continue;
    if (def.kind === 'search' || def.kind === 'tabs') continue;

    if (def.kind === 'dateRange' || def.kind === 'dateRangePopover') {
      const from = rawValues[def.key];
      const to = rawValues[def.toKey];

      if (!from && !to) continue;

      chips.push({
        id: def.key,
        keys: [def.key, def.toKey],
        label: def.label ?? 'Date',
        value: from && to ? `${from} – ${to}` : from ? `From ${from}` : `Until ${to}`,
      });
      continue;
    }

    if (def.kind === 'numberRange') {
      const min = rawValues[def.key];
      const max = rawValues[def.toKey];

      if (!min && !max) continue;

      chips.push({
        id: def.key,
        keys: [def.key, def.toKey],
        label: def.label ?? 'Range',
        value: min && max ? `${min} – ${max}` : min ? `Min ${min}` : `Max ${max}`,
      });
      continue;
    }

    const raw = rawValues[def.key];
    if (raw === undefined || raw === '') continue;

    chips.push({
      id: def.key,
      keys: [def.key],
      label: filterLabel(def),
      value: displayValue(def, raw),
    });
  }

  return chips;
}

function filterLabel(def: AnyFilterDef<never>): string {
  if (def.label) return def.label;
  if (def.kind === 'select' || def.kind === 'infiniteSelect') return def.placeholder;
  return def.key;
}

function optionLabel(
  options: readonly { label: string; value: string }[],
  raw: string
): string | undefined {
  return options.find((option) => option.value === raw)?.label;
}

/**
 * The option's label rather than its id, when the definition carries the
 * options. A picker whose page has not loaded the matching option yet falls back
 * to the raw value — better than rendering nothing while it arrives.
 */
function displayValue(def: AnyFilterDef<never>, raw: string): string {
  if (def.kind === 'select' || def.kind === 'infiniteSelect' || def.kind === 'toggleGroup') {
    return optionLabel(def.options, raw) ?? raw;
  }

  return raw;
}
