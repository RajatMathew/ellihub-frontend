import { useMemo } from 'react';

import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import { assigneeOptions } from '@/modules/tasks/lib/task-assignees';
import { useQuery } from '@tanstack/react-query';

/**
 * The people a task can be handed to, as picker options.
 *
 * The pickers used to borrow the HR employee list. That list is the personnel
 * record and is gated on employee:read, which only admins hold - so for every
 * other role the request came back 403 and the menu said "No employees
 * found". This reads the task module's own list instead, gated on task:read,
 * which every role has, and carries only what a picker draws.
 *
 * One request for everyone, filtered here: a company has tens of employees,
 * not thousands, and the card menu never searched anyway. The shape matches
 * what the paged picker returned so both pickers swap in without change.
 */
export function useTaskAssigneeOptions({
  search = '',
  selectedOptions,
  enabled = true,
}: {
  search?: string;
  selectedOptions?: InfiniteSearchSelectOption[];
  enabled?: boolean;
} = {}) {
  const query = useQuery({
    queryKey: taskKeys.assignees(),
    queryFn: () => tasksApi.assignees(),
    enabled,
    // Who works here changes rarely; a board open all day need not re-ask.
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo(
    () => assigneeOptions(query.data ?? [], search, selectedOptions),
    [query.data, search, selectedOptions]
  );

  return {
    options,
    isLoading: query.isLoading,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => undefined,
  };
}
