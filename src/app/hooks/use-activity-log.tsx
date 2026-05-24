import { useMemo } from 'react';

import { activityLogApi, type ListActivityLogParams } from '@/app/api/activity-log.api';
import type { ActivityPanelItem } from '@/app/components/activity-panel';
import { activityLogKeys } from '@/app/hooks/activity-log.keys';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Pencil, PlusCircle, Trash2 } from 'lucide-react';

export { activityLogKeys };

export function useActivityLogQuery(params?: ListActivityLogParams) {
  return useQuery({
    queryKey: activityLogKeys.list(params),
    queryFn: () => activityLogApi.list(params),
    enabled: !params?.entityType || Boolean(params.entityId),
  });
}

export function useActivityPanelItems(entityType: string, entityId: string | undefined) {
  const query = useActivityLogQuery({
    entityType,
    entityId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    size: 50,
  });

  const items = useMemo<ActivityPanelItem[]>(() => {
    return (query.data?.data ?? []).map((log) => activityLogToPanelItem(log));
  }, [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useEmployeeActivityPanelItems(employeeId: string | undefined) {
  const query = useQuery({
    queryKey: [...activityLogKeys.all, 'employee', employeeId, { size: 100 }],
    queryFn: () => activityLogApi.listForEmployee(employeeId!, { size: 100 }),
    enabled: !!employeeId,
  });

  const items = useMemo<ActivityPanelItem[]>(() => {
    return (query.data?.data ?? []).map((log) => activityLogToPanelItem(log));
  }, [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

function activityLogToPanelItem(log: {
  id: string;
  action: string;
  description: string;
  createdAt?: string;
  user?: { name?: string | null } | null;
}): ActivityPanelItem {
  const action = log.action.toLowerCase();
  const base = {
    id: log.id,
    user: log.user?.name ?? 'System',
    action: log.description,
    timestamp: formatActivityTimestamp(log.createdAt),
  };

  if (action.includes('create')) {
    return {
      ...base,
      icon: <PlusCircle className="size-4 text-primary" />,
      toneClassName: 'border-primary/20 bg-primary/5',
    };
  }

  if (action.includes('update')) {
    return {
      ...base,
      icon: <Pencil className="size-4 text-info" />,
      toneClassName: 'border-info/20 bg-info/5',
    };
  }

  if (action.includes('delete') || action.includes('archive') || action.includes('deactivate')) {
    return {
      ...base,
      icon: <Trash2 className="size-4 text-destructive" />,
      toneClassName: 'border-destructive/20 bg-destructive/5',
    };
  }

  if (action.includes('assign') || action.includes('link') || action.includes('unlink')) {
    return {
      ...base,
      icon: <CheckCircle2 className="size-4 text-success" />,
      toneClassName: 'border-success/20 bg-success/5',
    };
  }

  return {
    ...base,
    icon: <Clock className="size-4 text-muted-foreground" />,
    toneClassName: 'border-muted-foreground/20 bg-muted/30',
  };
}

function formatActivityTimestamp(timestamp: string | undefined) {
  if (!timestamp) return '-';

  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
