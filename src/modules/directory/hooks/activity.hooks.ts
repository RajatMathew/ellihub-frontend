import { activityApi } from '@/modules/directory/api/activity.api';
import type { ListActivityLogParams } from '@/modules/directory/schemas/activity.schema';
import { useQuery } from '@tanstack/react-query';

export const activityKeys = {
  all: ['activity-log'] as const,
  list: (params?: ListActivityLogParams) => [...activityKeys.all, 'list', params] as const,
};

export const useActivityLogQuery = (params?: ListActivityLogParams) =>
  useQuery({
    queryKey: activityKeys.list(params),
    queryFn: () => activityApi.list(params),
    enabled: !params?.entityType || Boolean(params.entityId),
  });
