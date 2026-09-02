/**
 * How a person is coloured on the board, separately from what draws them.
 *
 * Its own module because the avatar chip is a component, and a component file
 * that also exports functions breaks fast refresh — the same reason
 * `status-tone.ts` sits beside `StatusBadge`.
 */

/**
 * Avatar tints drawn from the theme's palette rather than raw colours, so they
 * follow light and dark mode. A person keeps the same tint everywhere because
 * it is derived from their id, not from their position in a list.
 */
const AVATAR_TONES = [
  'bg-primary/15 text-primary',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-info/15 text-info',
  'bg-destructive/15 text-destructive',
] as const;

export function assigneeTone(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
