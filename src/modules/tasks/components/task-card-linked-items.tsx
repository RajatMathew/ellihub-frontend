import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { TASK_CARD_LINKED_ITEM_LIMIT } from '@/modules/tasks/constants/tasks.constants';
import { useScrollEdges } from '@/modules/tasks/hooks/use-scroll-edges';
import {
  taskEmailLinkedItems,
  type TaskEmailLinkedItemView,
} from '@/modules/tasks/lib/task-email-linked-items';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';

function LinkedItemRow({ item }: { item: TaskEmailLinkedItemView }) {
  return (
    // On one baseline, not centred: the type label is smaller than the code
    // beside it, and centring the two boxes left the label riding high. The dot
    // has no text, so it centres on the line instead.
    <span
      className="flex min-w-0 items-baseline gap-1.5 text-[10px] leading-3.5"
      title={item.name ?? item.code}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 self-center rounded-full', item.dot)}
      />
      <span className="shrink-0 text-[9px] font-bold tracking-wide text-task-ink-faint">
        {item.typeLabel}
      </span>
      <span className="min-w-0 truncate text-task-ink-faint">
        <span className="font-semibold text-foreground">{item.code}</span>
        {item.name ? <> – {item.name}</> : null}
      </span>
    </span>
  );
}

/**
 * Every record, for the popover. Its own component so the edge tracking mounts
 * with the popover, as `SourceList` does.
 */
function LinkedItemList({ items }: { items: TaskEmailLinkedItemView[] }) {
  const { ref, scrollEdgeProps } = useScrollEdges<HTMLUListElement>();

  return (
    <ul
      ref={ref}
      {...scrollEdgeProps}
      aria-label={`${items.length} linked records`}
      className="scroll-fade flex max-h-60 flex-col gap-1.5 overflow-y-auto px-1.5 py-1"
    >
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 items-start">
          <LinkedItemRow item={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The records the email's thread is linked to — the mailbox's "Linked items" —
 * so the card says which job the email is about without opening it.
 *
 * One on the card, jobs first; the rest behind "+N more", which opens all of
 * them. A thread tagged to seven jobs would otherwise set the height of every
 * card on its row (see `useEqualCardHeights`).
 *
 * A sibling of the email's link rather than inside it: the "+N more" is a
 * button, and a button inside a link is invalid and fires both.
 */
export function TaskCardLinkedItems({
  reference,
  onOpenChange,
}: {
  reference: TaskEmailReference;
  /** Told when the "+N more" list opens and closes, so the email stack can hold still under it. */
  onOpenChange?: (open: boolean) => void;
}) {
  const { shown, hidden } = taskEmailLinkedItems(reference, TASK_CARD_LINKED_ITEM_LIMIT);
  if (shown.length === 0) return null;

  return (
    // Indented past the envelope, so the records line up under the subject and
    // sender (a 24px tile and a 10px gap). The "+N" sits at the end of the same
    // line rather than adding one under it.
    <div className="flex min-w-0 items-center gap-2 pl-8.5">
      {shown.map((item) => (
        <LinkedItemRow key={item.key} item={item} />
      ))}

      {hidden > 0 ? (
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              // The whole card is a drag handle; see TaskAssigneeMenu.
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={`Show all ${hidden + shown.length} linked records`}
              className="ml-auto h-auto shrink-0 px-0 py-0 text-[10px] font-semibold text-court-ours hover:bg-transparent hover:underline"
            >
              +{hidden} more
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-80 p-1.5">
            <LinkedItemList items={taskEmailLinkedItems(reference, Infinity).shown} />
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
