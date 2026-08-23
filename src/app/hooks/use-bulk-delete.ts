import { useCallback, useState } from 'react';

import type { BulkDeleteFailure, BulkDeleteResult } from '@/app/api/bulk-delete';
import { toastApiError } from '@/app/lib/toast-api-error';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface UseBulkDeleteOptions {
  /** The module's API call, e.g. `departmentsApi.bulkRemove`. */
  mutationFn: (ids: string[]) => Promise<BulkDeleteResult>;
  /** Names the records in toasts, e.g. `{ one: 'department', many: 'departments' }`. */
  itemLabel: { one: string; many: string };
  /** Invalidate the list — and anything derived from it, like stats. Always called. */
  onInvalidate: () => void;
  /**
   * Called once per completed request, whatever the outcome. Drop `deletedIds`
   * from the selection and leave the failed ones checked, so the user is looking
   * at exactly what did not go through — and close the dialog only when
   * `failures` is empty.
   */
  onOutcome?: (outcome: { deletedIds: string[]; failures: BulkDeleteFailure[] }) => void;
}

export interface BulkDeleteState {
  run: (ids: string[]) => void;
  isPending: boolean;
  /** Per-id failures from the last run. Empty once every id succeeded. */
  failures: BulkDeleteFailure[];
  /** Clears the failures, e.g. when the dialog closes. */
  reset: () => void;
}

/**
 * Runs a bulk delete and reports it honestly.
 *
 * A batch can come back partly done — a record blocked by its own rules fails
 * while the rest are deleted — so this never collapses the result to a single
 * success or failure. The successful ids leave the selection, the failed ones
 * stay checked with their reasons, and the toast says what actually happened.
 */
export function useBulkDelete({
  mutationFn,
  itemLabel,
  onInvalidate,
  onOutcome,
}: UseBulkDeleteOptions): BulkDeleteState {
  const [failures, setFailures] = useState<BulkDeleteFailure[]>([]);

  const mutation = useMutation({
    mutationFn,
    onError: (error) => {
      setFailures([]);
      toastApiError(error, `Failed to delete ${itemLabel.many}.`);
    },
    onSuccess: (result) => {
      const deleted = result.deletedIds.length;
      const noun = deleted === 1 ? itemLabel.one : itemLabel.many;

      setFailures(result.failed);
      onInvalidate();
      onOutcome?.({ deletedIds: result.deletedIds, failures: result.failed });

      if (result.failed.length === 0) {
        toast.success(`${deleted} ${noun} deleted`);
        return;
      }

      if (deleted === 0) {
        toast.error(`No ${itemLabel.many} were deleted. ${result.failed[0]?.message ?? ''}`.trim());
        return;
      }

      toast.warning(`${deleted} ${noun} deleted, ${result.failed.length} could not be.`);
    },
  });

  const { mutate } = mutation;

  const run = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      mutate(ids);
    },
    [mutate]
  );

  const reset = useCallback(() => setFailures([]), []);

  return { failures, isPending: mutation.isPending, reset, run };
}
