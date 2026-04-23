import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../api/activity.api';
import type { ListActivityLogParams } from '../schemas/activity.schema';

export const activityKeys = {
  all: ['activity-log'] as const,
  list: (params?: ListActivityLogParams) => [...activityKeys.all, 'list', params] as const,
};

export const useActivityLogQuery = (params?: ListActivityLogParams) =>
  useQuery({
    queryKey: activityKeys.list(params),
    queryFn: () => activityApi.list(params),
  });
