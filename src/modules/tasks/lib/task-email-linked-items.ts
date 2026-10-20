import { linkedItemViews, type LinkedItemView } from '@/modules/email/lib/linked-item-views';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';

export type TaskEmailLinkedItemView = LinkedItemView;

/**
 * What a card says about the records its email is linked to — the same view
 * the inbox row draws, from the links the API sends on the email reference.
 */
export function taskEmailLinkedItems(
  reference: TaskEmailReference,
  limit: number
): { shown: TaskEmailLinkedItemView[]; hidden: number } {
  return linkedItemViews(reference.linkedItems ?? [], limit);
}
