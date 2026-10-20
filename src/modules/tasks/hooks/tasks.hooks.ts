import { toastApiError } from '@/app/lib/toast-api-error';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import { buildOptimisticTask, newOptimisticTaskId } from '@/modules/tasks/lib/optimistic-task';
import {
  boardWantsTask,
  insertTaskInList,
  listWantsTask,
  patchTaskInBoard,
  patchTaskInList,
  removeTaskFromBoard,
  removeTaskFromList,
  replaceTaskInList,
  upsertTaskInBoard,
} from '@/modules/tasks/lib/task-cache';
import { type TaskOp } from '@/modules/tasks/lib/task-ops';
import { applyBatchReply, replyRows } from '@/modules/tasks/lib/task-outbox';
import type {
  CreateTaskInput,
  ListTasksParams,
  Task,
  TaskBatchResult,
  TaskBoard,
  TaskBoardParams,
  TaskPaginatedResponse,
  UpdateTaskInput,
} from '@/modules/tasks/schemas/task.schema';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
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
 *
 * A change of filter is a new key, and without `placeholderData` a new key
 * has no data until the server answers. The view drew that gap as a
 * skeleton and unmounted the filter bar - taking the people picker down in
 * the middle of somebody ticking their third name. The last board stays up
 * until the next one lands.
 */
export const useTaskBoardQuery = (params: TaskBoardParams) =>
  useQuery({
    queryKey: taskKeys.board(params),
    // Cancellable: a search typed past is dropped rather than left racing.
    queryFn: ({ signal }) => tasksApi.board(params, signal),
    placeholderData: keepPreviousData,
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

/** The cached lists, each with the params it was fetched for. */
type CachedList = readonly [key: readonly unknown[], page: TaskPaginatedResponse | undefined];

function cachedLists(queryClient: QueryClient): CachedList[] {
  return queryClient.getQueriesData<TaskPaginatedResponse>({ queryKey: taskKeys.lists() });
}

function listParamsOf(key: readonly unknown[]): ListTasksParams | undefined {
  return key[key.length - 1] as ListTasksParams | undefined;
}

/**
 * Apply an edit to every cached list, leaving each page's own filter intact.
 *
 * The lists are a different shape from the boards and a different key, which
 * is why writing a task used to patch the boards and then ask the server for
 * the lists again — a refetch the reader waited through with the row they had
 * just created still missing (elli-ui#983, then elli-ui#1125). They are
 * written in place now, the same as the boards.
 */
function editLists(
  queryClient: QueryClient,
  edit: (page: TaskPaginatedResponse, params: ListTasksParams | undefined) => TaskPaginatedResponse
) {
  for (const [key, page] of cachedLists(queryClient)) {
    if (!page) continue;
    const next = edit(page, listParamsOf(key));
    if (next !== page) queryClient.setQueryData(key, next);
  }
}

/** Put a task into the lists that would have returned it, and out of the rest. */
export function writeTaskToLists(queryClient: QueryClient, task: Task) {
  editLists(queryClient, (page, params) =>
    listWantsTask(params, task) ? insertTaskInList(page, task) : removeTaskFromList(page, task.id)
  );
}

function patchTaskInLists(queryClient: QueryClient, id: string, patch: Partial<Task>) {
  editLists(queryClient, (page) => patchTaskInList(page, id, patch));
}

async function snapshotLists(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
  return cachedLists(queryClient);
}

function restoreLists(queryClient: QueryClient, snapshot: CachedList[] | undefined) {
  for (const [key, page] of snapshot ?? []) queryClient.setQueryData(key, page);
}

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
    const belongs = boardWantsTask(params, task);
    queryClient.setQueryData<TaskBoard>(
      key,
      belongs ? upsertTaskInBoard(board, task, now) : removeTaskFromBoard(board, task.id)
    );
  }
  queryClient.setQueryData(taskKeys.detail(task.id), task);
}

/**
 * Write a batch's reply into the cache: every cached board gets the rows it
 * carries and loses the tasks it confirmed deleted - see applyBatchReply - and
 * a deleted task's detail entry goes with it.
 */
export function writeBatchReply(
  queryClient: QueryClient,
  results: readonly TaskBatchResult[],
  confirmed: readonly TaskOp[]
) {
  const now = new Date();
  for (const [key, board] of cachedBoards(queryClient)) {
    if (!board) continue;
    queryClient.setQueryData<TaskBoard>(
      key,
      applyBatchReply(board, paramsOf(key), results, confirmed, now)
    );
  }
  for (const row of replyRows(results)) queryClient.setQueryData(taskKeys.detail(row.id), row);
  for (const op of confirmed) {
    if (op.type === 'delete') {
      queryClient.removeQueries({ queryKey: taskKeys.detail(op.id), exact: true });
    }
  }
}

