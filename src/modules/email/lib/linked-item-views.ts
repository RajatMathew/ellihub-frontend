import { getReferenceKind } from '@/app/components/entity-reference-marker-storage';
import { LINKED_ITEM_TYPES, splitReferenceLabel } from '@/modules/email/lib/email-reference-label';

/** A record a thread is linked to, as either the inbox row or a task card has it. */
export interface LinkedItemSource {
  type: string;
  /** Which table a `changeOrder` is from — a prime one is listed as its own kind. */
  entityType?: string | null;
  entityId?: string | null;
  label: string;
}

export interface LinkedItemView {
  key: string;
  typeLabel: string;
  dot: string;
  code: string;
  name: string | null;
}

/**
 * How a thread's linked records are drawn in a tight space — an inbox row, a
 * task card: the first `limit`, in the details panel's own order (jobs first),
 * and how many more there are. The `other` marker is not a record and is left
 * out.
 *
 * A type the client does not know is still shown, under its own name, rather
 * than dropped — the server can learn a kind of record before this list does.
 */
export function linkedItemViews(
  items: readonly LinkedItemSource[],
  limit: number
): { shown: LinkedItemView[]; hidden: number } {
  const rank = (type: string) => {
    const index = LINKED_ITEM_TYPES.findIndex((entry) => entry.type === type);
    return index === -1 ? LINKED_ITEM_TYPES.length : index;
  };

  const views = items
    .filter((item) => item.type !== 'other')
    .map((item, index) => ({ item, index }))
    // Stable: within a type the thread's own order stands.
    .sort(
      (a, b) => rank(getReferenceKind(a.item)) - rank(getReferenceKind(b.item)) || a.index - b.index
    )
    .map(({ item }) => {
      const kind = LINKED_ITEM_TYPES.find((entry) => entry.type === getReferenceKind(item));
      const { code, name } = splitReferenceLabel(item.label);
      return {
        key: `${item.type}-${item.entityId ?? item.label}`,
        typeLabel: kind?.label ?? item.type.toUpperCase(),
        dot: kind?.dot ?? 'bg-muted-foreground',
        code,
        name,
      };
    });

  return { shown: views.slice(0, limit), hidden: Math.max(0, views.length - limit) };
}
