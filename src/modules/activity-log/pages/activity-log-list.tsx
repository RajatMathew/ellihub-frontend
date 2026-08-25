import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { useActivityLogQuery } from '@/app/hooks/use-activity-log';
import { useActivityLogColumns } from '@/modules/activity-log/components/activity-log-columns';
import {
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_OPTIONS,
} from '@/modules/activity-log/constants/activity-log.constants';
import { ListFilterPlus, Search } from 'lucide-react';

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
  f.dateRange({
    description: 'Show activity recorded between two dates.',
    fromLabel: 'Activity from',
    key: 'from',
    label: 'Activity date',
    placeholder: 'Activity date',
    toKey: 'to',
    toLabel: 'Activity to',
  }),
];

export default function ActivityLogListPage() {
  const access = useAccess();

  const state = useListState({
    filters: ACTIVITY_FILTERS,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: { by: 'createdAt', fields: ACTIVITY_SORT_BY_OPTIONS, order: 'desc' },
  });

  const activityQuery = useActivityLogQuery(state.apiParams);

  const columns = useActivityLogColumns();

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
          icon: Search,
          title: 'No activity found',
        }}
        error={{ title: 'Failed to load activity logs' }}
        list={list}
        state={state}
        tableLayout={{ dense: true, headerBackground: true, rowBorder: true }}
        title="Event Stream"
        titleDescription={`${list.totalCount} log entr${list.totalCount === 1 ? 'y' : 'ies'}`}
      />
    </div>
  );
}
