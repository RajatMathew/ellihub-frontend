import { toastApiError } from '@/app/lib/toast-api-error';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { toastUndoable } from '@/modules/tasks/components/toast-undoable';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import {
  patchTaskInBoard,
  removeTaskFromBoard,
  upsertTaskInBoard,
} from '@/modules/tasks/lib/task-cache';
import { placeTask, type PlacementRequest } from '@/modules/tasks/lib/task-placement';
import type {
  CreateTaskInput,
  Task,
  TaskBoard,
  TaskBoardParams,
  UpdateTaskInput,
} from '@/modules/tasks/schemas/task.schema';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * The board, as the server draws it.
 *
 * One request for the whole board however many tasks there are: five columns
 * already grouped, ordered and capped, plus the people for the filter pills.
 * The caller's day and zone are in the key, so a board left open overnight
 * fetches afresh when the date turns - see useBoardClock.
 *
 * Nothing below invalidates this query. Every write returns the task it
 * changed and that is patched into the cached board, which is what makes a
 * board of hundreds of cards cost one request to load and none to work on.
 * Which column a written card lands in is decided against the clock at the
 * moment of the write; the board's own clock only differs from that across
 * midnight, when the key changes and the board is fetched afresh anyway.
 */
export const useTaskBoardQuery = (params: TaskBoardParams) =>
  useQuery({
    queryKey: taskKeys.board(params),
    queryFn: () => tasksApi.board(params),
  });

export const useTaskDetailQuery = (id: string) =>
  useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
  });

/** The cached boards, each with the params it was fetched for. */
type CachedBoard = readonly [key: readonly unknown[], board: TaskBoard | undefined];

function cachedBoards(queryClient: QueryClient): CachedBoard[] {
  return queryClient.getQueriesData<TaskBoard>({ queryKey: taskKeys.boards() });
}

function paramsOf(key: readonly unknown[]): TaskBoardParams | undefined {
  return key[key.length - 1] as TaskBoardParams | undefined;
}

/**
 * Write a task into every cached board.
 *
 * A board fetched for one person must not gain a card that was just handed to
 * someone else, so the filter is honoured on the way in: a task that no
 * longer matches a board's filter leaves that board instead.
 */
function writeTask(queryClient: QueryClient, task: Task) {
  const now = new Date();
  for (const [key, board] of cachedBoards(queryClient)) {
    if (!board) continue;
    const params = paramsOf(key);
    const belongs = !params?.assigneeId || task.assigneeId === params.assigneeId;
    queryClient.setQueryData<TaskBoard>(
      key,
      belongs ? upsertTaskInBoard(board, task, now) : removeTaskFromBoard(board, task.id)
    );
  }
  queryClient.setQueryData(taskKeys.detail(task.id), task);
}

function patchTask(queryClient: QueryClient, id: string, patch: Partial<Task>) {
  const now = new Date();
  queryClient.setQueriesData<TaskBoard>({ queryKey: taskKeys.boards() }, (board) =>
    board ? patchTaskInBoard(board, id, patch, now) : board
  );
}

function removeTask(queryClient: QueryClient, id: string) {
  queryClient.setQueriesData<TaskBoard>({ queryKey: taskKeys.boards() }, (board) =>
    board ? removeTaskFromBoard(board, id) : board
  );
}

/**
 * The cached boards as they were, to put back if a write fails.
 *
 * Reads in flight are cancelled first: one landing after the optimistic write
 * would put the card back where it was.
 */
async function snapshotBoards(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: taskKeys.boards() });
  return cachedBoards(queryClient);
}

function restoreBoards(queryClient: QueryClient, snapshot: CachedBoard[] | undefined) {
  for (const [key, board] of snapshot ?? []) queryClient.setQueryData(key, board);
}

/** The assignee object a card shows, from the id the picker hands over. */
function assigneeFor(
  queryClient: QueryClient,
  assigneeId: string | null | undefined
): Task['assignee'] | undefined {
  if (assigneeId === undefined) return undefined;
  if (assigneeId === null) return null;
  for (const [, board] of cachedBoards(queryClient)) {
    const person = board?.people.find((person) => person.id === assigneeId);
    if (person) return { id: person.id, name: person.name };
  }
  return undefined;
}

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => tasksApi.create(data),
    // Not optimistic: the dialog stays open over the wait, and a temporary id
    // that then has to be reconciled buys nothing for that.
    onSuccess: (task) => {
      writeTask(queryClient, task);
      toast.success('Task created');
    },
    onError: (error) => toastApiError(error, 'Failed to create task'),
  });
};

/**
 * A field edit, from the card's menus or the dialog.
 *
 * Priority, court and assignee are changed from the card in one click, and
 * felt slower than ticking a card because they alone waited for the round
 * trip. What was sent is written straight in; a priority change also drops
 * the card's hand-placed position, as the server does, so it re-enters its
 * new block by age rather than settling and then jumping.
 */
export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskInput) => tasksApi.update(data),
    onMutate: async ({ id, entityLinks: _links, emailReferences: _refs, ...fields }) => {
      const snapshot = await snapshotBoards(queryClient);

      const patch: Partial<Task> = { ...fields };
      if (fields.priority !== undefined) patch.boardOrder = null;
      if (fields.dueAt !== undefined) patch.boardOrder = null;
      const assignee = assigneeFor(queryClient, fields.assigneeId);
      if (assignee !== undefined) patch.assignee = assignee;
      patchTask(queryClient, id, patch);

      return { snapshot };
    },
    onSuccess: (task) => {
      writeTask(queryClient, task);
      toast.success('Task updated');
    },
    onError: (error, _variables, context) => {
      restoreBoards(queryClient, context?.snapshot);
      toastApiError(error, 'Failed to update task');
    },
  });
};

