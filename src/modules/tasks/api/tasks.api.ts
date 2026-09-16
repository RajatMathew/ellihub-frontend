import api from '@/app/api';
import {
  taskBatchResponseSchema,
  taskBoardSchema,
  taskPaginatedResponseSchema,
  taskReorderResultSchema,
  taskSchema,
  type CreateTaskInput,
  type ListTasksParams,
  type Task,
  type TaskBatchResponse,
  type TaskBoard,
  type TaskBoardParams,
  type TaskPaginatedResponse,
  type TaskReorderResult,
  type UpdateTaskInput,
} from '@/modules/tasks/schemas/task.schema';

const BASE = '/task';

// The API nests list filters under filter[...]; flatten them here so callers
// pass a plain params object.
function toQuery(params: ListTasksParams) {
  const { status, priority, assigneeId, entityType, entityId, ...rest } = params;
  return {
    ...rest,
    ...(status ? { 'filter[status]': status } : {}),
    ...(priority ? { 'filter[priority]': priority } : {}),
    ...(assigneeId ? { 'filter[assigneeId]': assigneeId } : {}),
    ...(entityType ? { 'filter[entityType]': entityType } : {}),
    ...(entityId ? { 'filter[entityId]': entityId } : {}),
  };
}

export const tasksApi = {
  async list(params: ListTasksParams): Promise<TaskPaginatedResponse> {
    const res = await api.get(BASE, { params: toQuery(params) });
    const body = res.data?.data?.data ? res.data.data : res.data;
    const pagination = body?.pagination ?? {};
    return taskPaginatedResponseSchema.parse({
      data: body?.data ?? [],
      pagination: {
        currentPage: pagination.currentPage ?? params.page,
        totalPages: pagination.totalPages ?? 1,
        totalItems: pagination.totalItems ?? (Array.isArray(body?.data) ? body.data.length : 0),
        hasNextPage: pagination.hasNextPage ?? false,
        hasPreviousPage: pagination.hasPreviousPage ?? false,
      },
    });
  },

  /**
   * The board, as the server draws it: five columns already grouped, ordered
   * and capped, plus everyone who holds a task. One request, however many
   * tasks there are - the client used to walk the paginated list to the end
   * and group it itself.
   */
  async board(params: TaskBoardParams): Promise<TaskBoard> {
    const res = await api.get(`${BASE}/board`, {
      params: {
        tz: params.tz,
        ...(params.assigneeId && { assigneeId: params.assigneeId }),
        ...(params.limit && { limit: params.limit }),
      },
    });
    return taskBoardSchema.parse(res.data?.data ?? res.data);
  },

  async getById(id: string): Promise<Task> {
    const res = await api.get(`${BASE}/${id}`);
    return taskSchema.parse(res.data?.data ?? res.data);
  },

  async create(data: CreateTaskInput): Promise<Task> {
    const res = await api.post(BASE, data);
    return taskSchema.parse(res.data?.data ?? res.data);
  },

  async update(data: UpdateTaskInput): Promise<Task> {
    const res = await api.put(BASE, data);
    return taskSchema.parse(res.data?.data ?? res.data);
  },

  async setCompleted(id: string, completed: boolean): Promise<Task> {
    const res = await api.patch(`${BASE}/complete`, { id, completed });
    return taskSchema.parse(res.data?.data ?? res.data);
  },

  async shiftDueDate(id: string, days: number): Promise<Task> {
    const res = await api.patch(`${BASE}/shift-due-date`, { id, days });
    return taskSchema.parse(res.data?.data ?? res.data);
  },

  // Soft on the server: the row keeps its links and its email provenance, and
  // `restore` below is what brings it back.
  async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  // A card dragged up or down within its column. The two neighbours are what is
  // sent, not an index: the server places the card between two rows it looks up
  // itself, so it never has to agree with the board about the column's contents.
  async reorder(
    id: string,
    previousId: string | null,
    nextId: string | null,
    dueAt?: string
  ): Promise<TaskReorderResult> {
    const res = await api.patch(`${BASE}/reorder`, {
      id,
      previousId,
      nextId,
      // Only when the card changed column. Sent with the placement rather than
      // as its own update so the card cannot land by age and then jump.
      ...(dueAt !== undefined && { dueAt, dueHasTime: false }),
    });
    // `data` is the moved card; `touched` rides beside it and lists any other
    // cards a re-space renumbered, so the board can patch them in too.
    return taskReorderResultSchema.parse({
      task: res.data?.data,
      touched: res.data?.touched ?? [],
    });
  },

  /**
   * Several writes in one request, applied in order - the outbox's flush.
   * `keepalive` is for the flush on the way out of the page: the browser
   * lets a keepalive request finish after the tab has gone, which axios
   * cannot ask for, so that one goes through fetch.
   */
  async batch(
    ops: Record<string, unknown>[],
    { keepalive = false }: { keepalive?: boolean } = {}
  ): Promise<TaskBatchResponse> {
    if (keepalive) {
      const res = await fetch(`${api.defaults.baseURL}${BASE}/batch`, {
        method: 'PATCH',
        credentials: 'include',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ops }),
      });
      if (!res.ok) throw new Error(`Batch failed: ${res.status}`);
      const body: unknown = await res.json();
      return taskBatchResponseSchema.parse((body as { data?: unknown }).data ?? body);
    }
    const res = await api.patch(`${BASE}/batch`, { ops });
    return taskBatchResponseSchema.parse(res.data?.data ?? res.data);
  },

  async restore(id: string): Promise<Task> {
    const res = await api.patch(`${BASE}/restore`, { id });
    return taskSchema.parse(res.data?.data ?? res.data);
  },
};
