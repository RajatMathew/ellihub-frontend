import { useMemo } from 'react';

import {
  activityLogApi,
  type ActivityLogItem,
  type ListActivityLogParams,
} from '@/app/api/activity-log.api';
import type { ActivityPanelItem } from '@/app/components/activity-panel';
import { activityLogKeys } from '@/app/hooks/activity-log.keys';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Pencil, PlusCircle, Trash2 } from 'lucide-react';

export { activityLogKeys };

export function useActivityLogQuery(
  params?: ListActivityLogParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: activityLogKeys.list(params),
    queryFn: () => activityLogApi.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useActivityPanelItems(
  entityType: string,
  entityId: string | undefined,
  options?: { entityName?: string }
) {
  const query = useActivityLogQuery({
    entityType,
    entityId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    size: 50,
  }, { enabled: Boolean(entityId) });

  const items = useMemo<ActivityPanelItem[]>(() => {
    return dedupeMirroredActivity(query.data?.data ?? []).map((log) =>
      activityLogToPanelItem(log, {
        entityType,
        entityName: options?.entityName,
      })
    );
  }, [entityType, options?.entityName, query.data]);

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
    return dedupeMirroredActivity(query.data?.data ?? []).map((log) =>
      activityLogToPanelItem(log)
    );
  }, [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

function dedupeMirroredActivity(logs: ActivityLogItem[]) {
  const seen = new Set<string>();

  return logs.filter((log) => {
    const key = getMirroredActivityKey(log);
    if (!key) return true;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getMirroredActivityKey(log: ActivityLogItem) {
  if (!isMirroredActivity(log)) return null;

  const timestamp = log.createdAt ? new Date(log.createdAt).getTime() : 0;
  const timestampBucket = Number.isFinite(timestamp) ? Math.floor(timestamp / 5000) : 0;

  return [
    log.action.toLowerCase(),
    log.description.trim().toLowerCase(),
    log.user?.id ?? log.user?.name ?? 'system',
    timestampBucket,
  ].join('|');
}

function isMirroredActivity(log: ActivityLogItem) {
  const description = log.description.trim().toLowerCase();

  return (
    description.startsWith('linked contact ') ||
    description.startsWith('unlinked contact ') ||
    description.startsWith('marked contact ') ||
    description.startsWith('removed contact ') ||
    /^assigned .+ to department\b/.test(description) ||
    /^removed .+ from department\b/.test(description) ||
    /^unassigned .+ from department\b/.test(description)
  );
}

interface ActivityPanelContext {
  entityType?: string;
  entityName?: string;
}

function activityLogToPanelItem(log: {
  id: string;
  action: string;
  description: string;
  createdAt?: string;
  user?: { name?: string | null } | null;
}, context?: ActivityPanelContext): ActivityPanelItem {
  const action = log.action.toLowerCase();
  const base = {
    id: log.id,
    user: log.user?.name ?? 'System',
    action: formatPanelActivityDescription(log.description, context),
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

function formatPanelActivityDescription(description: string, context?: ActivityPanelContext) {
  if (context?.entityType !== 'department' || !context.entityName) return description;

  const match = description.match(/^Assigned (.+) to department (.+)$/i);
  if (!match) return description;

  const [, employeeName, assignedDepartmentName] = match;
  if (normalizeActivityName(assignedDepartmentName) === normalizeActivityName(context.entityName)) {
    return description;
  }

  return `Unassigned ${employeeName} from this department.`;
}

function normalizeActivityName(value: string) {
  return value.trim().replace(/\.$/, '').toLowerCase();
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
