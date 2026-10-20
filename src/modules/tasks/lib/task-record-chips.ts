import type { EventColorKey } from '@/modules/email/lib/calendar-event-colors';
import { splitRecordLabel } from '@/modules/email/lib/record-links';
import { TASK_ENTITY_LABELS } from '@/modules/tasks/constants/tasks.constants';
import type { TaskEntityLink } from '@/modules/tasks/schemas/task.schema';

/**
 * The records a task card shows under its title (elli-ui#1406).
 *
 * They were printed as `PROJECT · EN5KDDDH` — the type and the record's id —
 * four uppercase boxes deep. Now each is a soft chip with the record's name and
 * a coloured dot, two at most, then `+N` for the rest.
 */

/** Chips shown before the rest fold into `+N`. */
export const TASK_RECORD_CHIP_LIMIT = 2;

/**
 * What a chip reads. A project by its name — "PS 082K", not "30000 - PS 082K" —
 * since the name is what people call it. Anything else by its number
 * ("PO-55310"), which is how a PO or an RFQ is told apart from its siblings.
 * A record deleted since it was linked says so rather than showing an id.
 */
export function taskRecordChipText(link: Pick<TaskEntityLink, 'entityType' | 'label'>): string {
  const type = TASK_ENTITY_LABELS[link.entityType];
  if (!link.label) return `Deleted ${type.toLowerCase()}`;
  const { code, name } = splitRecordLabel(link.label);
  if (link.entityType === 'project') return name;
  return code ?? name;
}

/** The whole name, on hover: "Project · 30000 - PS 082K". */
export function taskRecordChipTitle(link: Pick<TaskEntityLink, 'entityType' | 'label'>): string {
  const type = TASK_ENTITY_LABELS[link.entityType];
  return link.label ? `${type} · ${link.label}` : `${type} · deleted`;
}

/** Distinct, mid-tone colours from the calendar palette, for the chip's dot. */
const CHIP_COLORS: readonly EventColorKey[] = [
  'orange',
  'emerald',
  'sky',
  'violet',
  'rose',
  'amber',
  'teal',
  'indigo',
];

/** The same record is the same colour on every card and every visit. */
export function taskRecordChipColor(entityId: string): EventColorKey {
  let hash = 0;
  for (const char of entityId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length]!;
}

/** The chips to draw and how many fold into `+N`. */
export function splitTaskRecordChips<T>(
  links: readonly T[],
  limit = TASK_RECORD_CHIP_LIMIT
): { shown: T[]; hidden: T[] } {
  return { shown: links.slice(0, limit), hidden: links.slice(limit) };
}