// Backs the card's completion circle.
//
// The new status is written into the cache before the request goes out, for the
// reason the shift below spells out: COMPLETED is a column, so the status is
// what moves the card, and it has to move while the tick is still under the
// cursor. Waiting for the round trip left a second of nothing and then a jump,
// which is what made ticking a card look unlike dragging one. A failure puts
// the old status back. See elli-ui#862.
export const useSetTaskCompletedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      tasksApi.setCompleted(id, completed),
    onMutate: async ({ id, completed }) => {
      const snapshot = await snapshotBoards(queryClient);
      patchTask(queryClient, id, {
        status: completed ? 'COMPLETED' : 'OPEN',
        completedAt: completed ? new Date().toISOString() : null,
        // A card that changes column has no place in the block it leaves.
        boardOrder: null,
      });
      return { snapshot };
    },
    onSuccess: (task) => {
      writeTask(queryClient, task);
      toast.success(task.status === 'COMPLETED' ? 'Task completed' : 'Task reopened');
    },
    onError: (error, _variables, context) => {
      restoreBoards(queryClient, context?.snapshot);
      toastApiError(error, 'Failed to update task');
    },
  });
};

// Backs the card's "+1 day" control. Days is signed, so the same hook can pull
// a due date earlier.
//
// The new date is written into the cache before the request goes out. The board
// groups by due date, so that is what moves the card — and it has to happen on
// the click: waiting for the round trip made +1 day look like it had done
// nothing at all. A failure puts the old date back.
export const useShiftTaskDueDateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => tasksApi.shiftDueDate(id, days),
    onMutate: async ({ id, days }) => {
      const snapshot = await snapshotBoards(queryClient);
      queryClient.setQueriesData<TaskBoard>({ queryKey: taskKeys.boards() }, (board) => {
        if (!board) return board;
        const held = boardHas(board, id);
        // No date means no column to move between, and inventing one would put
        // the task somewhere the server never agreed to.
        if (!held?.dueAt) return board;
        const dueAt = new Date(held.dueAt);
        dueAt.setDate(dueAt.getDate() + days);
        return patchTaskInBoard(
          board,
          id,
          { dueAt: dueAt.toISOString(), boardOrder: null },
          new Date()
        );
      });
      return { snapshot };
    },
    onSuccess: (task) => writeTask(queryClient, task),
    onError: (error, _variables, context) => {
      restoreBoards(queryClient, context?.snapshot);
      toastApiError(error, 'Failed to move the due date');
    },
  });
};

function boardHas(board: TaskBoard, id: string): Task | undefined {
  for (const column of Object.values(board.columns)) {
    const task = column.tasks.find((task) => task.id === id);
    if (task) return task;
  }
  return undefined;
}

/**
 * A card dropped somewhere: within its column, or into another with a new
 * date. A card dragged out of Completed is reopened first, then placed - see
 * placeTask for why the order matters and what a failure part-way undoes.
 *
 * A re-space renumbers cards nobody dragged; the server sends those back too,
 * and they are written in with the moved card.
 */
export const useReorderTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardOrder: _boardOrder,
      ...request
    }: PlacementRequest & { boardOrder: number | null }) => placeTask(tasksApi, request),
    onMutate: async ({ id, boardOrder, dueAt, reopen }) => {
      const snapshot = await snapshotBoards(queryClient);
      // Both steps at once, so the card goes straight to the drop rather than
      // showing up reopened on its old date for the length of a round trip.
      patchTask(queryClient, id, {
        boardOrder,
        ...(dueAt !== undefined && { dueAt, dueHasTime: false }),
        ...(reopen && { status: 'OPEN', completedAt: null }),
      });
      return { snapshot };
    },
    onSuccess: ({ task, touched }, { reopen }) => {
      for (const row of touched) writeTask(queryClient, row);
      writeTask(queryClient, task);
      if (reopen) toast.success('Task reopened');
    },
    onError: (error, _variables, context) => {
      restoreBoards(queryClient, context?.snapshot);
      toastApiError(error, 'Failed to move the task');
    },
  });
};

// Undo, for the toast the delete raises. The server keeps the row, so this only
// has to clear the flag — there is nothing to rebuild.
export const useRestoreTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.restore(id),
    onSuccess: (task) => writeTask(queryClient, task),
    // No toast on the way in — the undo toast is still on screen and reports the
    // outcome itself. A failure still needs one, since that is the one case the
    // toast's own success line would be lying about.
    onError: (error) => toastApiError(error, 'Failed to restore the task'),
  });
};

/**
 * Delete a task, with a way back.
 *
 * The delete is soft server-side: `deletedAt` is stamped and the row keeps its
 * links and the email it came from. So the card leaving the board is the only
 * thing that actually happens on the click, and it happens optimistically —
 * an Undo offered next to a card still sitting there reads as a question rather
 * than a reversal.
 *
 * There is no trash view by design (elli-ui#800): this toast is the only way
 * back, which is why it carries the id rather than relying on anything to list
 * deleted tasks later.
 */
export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const restoreTask = useRestoreTaskMutation();

  return useMutation({
    mutationFn: ({ id }: { id: string; title: string }) => tasksApi.delete(id),
    onMutate: async ({ id }) => {
      const snapshot = await snapshotBoards(queryClient);
      removeTask(queryClient, id);
      return { snapshot };
    },
    onError: (error, _id, context) => {
      restoreBoards(queryClient, context?.snapshot);
      toastApiError(error, 'Failed to delete task');
    },
    onSuccess: (_data, { id, title }) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      toastUndoable({
        icon: 'trash',
        title: 'Task deleted',
        description: title,
        onUndo: () => restoreTask.mutate(id),
      });
    },
  });
};
