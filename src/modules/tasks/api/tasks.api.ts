import api from '@/app/api';
import { mergeTaskPages } from '@/modules/tasks/lib/task-pages';
import {
  taskPaginatedResponseSchema,
  taskSchema,
  type CreateTaskInput,
  type ListTasksParams,
  type Task,
  type TaskFilters,
  type TaskPaginatedResponse,
  type UpdateTaskInput,
} from '@/modules/tasks/schemas/task.schema';

const BASE = '/task';

// The server caps a page at 100 (paginationMiddleware's maxSize), so asking for
// more in one request gets silently trimmed rather than refused.
const LIST_PAGE_SIZE = 100;

// A guard against looping forever if pagination ever misreports itself, not a
// ceiling anyone should be hitting.
const LIST_MAX_PAGES = 20;

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
   * Every task the board needs, however many pages that takes.
   *
   * The board groups by due date and orders within a column client-side, so a
   * single page was never enough: it sorted whichever rows arrived and the rest
   * were simply not on the board. Worse, an edit that moved a card later in the
   * server's due-date order pushed it off the page, so `+1 day` looked like it
   * had deleted the task.
   *
   * The server caps a page at 100, so this walks the pages. MAX_PAGES is a
   * runaway guard rather than a product limit — if a tenant ever reaches it the
   * board is showing thousands of cards and wants filtering, not more requests.
   */
  async listAll(filters: TaskFilters = {}): Promise<TaskPaginatedResponse> {
    const pages: TaskPaginatedResponse[] = [];

    for (let page = 1; page <= LIST_MAX_PAGES; page += 1) {
      const result = await this.list({ ...filters, page, size: LIST_PAGE_SIZE });
      pages.push(result);
      if (!result.pagination.hasNextPage) break;
    }

    return mergeTaskPages(pages);
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
  async reorder(id: string, previousId: string | null, nextId: string | null): Promise<Task> {
    const res = await api.patch(`${BASE}/reorder`, { id, previousId, nextId });
    return taskSchema.parse(res.data?.data ?? res.data);
  },

  async restore(id: string): Promise<Task> {
    const res = await api.patch(`${BASE}/restore`, { id });
    return taskSchema.parse(res.data?.data ?? res.data);
  },
};
