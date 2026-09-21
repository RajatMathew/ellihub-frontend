import { toastApiError } from '@/app/lib/toast-api-error';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import {
  patchTaskInBoard,
  removeTaskFromBoard,
  upsertTaskInBoard,
} from '@/modules/tasks/lib/task-cache';
import type {
  CreateTaskInput,
  ListTasksParams,
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

/**
 * The tasks raised from one mail thread, for the mailbox's details panel.
 *
 * A thread is not an entity, so this reads through the task's email references
 * — `filter[conversationKey]` plus the mailbox that key belongs to. A thread
 * carries a handful of tasks at most, so one page is the whole list.
 */
export const useThreadTasksQuery = (accountId?: string, conversationKey?: string | null) => {
  const params: ListTasksParams = {
    page: 1,
    size: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    accountId,
    conversationKey: conversationKey ?? undefined,
  };

  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => tasksApi.list(params),
    enabled: Boolean(accountId && conversationKey),
  });
};

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
export function writeTask(queryClient: QueryClient, task: Task) {
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
      // `writeTask` patches the boards and the detail, which is everything the
      // board needs. The lists are a different shape and a different key, so
      // they have to be asked again — without this the mailbox panel kept
      // showing the thread's tasks as they were before the one just created,
      // right under its own "Task created" toast (elli-ui#983).
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
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

// Undo, for the toast the delete raises. The server keeps the row, so this only
// has to clear the flag — there is nothing to rebuild.
/**
 * Tick a task off, or reopen it, from outside the board.
 *
 * The board drives completion through its outbox, which batches ops and
 * rewrites the cached columns — machinery that only makes sense where those
 * columns are on screen. The mail thread's panel has one row and no board, so
 * it calls the endpoint directly and invalidates what it showed
 * (elli-ui#1057). Boards go too: a task ticked here has moved column, and a
 * board left open behind the reading pane should not still show it as open.
 */
export const useSetTaskCompletedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      tasksApi.setCompleted(id, completed),
    onSuccess: async (task) => {
      writeTask(queryClient, task);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.boards() }),
      ]);
    },
    onError: (error) => toastApiError(error, 'Failed to update task'),
  });
};

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
