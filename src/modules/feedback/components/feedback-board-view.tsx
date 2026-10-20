import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useFeedbackBoardQuery } from '@/modules/feedback/hooks/use-submit-feedback';
import type {
  FeedbackBoardColumn,
  FeedbackBoardItem,
} from '@/modules/feedback/schemas/feedback.schema';
import { Plus } from 'lucide-react';

interface FeedbackBoardViewProps {
  open: boolean;
  /**
   * Omit where the surrounding page already offers it — the dialog has no
   * other way in, a page with its own header action does.
   */
  onAddFeedback?: () => void;
  onSelectFeedback: (item: FeedbackBoardItem) => void;
}

function isOptimisticFeedbackItem(item: FeedbackBoardItem): boolean {
  return item.id.startsWith('temp-');
}

function FeedbackCard({ item, onSelect }: { item: FeedbackBoardItem; onSelect: () => void }) {
  const isPending = isOptimisticFeedbackItem(item);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isPending}
      className="w-full cursor-pointer rounded-md border border-border bg-card px-3 py-2.5 text-left hover:border-foreground/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-100"
    >
      <p className="line-clamp-2 text-[13px] leading-snug text-foreground">{item.title}</p>
      {isPending && <p className="mt-1 text-xs text-muted-foreground">Sending…</p>}
    </button>
  );
}

/**
 * One status, and what is sitting in it.
 *
 * No card around the column, no tinted header, no icon tile, no badge. The
 * board had all four, and they said nothing the heading did not: a coloured
 * chip beside the word "Completed" is decoration on a label that was already
 * unambiguous. It also carried the status a second time under the title, where
 * the two are the same string — "Feedback / Feedback" — which is how the
 * duplication went unnoticed.
 *
 * Nothing has a fixed height any more either. The columns used to hold 32rem
 * whether or not anything was in them, so a board with two items was mostly a
 * pair of dashed boxes saying there was nothing to see.
 */
function FeedbackColumn({
  column,
  onSelectFeedback,
}: {
  column: FeedbackBoardColumn;
  onSelectFeedback: (item: FeedbackBoardItem) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
        <h3 className="truncate text-[13px] font-semibold text-foreground">{column.title}</h3>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {column.items.length}
        </span>
      </div>

      {column.items.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          {column.items.map((item) => (
            <FeedbackCard key={item.id} item={item} onSelect={() => onSelectFeedback(item)} />
          ))}
        </div>
      ) : (
        // One line, no box. An empty column is worth saying quietly once.
        <p className="py-2 text-xs text-muted-foreground">Nothing here</p>
      )}
    </section>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
      {[0, 1, 2].map((column) => (
        <div key={column} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ))}
    </div>
  );
}

export function FeedbackBoardView({
  open,
  onAddFeedback,
  onSelectFeedback,
}: FeedbackBoardViewProps) {
  const boardQuery = useFeedbackBoardQuery(open);

  if (boardQuery.isLoading) {
    return <BoardSkeleton />;
  }

  if (boardQuery.isError) {
    return (
      <QueryErrorState
        title="Feedback board unavailable"
        description="The board could not be loaded."
        onRetry={() => void boardQuery.refetch()}
      />
    );
  }

  const columns = boardQuery.data?.columns ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Above the board rather than inside its first column. Sitting in the
          column made it read as something you do to that status, and it pushed
          the first card down a row for no reason. */}
      {onAddFeedback && (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onAddFeedback}>
          <Plus className="size-4" />
          New feedback
        </Button>
      )}

      <div className="grid min-w-0 gap-x-6 gap-y-5 md:grid-cols-3">
        {columns.map((column) => (
          <FeedbackColumn key={column.id} column={column} onSelectFeedback={onSelectFeedback} />
        ))}
      </div>
    </div>
  );
}
