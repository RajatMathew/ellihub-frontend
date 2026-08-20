import { useMemo } from 'react';

import type { ActivityLogItem } from '@/app/api/activity-log.api';
import { ActivityChangeDetailsButton } from '@/app/components/activity-change-details-dialog';
import {
  ActivityRevisionBadge,
  stripActivityRevisionSuffix,
} from '@/app/components/activity-revision-badge';
import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { useActivityLogQuery } from '@/app/hooks/use-activity-log';
import {
  ActivityActionBadge,
  ActivityEmptyIcon,
  ActivityEntityBadge,
} from '@/modules/activity-log/components/activity-log-cells';
import {
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_OPTIONS,
} from '@/modules/activity-log/constants/activity-log.constants';
import type { ColumnDef } from '@tanstack/react-table';
import { ListFilterPlus } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 25;
const ACTIVITY_SORT_BY_OPTIONS = ['createdAt'] as const;

const ACTIVITY_FILTERS = [
  f.search({ className: 'sm:w-64', placeholder: 'Search activity...' }),
  f.select({
    className: 'sm:w-48',
    icon: ListFilterPlus,
    key: 'entityType',
    options: [...ACTIVITY_ENTITY_OPTIONS],
    placeholder: 'All Entities',
  }),
  f.select({
    className: 'sm:w-40',
    icon: ListFilterPlus,
    key: 'action',
    options: [...ACTIVITY_ACTION_OPTIONS],
    placeholder: 'All Actions',
  }),
  f.dateRange({ fromLabel: 'Activity from', key: 'from', toKey: 'to', toLabel: 'Activity to' }),
];

export default function ActivityLogListPage() {
  const access = useAccess();

  const state = useListState({
    filters: ACTIVITY_FILTERS,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: { by: 'createdAt', fields: ACTIVITY_SORT_BY_OPTIONS, order: 'desc' },
  });

  const activityQuery = useActivityLogQuery(state.apiParams);

  const columns = useMemo<ColumnDef<ActivityLogItem>[]>(
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

  const list = useListTable({
    columns,
    getRowId: (log) => log.id,
    query: activityQuery,
    rows: activityQuery.data?.data ?? [],
    state,
    totalCount: activityQuery.data?.pagination.totalItems ?? 0,
  });

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        title="Activity Log"
        totalCount={list.totalCount}
        hasActiveFilters={state.hasActiveFilters}
        resultLabel="activity logs"
        description={
          <span className="text-sm text-muted-foreground">
            {access.isAdmin
              ? 'Audit trail across the workspace'
              : 'Audit trail for activity available to your account'}
          </span>
        }
      />

      <DataTable
        ariaLabel="Activity log"
        empty={{
          description: state.hasActiveFilters
            ? 'Try adjusting the filters.'
            : 'Activity will appear here once users make changes.',
          icon: <ActivityEmptyIcon />,
          title: 'No activity found',
        }}
        error={{ title: 'Failed to load activity logs' }}
        list={list}
        state={state}
        tableLayout={{ dense: true, headerBackground: true, rowBorder: true }}
        title={
          <div className="flex flex-col justify-center gap-1">
            <span className="text-xs font-semibold tracking-normal text-table-card-header-foreground">
              Event Stream
            </span>
            <span className="text-xs text-table-card-header-foreground/75">
              {list.totalCount} log entr{list.totalCount === 1 ? 'y' : 'ies'}
            </span>
          </div>
        }
      />
    </div>
  );
}

function ActivityLogDescriptionCell({ log }: { log: ActivityLogItem }) {
  const { date, time } = formatActivityDate(log.createdAt);
  const displayDescription = stripActivityRevisionSuffix(log.description, log.revision);

  return (
    <div className="max-w-xl">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium">
        <span className="min-w-0 break-words">{displayDescription}</span>
        <ActivityRevisionBadge revision={log.revision} />
      </div>
      {log.note && (
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{log.note}</div>
      )}
      {log.details && (
        <ActivityChangeDetailsButton
          details={log.details}
          summary={displayDescription}
          actor={log.user?.name ?? 'System'}
          timestamp={`${date} ${time}`}
          className="mt-1 px-0 hover:bg-transparent"
        />
      )}
    </div>
  );
}
function formatActivityDate(timestamp: string) {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function shortenId(id: string) {
  return id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}
