import { z } from 'zod';

export const taskPrioritySchema = z.enum(['P1', 'P2', 'P3']);
export const taskStatusSchema = z.enum(['OPEN', 'COMPLETED']);
export const taskCourtSchema = z.enum(['OURS', 'THEIRS']);

export const taskEntityTypeSchema = z.enum([
  'project',
  'rfq',
  'purchaseOrder',
  'primeChangeOrder',
  'subChangeOrder',
  'invoice',
]);

export const taskEntityLinkSchema = z.object({
  entityType: taskEntityTypeSchema,
  entityId: z.string(),
});

export const taskEmailReferenceSchema = z.object({
  accountId: z.string(),
  providerId: z.string(),
  conversationKey: z.string().nullish(),
  threadId: z.string().nullish(),
  subject: z.string().nullish(),
  fromEmail: z.string().nullish(),
});

export const taskAssigneeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullish(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  court: taskCourtSchema,
  dueAt: z.string().nullish(),
  dueHasTime: z.boolean(),
  completedAt: z.string().nullish(),
  assigneeId: z.string().nullish(),
  assignee: taskAssigneeSchema.nullish(),
  entityLinks: z.array(taskEntityLinkSchema).default([]),
  emailReferences: z.array(taskEmailReferenceSchema).default([]),
  // Where someone dragged this card to within its priority block. Null means
  // nobody has, and the board falls back to creation time — see taskOrderKey.
  boardOrder: z.number().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taskPaginationSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const taskPaginatedResponseSchema = z.object({
  data: z.array(taskSchema),
  pagination: taskPaginationSchema,
});

/**
 * The board as the server serves it: five columns, each grouped, ordered and
 * capped, with the true count so a cut-short column can say so. `today` is the
 * caller's local date the columns were cut on; `people` is everyone holding a
 * task, filter or no filter, for the pills.
 */
export const taskColumnIdSchema = z.enum([
  'OVERDUE',
  'DUE_TODAY',
  'TOMORROW',
  'PENDING',
  'COMPLETED',
]);

export const taskBoardColumnSchema = z.object({
  tasks: z.array(taskSchema),
  total: z.number(),
});

export const taskBoardSchema = z.object({
  today: z.string(),
  columns: z.object({
    OVERDUE: taskBoardColumnSchema,
    DUE_TODAY: taskBoardColumnSchema,
    TOMORROW: taskBoardColumnSchema,
    PENDING: taskBoardColumnSchema,
    COMPLETED: taskBoardColumnSchema,
  }),
  people: z.array(z.object({ id: z.string(), name: z.string() })),
});

/** Someone a task can be handed to: an employee with a login. */
export const taskAssigneeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.enum(['ACTIVE', 'ON_LEAVE']),
});

/** One op's outcome in a batch reply. `task` is null for a delete. */
export const taskBatchResultSchema = z.discriminatedUnion('ok', [
  z.object({
    opId: z.string(),
    ok: z.literal(true),
    type: z.string(),
    task: taskSchema.nullable(),
    touched: z.array(taskSchema),
  }),
  z.object({
    opId: z.string(),
    ok: z.literal(false),
    type: z.string(),
    error: z.object({ message: z.string(), status: z.number() }),
  }),
]);

export const taskBatchResponseSchema = z.object({
  results: z.array(taskBatchResultSchema),
});

/** What a reorder answers with: the moved card, and any others re-spaced with it. */
export const taskReorderResultSchema = z.object({
  task: taskSchema,
  touched: z.array(taskSchema),
});

// What the create/edit dialog binds to. Kept separate from the API payload:
// the form holds the date and time as the two native inputs produce them
// ("2026-09-15" and "14:30"), and the mapper turns them into the single ISO
// instant the API stores.
export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().trim().max(5000, 'Description is too long'),
  priority: taskPrioritySchema,
  court: taskCourtSchema,
  // TEMPORARILY REQUIRED — the "No due date" column is commented out in
  // lib/task-board.ts, so a task saved without one would have nowhere to show on
  // the board. Restore `dueDate: z.string()` ("empty means the task has no due
  // date at all") and the refine below when that column comes back.
  dueDate: z.string().min(1, 'Due date is required'),
  // TEMPORARILY REQUIRED alongside the date, so every task carries a full
  // timestamp and the board can order without ties it cannot resolve.
  // Restore `dueTime: z.string()` ("empty means it is due that day, with no
  // particular time") when the "No due date" column comes back.
  dueTime: z.string().min(1, 'Due time is required'),
  assigneeId: z.string(),
});
// A time on its own has nothing to anchor it to, so ask for the day first.
// Unreachable while dueDate is required — it can no longer be empty.
// .refine((values) => !values.dueTime || Boolean(values.dueDate), {
//   path: ['dueDate'],
//   message: 'Pick a due date before setting a time',
// });

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskCourt = z.infer<typeof taskCourtSchema>;
export type TaskEntityType = z.infer<typeof taskEntityTypeSchema>;
export type TaskEntityLink = z.infer<typeof taskEntityLinkSchema>;
export type TaskEmailReference = z.infer<typeof taskEmailReferenceSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskPaginatedResponse = z.infer<typeof taskPaginatedResponseSchema>;
export type TaskColumnId = z.infer<typeof taskColumnIdSchema>;
export type TaskBoardColumn = z.infer<typeof taskBoardColumnSchema>;
export type TaskBoard = z.infer<typeof taskBoardSchema>;
export type TaskReorderResult = z.infer<typeof taskReorderResultSchema>;
export type TaskBatchResult = z.infer<typeof taskBatchResultSchema>;
export type TaskAssigneeOption = z.infer<typeof taskAssigneeOptionSchema>;
export type TaskBatchResponse = z.infer<typeof taskBatchResponseSchema>;

/**
 * What the board asks for. `tz` and `today` are the browser's: the server cuts
 * the columns on the caller's day, and the day is part of the key so a board
 * left open overnight fetches afresh rather than showing yesterday's columns.
 */
export type TaskBoardParams = {
  tz: string;
  today: string;
  assigneeId?: string;
  limit?: number;
};
export type TaskFormData = z.infer<typeof taskFormSchema>;

/** The filters a task list accepts, without the paging the board does not use. */
export type TaskFilters = Omit<ListTasksParams, 'page' | 'size'>;

export type ListTasksParams = {
  page: number;
  size: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  entityType?: TaskEntityType;
  entityId?: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  court: TaskCourt;
  dueAt?: string | null;
  dueHasTime: boolean;
  assigneeId?: string | null;
  entityLinks?: TaskEntityLink[];
  emailReferences?: TaskEmailReference[];
};

export type UpdateTaskInput = Partial<CreateTaskInput> & { id: string };
