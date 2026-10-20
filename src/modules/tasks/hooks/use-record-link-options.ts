import type { RecordOptionsSource } from '@/modules/email/components/record-links/linked-records-field';
import { tasksApi } from '@/modules/tasks/api/tasks.api';
import { taskKeys } from '@/modules/tasks/constants/tasks.keys';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/**
 * The records the task and event modals can link to (elli-ui#1379), searched
 * as the reader types. One request per term and tab; a tab already visited
 * answers from the cache.
 */
export const useRecordLinkOptions: RecordOptionsSource = (search, types) => {
  const query = useQuery({
    queryKey: taskKeys.linkOptions(search, types.join(',')),
    queryFn: ({ signal }) => tasksApi.linkOptions({ search, types, signal }),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
  };
};
