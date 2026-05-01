import { useMemo } from 'react';

import type { ContactActivityItem } from '@/modules/directory/components/contacts/detail/contact-detail.types';
import { useActivityLogQuery } from '@/modules/directory/hooks/activity.hooks';
import { CheckCircle2, Clock, Pencil, PlusCircle, Trash2 } from 'lucide-react';

export function useContactActivity(contactId: string | undefined) {
  const query = useActivityLogQuery({
    entityType: 'contact',
    entityId: contactId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    size: 50,
  });

  const items = useMemo<ContactActivityItem[]>(() => {
    return (query.data?.data ?? []).map((log) => {
      const action = log.action.toLowerCase();

      if (action.includes('create')) {
        return {
          id: log.id,
          user: log.user?.name ?? 'System',
          action: log.description,
          timestamp: formatActivityTimestamp(log.createdAt),
          icon: <PlusCircle className="size-4 text-primary" />,
          toneClassName: 'border-primary/20 bg-primary/5',
        };
      }

      if (action.includes('update')) {
        return {
          id: log.id,
          user: log.user?.name ?? 'System',
          action: log.description,
          timestamp: formatActivityTimestamp(log.createdAt),
          icon: <Pencil className="size-4 text-info" />,
          toneClassName: 'border-info/20 bg-info/5',
        };
      }

      if (action.includes('delete') || action.includes('archive')) {
        return {
          id: log.id,
          user: log.user?.name ?? 'System',
          action: log.description,
          timestamp: formatActivityTimestamp(log.createdAt),
          icon: <Trash2 className="size-4 text-destructive" />,
          toneClassName: 'border-destructive/20 bg-destructive/5',
        };
      }

      if (action.includes('link') || action.includes('unlink')) {
        return {
          id: log.id,
          user: log.user?.name ?? 'System',
          action: log.description,
          timestamp: formatActivityTimestamp(log.createdAt),
          icon: <CheckCircle2 className="size-4 text-success" />,
          toneClassName: 'border-success/20 bg-success/5',
        };
      }

      return {
        id: log.id,
        user: log.user?.name ?? 'System',
        action: log.description,
        timestamp: formatActivityTimestamp(log.createdAt),
        icon: <Clock className="size-4 text-muted-foreground" />,
        toneClassName: 'border-muted-foreground/20 bg-muted/30',
      };
    });
  }, [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
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
