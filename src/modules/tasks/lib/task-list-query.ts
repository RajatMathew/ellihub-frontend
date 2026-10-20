import type { ListTasksParams } from '@/modules/tasks/schemas/task.schema';

/**
 * The task list's query string.
 *
 * Filters travel as one JSON `filter` object, because that is a shape the API
 * actually reads. They used to be sent as `filter[conversationKey]=…` and so
 * on, which looks like the same thing and is not: elli-core's pagination
 * middleware takes filters either from `?filter={json}` or from plain query
 * params of the filter's own name, and a param *literally named*
 * `filter[conversationKey]` matches neither. Every one of them was silently
 * dropped, so the mailbox asked for one thread's tasks and got the
 * organisation's (elli-ui#1057).
 *
 * The undeclared ones — status, priority, assigneeId — are sent the same way.
 * The route's allow-list does not name them yet, so they are still ignored;
 * this at least means the day someone declares one, it works, rather than
 * looking like it already should.
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

  const filter = {
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(conversationKey ? { conversationKey } : {}),
    ...(accountId ? { accountId } : {}),
  };

  return {
    ...rest,
    // Omitted entirely when empty: `filter={}` is a parse for the server to do
    // for no reason, and it shows up in the query string as noise.
    ...(Object.keys(filter).length > 0 ? { filter: JSON.stringify(filter) } : {}),
  };
}
