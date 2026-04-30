import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertCircle,
  DatabaseZap,
  ExternalLink,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@app/components/ui/alert';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@app/components/ui/card';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import { Input, InputWrapper } from '@app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import {
  formatDateTime,
  parsePageParam,
  parseSizeParam,
} from '@app/lib/helpers';
import {
  PRIME_CHANGE_ORDER_STATUSES,
  type ListPrimeChangeOrderParams,
  type PrimeChangeOrder,
} from '@modules/project/schemas/prime-change-order.schema';

import {
  usePrimeChangeOrderStatusSummaryQuery,
  usePrimeChangeOrderSyncStatusQuery,
  usePrimeChangeOrdersQuery,
  useSyncPrimeChangeOrdersMutation,
} from '../hooks/prime-change-order.hooks';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = [
  'referenceNumber',
  'name',
  'statusName',
  'dueDate',
  'totalCost',
  'fieldwireCreatedAt',
  'fieldwireUpdatedAt',
  'lastSyncedAt',
] as const;

type SortByField = (typeof SORT_BY_OPTIONS)[number];

function isSortByField(value: string | null): value is SortByField {
  return SORT_BY_OPTIONS.includes(value as SortByField);
}

function formatOptionalDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return formatDateTime(value);
}

function formatOptionalDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCost(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const STATUS_DOT_CLASS: Record<string, string> = {
  Draft: 'bg-amber-500',
  Requested: 'bg-slate-400',
  'Pending Revision': 'bg-slate-400',
  'Pending Approval': 'bg-blue-500',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-red-500',
  Void: 'bg-slate-400',
};

const getFieldwireUrl = (order: PrimeChangeOrder) =>
  `https://app.fieldwire.com/projects/${order.fieldwireProjectId}/change-orders/${order.fieldwireId}`;

export function PrimeChangeOrderListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const statusFilter = searchParams.get('statusName') ?? undefined;
  const totalCostMin = searchParams.get('totalCostMin') ?? undefined;
  const totalCostMax = searchParams.get('totalCostMax') ?? undefined;
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'fieldwireUpdatedAt';
  const sortOrder: 'asc' | 'desc' = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateParams],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const filters: ListPrimeChangeOrderParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    statusName: statusFilter,
    totalCostMin,
    totalCostMax,
  };

  const hasActiveFilters =
    !!searchQuery ||
    !!statusFilter ||
    !!totalCostMin ||
    !!totalCostMax;

  const { data, isLoading, isError, refetch } = usePrimeChangeOrdersQuery(filters);
  const { data: statusSummary } = usePrimeChangeOrderStatusSummaryQuery(projectId);
  const { data: syncStatus, isLoading: isLoadingSyncStatus } =
    usePrimeChangeOrderSyncStatusQuery(projectId);
  const syncMutation = useSyncPrimeChangeOrdersMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const isMapped = !!syncStatus?.fieldwireProjectId;
  const syncDisabled = !isMapped || syncMutation.isPending || isLoadingSyncStatus;
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];
  const statusSummaryByName = useMemo(
    () => new Map((statusSummary ?? []).map((item) => [item.statusName, item])),
    [statusSummary],
  );

  const columns = useMemo<ColumnDef<PrimeChangeOrder>[]>(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Reference" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground">
              {row.original.referenceNumber ?? '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.pmGroupNumber != null ? `Rev. ${row.original.pmGroupNumber}` : 'Rev. -'}
            </div>
          </div>
        ),
        meta: { headerClassName: 'min-w-[160px]' },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="max-w-[520px] truncate text-sm font-medium text-foreground">
            {row.original.name}
          </div>
        ),
        meta: { headerClassName: 'min-w-[320px]' },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span
              className={`size-2 rounded-full ${
                STATUS_DOT_CLASS[row.original.statusName] ?? 'bg-muted-foreground'
              }`}
            />
            <span>{row.original.statusName}</span>
            {row.original.deletedAt && (
              <Badge variant="destructive" appearance="light" size="sm">
                Deleted
              </Badge>
            )}
          </div>
        ),
        meta: { headerClassName: 'min-w-[180px]' },
      },
      {
        accessorKey: 'scheduleImpact',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Schedule Impact" />,
        cell: ({ row }) =>
          row.original.scheduleImpact ? (
            <span className="text-sm text-muted-foreground">
              {titleCase(row.original.scheduleImpact)}
              {row.original.scheduleImpactDays != null
                ? ` (${row.original.scheduleImpactDays}d)`
                : ''}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          ),
        meta: { headerClassName: 'min-w-[150px]' },
        enableSorting: false,
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatOptionalDate(row.original.dueDate)}
          </span>
        ),
        meta: { headerClassName: 'min-w-[130px]' },
      },
      {
        accessorKey: 'totalCost',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total Cost" />,
        cell: ({ row }) => (
          <span
            className={`block text-right text-sm font-semibold tabular-nums ${
              Number(row.original.totalCost ?? 0) < 0 ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {formatCost(row.original.totalCost)}
          </span>
        ),
        meta: { headerClassName: 'min-w-[130px]' },
      },
      {
        id: 'fieldwire',
        header: () => null,
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" asChild>
            <a href={getFieldwireUrl(row.original)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              View in Fieldwire
            </a>
          </Button>
        ),
        meta: { headerClassName: 'w-[160px]' },
        enableSorting: false,
      },
    ],
    [],
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  const table = useReactTable({
    data: listData,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: Record<string, string | undefined> = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size = next.pageSize === DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }

      updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const col = next[0];

      if (!col) {
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
        return;
      }

      const nextSortBy = isSortByField(col.id) ? col.id : 'fieldwireUpdatedAt';
      const nextSortOrder = col.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: nextSortBy === 'fieldwireUpdatedAt' ? undefined : nextSortBy,
        sortOrder: nextSortOrder === 'desc' ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-5">
        <Toolbar>
          <ToolbarWrapper>
            <ToolbarHeading>
              <ToolbarPageTitle>Prime Change Orders</ToolbarPageTitle>
              <span className="text-sm text-muted-foreground">
                {isMapped
                  ? `Fieldwire Project: ${syncStatus.fieldwireProjectId} | Last synced: ${formatOptionalDateTime(
                      syncStatus.syncStatus.lastSyncedAt,
                    )}`
                  : 'No Fieldwire project mapped'}
              </span>
            </ToolbarHeading>
            <ToolbarActions>
              {!isMapped && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/app/project/${projectId}/edit`}>Add Fieldwire ID</Link>
                </Button>
              )}
              {isMapped && syncStatus?.fieldwireProjectId && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://app.fieldwire.com/projects/${syncStatus.fieldwireProjectId}/change-orders`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open in Fieldwire
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => syncMutation.mutate(projectId)}
                disabled={syncDisabled}
              >
                <RefreshCcw
                  className={`size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                />
                Sync Fieldwire
              </Button>
            </ToolbarActions>
          </ToolbarWrapper>
        </Toolbar>

        {syncStatus?.syncStatus.lastSyncError && (
          <Alert variant="destructive" appearance="light">
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Last sync failed</AlertTitle>
              <AlertDescription>{syncStatus.syncStatus.lastSyncError}</AlertDescription>
            </AlertContent>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {PRIME_CHANGE_ORDER_STATUSES.map((statusName) => {
            const item = statusSummaryByName.get(statusName);
            const isActive = statusFilter === statusName;
            const totalCost = item?.totalCost ?? 0;

            return (
              <button
                key={statusName}
                type="button"
                className={`rounded-md border bg-card p-3 text-left transition-colors hover:border-primary/40 ${
                  isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : ''
                }`}
                onClick={() =>
                  updateParams({
                    statusName: isActive ? undefined : statusName,
                    page: undefined,
                  })
                }
              >
                <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                  <span
                    className={`size-2 rounded-full ${
                      STATUS_DOT_CLASS[statusName] ?? 'bg-muted-foreground'
                    }`}
                  />
                  <span className="truncate">{statusName}</span>
                </div>
                <div
                  className={`mt-2 text-base font-semibold tabular-nums ${
                    totalCost < 0 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {formatCost(totalCost)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item?.count ?? 0} item{(item?.count ?? 0) === 1 ? '' : 's'}
                </div>
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardToolbar className="ml-auto w-full justify-end sm:w-auto">
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <InputWrapper variant="sm" className="w-[260px]">
                  <Search className="size-4" />
                  <Input
                    placeholder="Search change orders..."
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </InputWrapper>

                <Select
                  value={statusFilter ?? 'all'}
                  onValueChange={(value) =>
                    updateParams({
                      statusName: value === 'all' ? undefined : value,
                      page: undefined,
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PRIME_CHANGE_ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <InputWrapper variant="sm" className="w-[135px]">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Min cost"
                    value={totalCostMin ?? ''}
                    onChange={(e) =>
                      updateParams({ totalCostMin: e.target.value || undefined, page: undefined })
                    }
                  />
                </InputWrapper>

                <InputWrapper variant="sm" className="w-[135px]">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Max cost"
                    value={totalCostMax ?? ''}
                    onChange={(e) =>
                      updateParams({ totalCostMax: e.target.value || undefined, page: undefined })
                    }
                  />
                </InputWrapper>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({
                        search: undefined,
                        statusName: undefined,
                        totalCostMin: undefined,
                        totalCostMax: undefined,
                        page: undefined,
                      });
                    }}
                  >
                    <X className="size-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </CardToolbar>
          </CardHeader>

          {!isMapped && !isLoadingSyncStatus ? (
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <DatabaseZap className="size-10 text-muted-foreground/60" />
                <p className="text-sm font-medium">Fieldwire is not connected for this project</p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Add the Fieldwire Project ID on the project edit screen before syncing change
                  orders.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/app/project/${projectId}/edit`}>Edit Project</Link>
                </Button>
              </div>
            </CardContent>
          ) : isError ? (
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle className="size-10 text-destructive/60" />
                <p className="text-sm font-medium">Failed to load change orders</p>
                <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCcw className="size-3.5" />
                  Retry
                </Button>
              </div>
            </CardContent>
          ) : (
            <DataGrid
              table={table}
              recordCount={totalCount}
              isLoading={isLoading}
              emptyMessage={
                <div className="flex flex-col items-center gap-2 py-8">
                  <DatabaseZap className="size-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No Fieldwire change orders</p>
                  <p className="text-xs text-muted-foreground">
                    Sync this project to pull Prime Change Orders from Fieldwire.
                  </p>
                </div>
              }
              tableLayout={{
                cellBorder: false,
                rowBorder: true,
                headerBackground: true,
              }}
            >
              <CardTable>
                <DataGridTable />
              </CardTable>
              <CardFooter>
                <DataGridPagination />
              </CardFooter>
            </DataGrid>
          )}
        </Card>
      </div>
    </div>
  );
}
