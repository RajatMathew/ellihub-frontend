import type { ReactNode } from 'react';

import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';

import type { DataTableItemLabel } from './data-table-bulk-bar';

/** How many names to spell out before falling back to "and N more". */
const NAMED_ITEM_LIMIT = 5;

export interface BulkDeleteFailureItem {
  id: string;
  message: string;
}

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `list.selection.items` — the rows about to be deleted, already labelled. */
  items: { id: string; label: string }[];
  itemLabel: DataTableItemLabel;
  isPending: boolean;
  /**
   * Per-id failures from the last attempt. Rendered by name so the user can see
   * which records were refused and why, rather than a count that means nothing.
   */
  failures?: BulkDeleteFailureItem[];
  /** Extra consequence worth stating, beyond the record itself going away. */
  description?: ReactNode;
  onConfirm: () => void;
}

function summarize(items: { label: string }[], itemLabel: DataTableItemLabel): string {
  const names = items.slice(0, NAMED_ITEM_LIMIT).map((item) => item.label);
  const remaining = items.length - names.length;

  if (items.length === 0) return `No ${itemLabel.many} selected.`;
  if (remaining > 0) return `${names.join(', ')} and ${remaining} more.`;
  if (names.length === 1) return `${names[0]}.`;

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`;
}

/**
 * Confirms a bulk delete, and afterwards reports what the server refused.
 *
 * Stays open on confirm so a partial result has somewhere to land: the ids that
 * failed are listed by name with the server's own reason, and the user can close
 * or retry. The caller closes it once a run comes back clean.
 */
export function BulkDeleteDialog({
  open,
  onOpenChange,
  items,
  itemLabel,
  isPending,
  failures = [],
  description,
  onConfirm,
}: BulkDeleteDialogProps) {
  const count = items.length;
  const noun = count === 1 ? itemLabel.one : itemLabel.many;
  const labelById = new Map(items.map((item) => [item.id, item.label]));

  return (
    <ConfirmDialog
      confirmDisabled={count === 0}
      confirmLabel={failures.length > 0 ? 'Retry' : `Delete ${count} ${noun}`}
      isPending={isPending}
      keepOpenOnConfirm
      open={open}
      title={`Delete ${count} ${noun}?`}
      variant="destructive"
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      description={
        <span className="block space-y-2">
          <span className="block">{summarize(items, itemLabel)}</span>
          {description && <span className="block">{description}</span>}
          <span className="block font-medium text-foreground">This can&apos;t be undone.</span>

          {failures.length > 0 && (
            <span className="block rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
              <span className="block text-xs font-semibold text-destructive">
                {failures.length} could not be deleted
              </span>
              <span className="mt-1.5 block space-y-1">
                {failures.map((failure) => (
                  <span className="block text-xs text-muted-foreground" key={failure.id}>
                    <span className="font-medium text-foreground">
                      {labelById.get(failure.id) ?? failure.id}
                    </span>
                    {' — '}
                    {failure.message}
                  </span>
                ))}
              </span>
            </span>
          )}
        </span>
      }
    />
  );
}
