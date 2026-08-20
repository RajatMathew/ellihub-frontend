import { useMemo } from 'react';

import type { ActivityLogItem } from '@/app/api/activity-log.api';
import {
  ActivityActionBadge,
  ActivityEntityBadge,
  ActivityLogDescriptionCell,
} from '@/modules/activity-log/components/activity-log-cells';
import { formatActivityDate, shortenId } from '@/modules/activity-log/lib/activity-log-utils';
import type { ColumnDef } from '@tanstack/react-table';

export function useActivityLogColumns() {
  return useMemo<ColumnDef<ActivityLogItem>[]>(
    () => [
      {
        id: 'createdAt',
        header: 'Time',
        size: 170,
        cell: ({ row }) => {
          const { date, time } = formatActivityDate(row.original.createdAt);
          return (
            <div className="min-w-36">
              <div className="text-sm font-medium">{date}</div>
              <div className="text-xs text-muted-foreground">{time}</div>
            </div>
          );
        },
      },
      {
        id: 'user',
        header: 'User',
        size: 220,
        cell: ({ row }) => (
          <div className="min-w-40">
            <div className="text-sm font-medium">{row.original.user?.name ?? 'System'}</div>
            {row.original.user?.email && (
              <div className="text-xs text-muted-foreground">{row.original.user.email}</div>
            )}
          </div>
        ),
      },
      {
        id: 'action',
        header: 'Action',
        size: 130,
        cell: ({ row }) => <ActivityActionBadge action={row.original.action} />,
      },
      {
        id: 'entityType',
        header: 'Entity',
        size: 180,
        cell: ({ row }) => <ActivityEntityBadge entityType={row.original.entityType} />,
      },
      {
        id: 'description',
        header: 'Description',
        size: 420,
        cell: ({ row }) => <ActivityLogDescriptionCell log={row.original} />,
        meta: {
          textOverflow: 'scroll',
        },
      },
      {
        id: 'entityId',
        header: 'Record ID',
        size: 160,
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground">{shortenId(row.original.entityId)}</code>
        ),
      },
    ],
    []
  );
}
