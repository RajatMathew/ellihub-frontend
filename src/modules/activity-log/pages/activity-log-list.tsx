import { useMemo } from 'react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';
import type { ActivityLogItem } from '@/app/api/activity-log.api';
import { useAccess } from '@/app/contexts/access-context';
import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import { useActivityLogQuery } from '@/app/hooks/use-activity-log';
import {
  ActivityActionBadge,
  ActivityEntityBadge,
  ActivityLogTable,
} from '@/modules/activity-log/components/activity-log-table';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

function isActivitySortBy(value: string | null): value is 'createdAt' {
  return value === 'createdAt';
}

export default function ActivityLogListPage() {
  const access = useAccess();
  const { page, size, searchQuery, searchInput, searchParams, updateParams, handleSearchChange } =
    useResourceListParams({
      defaultPageSize: DEFAULT_PAGE_SIZE,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      searchDebounceMs: SEARCH_DEBOUNCE_MS,
      isSortBy: isActivitySortBy,
    });

  const entityType = searchParams.get('entityType') ?? undefined;
  const action = searchParams.get('action') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const activityQuery = useActivityLogQuery({
    page,
    size,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: searchQuery || undefined,
    entityType,
    action,
    from,
    to,
  });

  const rows = activityQuery.data?.data ?? [];
  const totalCount = activityQuery.data?.pagination.totalItems ?? 0;
  const hasActiveFilters = Boolean(searchQuery || entityType || action || from || to);

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
        cell: ({ row }) => (
          <div className="max-w-xl">
            <div className="text-sm font-medium">{row.original.description}</div>
            {row.original.note && (
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {row.original.note}
              </div>
            )}
          </div>
        ),
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

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: Math.max(1, activityQuery.data?.pagination.totalPages ?? 1),
    state: { pagination: { pageIndex: page - 1, pageSize: size } },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: Record<string, string | undefined> = {};
      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }
      updateParams(patches);
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        title="Activity Logger"
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        resultLabel="activity logs"
        description={
          <span className="text-sm text-muted-foreground">
            {access.isAdmin
              ? 'Audit trail across the workspace'
              : 'Audit trail for activity available to your account'}
          </span>
        }
      />

      <ActivityLogTable
        table={table}
        totalCount={totalCount}
        searchInput={searchInput}
        entityType={entityType}
        action={action}
        from={from}
        to={to}
        isLoading={activityQuery.isLoading}
        isError={activityQuery.isError}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onEntityTypeChange={(value) => updateParams({ entityType: value, page: undefined })}
        onActionChange={(value) => updateParams({ action: value, page: undefined })}
        onFromChange={(value) => updateParams({ from: value, page: undefined })}
        onToChange={(value) => updateParams({ to: value, page: undefined })}
        onClearFilters={() =>
          updateParams({
            search: undefined,
            entityType: undefined,
            action: undefined,
            from: undefined,
            to: undefined,
            page: undefined,
          })
        }
        onRetry={() => void activityQuery.refetch()}
      />
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
