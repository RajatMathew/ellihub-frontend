import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/app/lib/utils';
import { Archive, ArchiveRestore, Trash2, X } from 'lucide-react';

interface EmailBulkActionBarProps {
  checkedCount: number;
  allInViewChecked: boolean;
  isBulkMutating?: boolean;
  bulkArchiveLabel: string;
  bulkArchiveVariant?: 'archive' | 'restore';
  bulkDeleteLabel: string;
  onToggleCheckedAll?: () => void;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
  onClearChecked?: () => void;
}

/**
 * The bulk actions for a ticked selection, as a bar that floats over the bottom
 * of the list.
 *
 * It used to be a strip mounted above the rows, in normal flow. Ticking the
 * first checkbox inserted it, which shortened the scroller and jumped every row
 * down by its height — the row under the pointer moved out from under the
 * pointer mid-gesture, so the second tick often landed on the wrong
 * conversation. Floating it costs the list no height at all, so ticking changes
 * nothing about where anything is (elli-ui#1000).
 *
 * It is drawn on `--mail-bulk-bar`, a dark surface in every theme, for the same
 * reason: it has to read as chrome laid over the list rather than as another
 * row in it. The buttons therefore carry their own colours instead of the
 * shared `Button` variants, whose `ghost`/`destructive` ramps are built against
 * the page and wash out here.
 */
export function EmailBulkActionBar({
  checkedCount,
  allInViewChecked,
  isBulkMutating,
  bulkArchiveLabel,
  bulkArchiveVariant,
  bulkDeleteLabel,
  onToggleCheckedAll,
  onBulkArchive,
  onBulkDelete,
  onClearChecked,
}: EmailBulkActionBarProps) {
  const actionClasses =
    'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium hover:bg-mail-bulk-bar-hover disabled:cursor-default disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mail-bulk-bar-foreground motion-safe:transition-colors motion-safe:duration-100';

  return (
    // The wrapper is inert so the list keeps scrolling under the bar's gutter;
    // only the pill itself takes the pointer.
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
      <div
        role="toolbar"
        aria-label="Actions for the selected conversations"
        className="pointer-events-auto flex min-w-0 max-w-full items-center gap-0.5 rounded-full bg-mail-bulk-bar px-1.5 py-1.5 text-mail-bulk-bar-foreground shadow-[0_10px_28px_-8px_rgba(26,28,31,0.55),0_2px_6px_rgba(26,28,31,0.25)]"
      >
        <label
          className={cn(
            actionClasses,
            'gap-2 pl-2 pr-2.5',
            isBulkMutating && 'cursor-default opacity-50'
          )}
        >
          <Checkbox
            size="sm"
            checked={allInViewChecked}
            onCheckedChange={() => onToggleCheckedAll?.()}
            disabled={isBulkMutating}
            aria-label={allInViewChecked ? 'Deselect all visible' : 'Select all visible'}
            className="border-mail-bulk-bar-muted bg-transparent data-[state=checked]:border-mail-bulk-bar-foreground data-[state=checked]:bg-mail-bulk-bar-foreground data-[state=checked]:text-mail-bulk-bar data-[state=indeterminate]:border-mail-bulk-bar-foreground data-[state=indeterminate]:bg-mail-bulk-bar-foreground data-[state=indeterminate]:text-mail-bulk-bar"
          />
          <span className="tabular-nums" aria-live="polite">
            {checkedCount}
          </span>
        </label>

        {onBulkArchive && (
          <button
            type="button"
            className={actionClasses}
            onClick={onBulkArchive}
            disabled={isBulkMutating}
            title={bulkArchiveLabel}
          >
            {bulkArchiveVariant === 'restore' ? (
              <ArchiveRestore aria-hidden="true" className="size-3.5" />
            ) : (
              <Archive aria-hidden="true" className="size-3.5" />
            )}
            {bulkArchiveLabel}
          </button>
        )}

        {onBulkDelete && (
          <button
            type="button"
            className={cn(actionClasses, 'text-mail-bulk-bar-danger')}
            onClick={onBulkDelete}
            disabled={isBulkMutating}
            title={bulkDeleteLabel}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            {bulkDeleteLabel}
          </button>
        )}

        {onClearChecked && (
          <button
            type="button"
            className={cn(actionClasses, 'size-8 justify-center px-0')}
            onClick={onClearChecked}
            disabled={isBulkMutating}
            aria-label="Clear selection"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
