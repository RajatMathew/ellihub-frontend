import type { ListActivityLogParams } from '@/app/api/activity-log.api';

export const activityLogKeys = {
  all: ['activity-log'] as const,
  list: (params?: ListActivityLogParams) => [...activityLogKeys.all, 'list', params] as const,
};
