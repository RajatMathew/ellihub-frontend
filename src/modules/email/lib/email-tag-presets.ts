import type { ConnectedEmailTag } from '@/modules/email/api';

/**
 * The tags each side of the Project / Other switch offers before anyone has
 * made one (elli-ui#921, elli-ui#1420). A preset only becomes a real tag the
 * first time it is applied, so an unused one costs nothing.
 */
export const OTHER_PRESET_TAGS = ['Spam', 'Newsletter', 'Personal'] as const;
export const PROJECT_PRESET_TAGS = [
  'Compliance',
  'RFQ Negotiation',
  'Vendor Payment',
  'Submittals',
  'Scheduling',
  'Miscellaneous',
] as const;

export type EmailTagSide = 'project' | 'other';

export function presetTagsFor(side: EmailTagSide): readonly string[] {
  return side === 'other' ? OTHER_PRESET_TAGS : PROJECT_PRESET_TAGS;
}

const lower = (value: string) => value.toLowerCase();

/**
 * Whether a tag belongs to the other side's presets — "Spam" has no place in
 * a project thread's row, nor "Compliance" in an Other thread's, unless the
 * thread already carries it.
 */
export function isOtherSidePreset(name: string, side: EmailTagSide): boolean {
  const theirs = presetTagsFor(side === 'other' ? 'project' : 'other');
  return theirs.some((preset) => lower(preset) === lower(name));
}

/**
 * The tags a filter menu lists for one side: every Elli tag that exists,
 * this side's presets first in their set order, then the rest A–Z, the other
 * side's presets left out. Provider categories are never offered.
 */
export function filterTagsFor(
  tags: readonly ConnectedEmailTag[],
  side: EmailTagSide
): ConnectedEmailTag[] {
  const presets = presetTagsFor(side).map(lower);
  const custom = tags.filter(
    (tag) => tag.source === 'custom' && !isOtherSidePreset(tag.name, side)
  );
  const rank = (tag: ConnectedEmailTag) => {
    const index = presets.indexOf(lower(tag.name));
    return index === -1 ? presets.length : index;
  };
  return [...custom].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/** Whether a row's tags include any of the chosen ones, by name, ignoring case. */
export function carriesAnyTag(rowTags: readonly string[] | undefined, chosen: readonly string[]) {
  if (chosen.length === 0) return true;
  const wanted = new Set(chosen.map(lower));
  return (rowTags ?? []).some((tag) => wanted.has(lower(tag)));
}

/** One row of the tag picker: a preset not made yet has no `tag`. */
export type TagPickerOption = {
  name: string;
  tag: ConnectedEmailTag | null;
  /** Made by someone, not one of the built-in presets. */
  custom: boolean;
};

/**
 * Every tag a thread on this side can carry (elli-ui#1470): this side's
 * presets first, made or not, then the tags people have made A–Z. The other
 * side's presets stay out unless this thread already carries one.
 */
export function tagPickerOptions(
  side: EmailTagSide,
  tags: readonly ConnectedEmailTag[],
  appliedNames: readonly string[]
): TagPickerOption[] {
  const applied = new Set(appliedNames.map(lower));
  const byName = new Map(
    tags.filter((tag) => tag.source === 'custom').map((tag) => [lower(tag.name), tag])
  );
  const presets = presetTagsFor(side);
  const presetRows = presets.map((name) => ({
    name: byName.get(lower(name))?.name ?? name,
    tag: byName.get(lower(name)) ?? null,
    custom: false,
  }));
  const madeRows = [...byName.values()]
    .filter(
      (tag) =>
        !presets.some((preset) => lower(preset) === lower(tag.name)) &&
        (!isOtherSidePreset(tag.name, side) || applied.has(lower(tag.name)))
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((tag) => ({ name: tag.name, tag, custom: !isOtherSidePreset(tag.name, side) }));
  return [...presetRows, ...madeRows];
}

/** The rows whose name holds the query, ignoring case; all of them when blank. */
export function matchTagOptions(options: readonly TagPickerOption[], query: string) {
  const needle = query.trim().toLowerCase();
  return needle ? options.filter((option) => lower(option.name).includes(needle)) : [...options];
}

/** Whether the query names a tag that does not exist yet, so it can be made. */
export function canCreateTag(options: readonly TagPickerOption[], query: string): boolean {
  const name = query.replace(/\s+/g, ' ').trim();
  return name.length > 0 && !options.some((option) => lower(option.name) === lower(name));
}