/** Take a task off every cached board — the optimistic row, once confirmed. */
function removeTask(queryClient: QueryClient, id: string) {
  for (const [key, board] of cachedBoards(queryClient)) {
    if (!board) continue;
    const next = removeTaskFromBoard(board, id);
    if (next !== board) queryClient.setQueryData(key, next);
  }
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

/**
 * Raise a task, drawn before it is saved.
 *
 * It used to wait: the form held itself open on "Adding…" for the round trip,
 * and the row only appeared after the lists had been refetched on top of that
 * — two waits in front of a task whose every field the client already had
 * (elli-ui#1125). The row is now built from the payload and written into the
 * lists and boards that would show it, so it appears in the same frame as the
 * click.
 *
 * The row carries a temporary id until the server answers, then the real task
 * replaces it in place. Anything that would address the task by id is held off
 * for that moment — see `isOptimisticTaskId`.
 */
export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => tasksApi.create(data),
    onMutate: async (input) => {
      const [lists, boards] = await Promise.all([
        snapshotLists(queryClient),
        snapshotBoards(queryClient),
      ]);

      const optimistic = buildOptimisticTask(input, {
        id: newOptimisticTaskId(),
        now: new Date(),
        assignee: assigneeFor(queryClient, input.assigneeId),
      });

      writeTaskToLists(queryClient, optimistic);
      writeTask(queryClient, optimistic);

      return { snapshot: { lists, boards }, optimisticId: optimistic.id };
    },
    onSuccess: (task, _input, context) => {
      // In place, not insert-then-remove: the row keeps its position as it is
      // confirmed rather than flickering out and back.
      if (context?.optimisticId) {
        editLists(queryClient, (page, params) =>
          listWantsTask(params, task)
            ? replaceTaskInList(page, context.optimisticId, task)
            : removeTaskFromList(page, context.optimisticId)
        );
        removeTask(queryClient, context.optimisticId);
      }
      writeTask(queryClient, task);
      toast.success('Task created');
    },
    onError: (error, _input, context) => {
      restoreLists(queryClient, context?.snapshot.lists);
      restoreBoards(queryClient, context?.snapshot.boards);
      toastApiError(error, 'Failed to create task');
    },
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
      const [lists, boards] = await Promise.all([
        snapshotLists(queryClient),
        snapshotBoards(queryClient),
      ]);

      const patch: Partial<Task> = { ...fields };
      if (fields.priority !== undefined) patch.boardOrder = null;
      if (fields.dueAt !== undefined) patch.boardOrder = null;
      const assignee = assigneeFor(queryClient, fields.assigneeId);
      if (assignee !== undefined) patch.assignee = assignee;
      patchTaskInLists(queryClient, id, patch);
      patchTask(queryClient, id, patch);

      return { snapshot: { lists, boards } };
    },
    onSuccess: (task) => {
      writeTaskToLists(queryClient, task);
      writeTask(queryClient, task);
      toast.success('Task updated');
    },
    onError: (error, _variables, context) => {
      restoreLists(queryClient, context?.snapshot.lists);
      restoreBoards(queryClient, context?.snapshot.boards);
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
    // The tick is the whole of what the click changes, and the client knows it
    // without asking: status decides both the strike-through and the column.
    // This used to be written only on the way back, and then both query
    // families were invalidated on top — so a tick cost a round trip and two
    // refetches before the box filled in (elli-ui#1125).
    onMutate: async ({ id, completed }) => {
      const [lists, boards] = await Promise.all([
        snapshotLists(queryClient),
        snapshotBoards(queryClient),
      ]);

      const patch: Partial<Task> = {
        status: completed ? 'COMPLETED' : 'OPEN',
        completedAt: completed ? new Date().toISOString() : null,
      };
      patchTaskInLists(queryClient, id, patch);
      patchTask(queryClient, id, patch);

      return { snapshot: { lists, boards } };
    },
    onSuccess: (task) => {
      writeTaskToLists(queryClient, task);
      writeTask(queryClient, task);
    },
    onError: (error, _variables, context) => {
      restoreLists(queryClient, context?.snapshot.lists);
      restoreBoards(queryClient, context?.snapshot.boards);
      toastApiError(error, 'Failed to update task');
    },
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
