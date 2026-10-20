import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { toastUndoable } from '@/app/components/toast-undoable';
import { toastApiError } from '@/app/lib/toast-api-error';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { useRestoreTaskMutation, writeBatchReply } from '@/modules/tasks/hooks/tasks.hooks';
import { toWire, type TaskOp } from '@/modules/tasks/lib/task-ops';
import {
  enqueue,
  flushesNow,
  nextBatch,
  OUTBOX_IDLE_MS,
  OUTBOX_MAX_OPS,
  settle,
} from '@/modules/tasks/lib/task-outbox';
import type { TaskBatchResult } from '@/modules/tasks/schemas/task.schema';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * The board's outbox: what the person did, on its way to the server.
 *
 * Every action on a card becomes an op here. The board renders the server's
 * rows with the pending ops applied on top, so the screen updates in the
 * gesture's own frame; only the network batches. Ops go out together after a
 * short idle, or at once for a tick or a delete, or when the tab is leaving -
 * see task-outbox for the rules and task-ops for what an op is.
 *
 * A reply confirms ops by writing their rows into the server board - or, for
 * a delete, taking the row out - and dropping them from the list. A refused
 * op is dropped and reported; with it
 * gone the board re-derives without it, which is the rollback. A batch with
 * no reply at all - the connection went - is kept and sent again, and the
 * server answers a replayed op from what it stored the first time.
 */
export interface TaskOutbox {
  /** Everything the server has not confirmed, in the order it happened. */
  pending: readonly TaskOp[];
  /** Record an action. It shows on the board immediately. */
  dispatch: (op: DistributiveOmit<TaskOp, 'opId'>) => void;
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

// How long to wait before sending a batch again after the network failed.
const RETRY_MS = [1_000, 3_000, 10_000, 30_000];

export function useTaskOutbox(): TaskOutbox {
  const queryClient = useQueryClient();
  // Read through a ref: useMutation hands back a new object every render, and
  // a flush that depended on it would be a new function every render too -
  // re-running the effect below, whose cleanup clears the idle timer that the
  // dispatch just set. The queue then only ever left on a tick.
  const restoreTask = useRestoreTaskMutation();
  const restore = useRef(restoreTask);
  // Updated after each render, not during it; the undo toast that reads it
  // cannot fire before this commit's layout effects have run.
  useLayoutEffect(() => {
    restore.current = restoreTask;
  });

  // The queue lives in a ref so the timers and the reply handler always see
  // the latest; the state mirror is what the board renders from.
  const queue = useRef<TaskOp[]>([]);
  const [pending, setPending] = useState<readonly TaskOp[]>([]);
  const inFlight = useRef(new Set<string>());
  const idleTimer = useRef<number | null>(null);
  const retryTimer = useRef<number | null>(null);
  const retries = useRef(0);
  const flushRequested = useRef(false);

  const publish = useCallback(() => setPending(queue.current), []);

  const settleResults = useCallback(
    (results: TaskBatchResult[]) => {
      const { pending: remaining, confirmed, failed } = settle(queue.current, results);

      // Rows first, then the queue: the board must never render a moment
      // where an op is gone from the list but its row not yet written in -
      // or, for a delete, its row not yet taken out.
      writeBatchReply(queryClient, results, confirmed);
      queue.current = remaining;
      publish();

      for (const { op, error } of failed) {
        toast.error(error?.message ?? `Failed to ${describe(op)}`);
      }
      for (const op of confirmed) {
        if (op.type === 'complete') {
          toast.success(op.completed ? 'Task completed' : 'Task reopened');
        }
        if (op.type === 'delete') {
          toastUndoable({
            icon: 'trash',
            title: 'Task deleted',
            description: op.title,
            onUndo: () => restore.current.mutate(op.id),
          });
        }
      }
    },
    [publish, queryClient]
  );

  const flush = useCallback(
    // Named so the retry timer below can call it; referring to `flush` inside
    // its own initializer reads the binding before it is declared.
    async function flushQueue({ keepalive = false } = {}): Promise<void> {
      if (idleTimer.current) {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
      // One batch on the wire at a time keeps the server applying things in
      // the order they happened. Anything added meanwhile goes in the next.
      if (inFlight.current.size > 0) {
        flushRequested.current = true;
        return;
      }
      const batch = nextBatch(queue.current, inFlight.current);
      if (batch.length === 0) return;

      for (const op of batch) inFlight.current.add(op.opId);
      try {
        const { results } = await tasksApi.batch(batch.map(toWire), { keepalive });
        retries.current = 0;
        settleResults(results);
      } catch (error: unknown) {
        // No reply: keep the ops and try again. A replayed op is safe - the
        // server answers it from what it stored the first time.
        const wait = RETRY_MS[Math.min(retries.current, RETRY_MS.length - 1)];
        retries.current += 1;
        if (retries.current === 1) toastApiError(error, 'Could not save your changes, retrying');
        retryTimer.current = window.setTimeout(() => void flushQueue(), wait);
      } finally {
        for (const op of batch) inFlight.current.delete(op.opId);
      }

      if (flushRequested.current) {
        flushRequested.current = false;
        void flushQueue();
      }
    },
    [settleResults]
  );

  const dispatch = useCallback<TaskOutbox['dispatch']>(
    (draft) => {
      const op = { ...draft, opId: crypto.randomUUID() } as TaskOp;
      queue.current = enqueue(queue.current, op, inFlight.current);
      publish();

      if (flushesNow(op) || nextBatch(queue.current, inFlight.current).length >= OUTBOX_MAX_OPS) {
        void flush();
        return;
      }
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => void flush(), OUTBOX_IDLE_MS);
    },
    [flush, publish]
  );

  // Leaving the page with unsent work: send it in a request the browser
  // keeps alive past the tab, and warn if the person is about to close it.
  useEffect(() => {
    const onPageHide = () => {
      if (queue.current.length > 0) void flush({ keepalive: true });
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (queue.current.length > 0) event.preventDefault();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      // Leaving the board for another screen unmounts this hook, and the
      // queue with it. The page is still alive, so a plain flush gets the
      // unsent ops out; the reply still lands in the query cache.
      if (queue.current.length > 0) void flush();
    };
  }, [flush]);

  return useMemo(() => ({ pending, dispatch }), [pending, dispatch]);
}

function describe(op: TaskOp): string {
  switch (op.type) {
    case 'update':
      return 'update the task';
    case 'shiftDueDate':
      return 'move the due date';
    case 'reorder':
      return 'move the task';
    case 'complete':
      return op.completed ? 'complete the task' : 'reopen the task';
    case 'delete':
      return 'delete the task';
  }
}
