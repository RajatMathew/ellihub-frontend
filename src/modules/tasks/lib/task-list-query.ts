import type { ListTasksParams } from '@/modules/tasks/schemas/task.schema';

/**
 * The task list's query string.
 *
 * The API nests list filters under `filter[...]`; callers pass a plain params
 * object and this flattens it. Kept here rather than beside the request so it
 * can be tested without dragging in the axios client — see
 * `tests/mail-thread-tasks.test.ts`.
 *
 * `conversationKey` and `accountId` name the mail thread a task was raised
 * from. They travel together: a conversation key is only unique within a
 * mailbox, and the server ignores `accountId` on its own rather than answering
 * with every task that mailbox ever raised.
 */
export function toTaskListQuery(params: ListTasksParams) {
  const {
    status,
    priority,
    assigneeId,
    entityType,
    entityId,
    conversationKey,
    accountId,
    ...rest
  } = params;

  return {
    ...rest,
    ...(status ? { 'filter[status]': status } : {}),
    ...(priority ? { 'filter[priority]': priority } : {}),
    ...(assigneeId ? { 'filter[assigneeId]': assigneeId } : {}),
    ...(entityType ? { 'filter[entityType]': entityType } : {}),
    ...(entityId ? { 'filter[entityId]': entityId } : {}),
    ...(conversationKey ? { 'filter[conversationKey]': conversationKey } : {}),
    ...(accountId ? { 'filter[accountId]': accountId } : {}),
  };
}
