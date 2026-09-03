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
export type TaskFormData = z.infer<typeof taskFormSchema>;

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
