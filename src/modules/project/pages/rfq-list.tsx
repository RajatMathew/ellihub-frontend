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
  ClipboardList,
  DollarSign,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Trophy,
  X,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';
import { StatsCard } from '@app/components/ui/stats-card';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { formatCurrency, formatDate, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import { useDeleteRFQMutation, useRFQListQuery, useRFQStatusesQuery } from '../hooks';
import { BIDDING_TYPE_LABELS, getRfqStatusVariant } from '../constants/rfq.constants';
import type { ListRFQParams, RFQListItem } from '../schemas/rfq.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['rfqNumber', 'title', 'bidDeadline', 'estimatedBudget', 'createdAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

/* ---- Page ---- */

export default function RFQListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter = searchParams.get('statusId') ?? undefined;

  // Local search input tracks typing; debounce syncs to URL
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '') {
            next.delete(k);
          } else {
            next.set(k, v);
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

  // Build API filter object
  const filters: ListRFQParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    statusId: statusFilter,
  };

  const hasActiveFilters = !!searchQuery || !!statusFilter;

  const { data, isLoading, isError, refetch } = useRFQListQuery(filters);
  const { data: statuses } = useRFQStatusesQuery();
  const deleteMutation = useDeleteRFQMutation();
  const [deleteTarget, setDeleteTarget] = useState<RFQListItem | null>(null);

  // Fetch all RFQs for this project (unfiltered) to compute KPIs
  const { data: allData } = useRFQListQuery({ projectId, size: 100 });

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;

  // Compute KPIs from all project RFQs
  const allRfqs = allData?.data ?? [];
  const kpis = useMemo(() => {
    const total = allRfqs.length;
    const active = allRfqs.filter(
      (r) => r.status?.name === 'PUBLISHED' || r.status?.name === 'EVALUATION',
    ).length;
    const awarded = allRfqs.filter((r) => r.status?.name === 'AWARDED').length;
    const totalBudget = allRfqs.reduce((sum, r) => sum + (r.estimatedBudget ?? 0), 0);
    return { total, active, awarded, totalBudget };
  }, [allRfqs]);

  // Map URL sort state → TanStack SortingState
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const columns = useMemo<ColumnDef<RFQListItem>[]>(
    () => [
      {
        accessorKey: 'rfqNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RFQ #" />,
        cell: ({ row }) => (
          <Link
            to={`${row.original.id}`}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {row.original.rfqNumber}
          </Link>
        ),
        meta: { headerClassName: 'min-w-[140px]' },
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
        cell: ({ row }) => (
          <Link
            to={`${row.original.id}`}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {row.original.title}
          </Link>
        ),
        meta: { headerClassName: 'min-w-[250px]' },
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.status ? (
            <Badge
              variant={getRfqStatusVariant(row.original.status.name)}
              appearance="light"
              size="sm"
            >
              {row.original.status.label}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: { headerClassName: 'min-w-[120px]' },
        enableSorting: false,
      },
      {
        accessorKey: 'bidDeadline',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Bid Deadline" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.bidDeadline ? formatDate(row.original.bidDeadline) : '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[150px]' },
      },
      {
        accessorKey: 'estimatedBudget',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Est. Budget" />,
        cell: ({ row }) =>
          row.original.estimatedBudget != null ? (
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(row.original.estimatedBudget)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: { headerClassName: 'min-w-[130px]' },
      },
      {
        id: 'biddingType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Bidding Type" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {BIDDING_TYPE_LABELS[row.original.biddingType] ?? row.original.biddingType}
          </span>
        ),
        meta: { headerClassName: 'min-w-[120px]' },
        enableSorting: false,
      },
      {
        id: 'responses',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Responses" />,
        cell: ({ row }) => {
          const invites = row.original._count?.invites ?? 0;
          const quotes = row.original._count?.quotes ?? 0;
          return (
            <span className="text-sm text-muted-foreground">
              {invites} invited · {quotes} quoted
            </span>
          );
        },
        meta: { headerClassName: 'min-w-[150px]' },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                className="size-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link to={`${row.original.id}`}>View</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`${row.original.id}/edit`}>Edit</Link>
              </DropdownMenuItem>
              {row.original.status?.name === 'DRAFT' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(row.original)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        meta: { headerClassName: 'w-[60px]' },
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
      } else {
        const newSortBy = isSortByField(col.id) ? col.id : 'createdAt';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
          sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
          page: undefined,
        });
      }
    },
  });

  return (
    <div className="container-fluid py-7.5">
      {/* Toolbar */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>RFQs</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `All RFQs: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add RFQ
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5 lg:mb-7.5">
        <StatsCard
          icon={<ClipboardList className="size-6 text-muted-foreground" />}
          bgClass="bg-muted/50"
          label="Total RFQs"
          value={kpis.total}
        />
        <StatsCard
          icon={<Send className="size-6 text-primary" />}
          bgClass="bg-primary/10"
          label="Active"
          value={kpis.active}
          description="Published & Evaluation"
        />
        <StatsCard
          icon={<Trophy className="size-6 text-success" />}
          bgClass="bg-success/10"
          label="Awarded"
          value={kpis.awarded}
        />
        <StatsCard
          icon={<DollarSign className="size-6 text-warning" />}
          bgClass="bg-warning/10"
          label="Est. Budget"
          value={formatCurrency(kpis.totalBudget)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>RFQs</CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <Select
                value={statusFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    statusId: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <Filter className="size-3.5 mr-1.5" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search RFQs..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
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
                      statusId: undefined,
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
        {isError ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="size-10 text-destructive/60" />
              <p className="text-sm font-medium">Failed to load RFQs</p>
              <p className="text-xs text-muted-foreground">
                Something went wrong. Please try again.
              </p>
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
                <ClipboardList className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No RFQs yet</p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;+ Add RFQ&quot; to get started.
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete RFQ"
        description={
          <>
            This will permanently delete{' '}
            <strong>{deleteTarget?.rfqNumber ?? deleteTarget?.title}</strong>. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
