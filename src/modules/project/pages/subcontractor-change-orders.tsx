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
  FileCheck,
  FileClock,
  Hash,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  TrendingDown,
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
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardTable,
  CardToolbar,
} from '@app/components/ui/card';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Skeleton } from '@app/components/ui/skeleton';
import { StatsCard } from '@app/components/ui/stats-card';
import { formatCurrency, formatDate, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import {
  INITIATED_BY_LABELS,
  INITIATED_BY_OPTIONS,
  PRIORITY_BADGE_VARIANTS,
  PRIORITY_LABELS,
  SCO_STATUS_BADGE_VARIANTS,
  SCO_STATUS_OPTIONS,
} from '@modules/sco/constants/sco.constants';
import {
  useDeleteSCOMutation,
  useSCOsQuery,
  useSCOSummaryQuery,
} from '@modules/sco/hooks/sco.hooks';
import type { ListSCOsParams, SCOListItem } from '@modules/sco/schemas/sco.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['scoNumber', 'amount', 'status', 'priority', 'initiatedBy', 'date', 'createdAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

type SCOStatusFilter = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'VOID';
type InitiatedByFilter = 'VENDOR' | 'FIRM';

/* ---- Helpers ---- */

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

function isValidSCOStatus(v: string | null): v is SCOStatusFilter {
  return v === 'DRAFT' || v === 'APPROVED' || v === 'REJECTED' || v === 'VOID';
}

function isValidInitiatedBy(v: string | null): v is InitiatedByFilter {
  return v === 'VENDOR' || v === 'FIRM';
}

/* ---- Page ---- */

export default function ProjectSCOs() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'scoNumber';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const statusFilter: SCOStatusFilter | undefined = isValidSCOStatus(searchParams.get('status'))
    ? (searchParams.get('status') as SCOStatusFilter)
    : undefined;
  const initiatedByFilter: InitiatedByFilter | undefined = isValidInitiatedBy(
    searchParams.get('initiatedBy'),
  )
    ? (searchParams.get('initiatedBy') as InitiatedByFilter)
    : undefined;

  // Search with debounce
  const searchQuery = searchParams.get('search') ?? '';
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

  // API filters
  const filters: ListSCOsParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    status: statusFilter,
    initiatedBy: initiatedByFilter,
    search: searchQuery || undefined,
  };

  const hasActiveFilters = !!searchQuery || !!statusFilter || !!initiatedByFilter;

  const { data, isLoading, isError, refetch } = useSCOsQuery(filters);
  const { data: summary } = useSCOSummaryQuery(projectId ?? '');
  const del = useDeleteSCOMutation();

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;

  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const columns = useMemo<ColumnDef<SCOListItem>[]>(
    () => [
      {
        accessorKey: 'scoNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SCO #" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to={`${row.original.id}`}
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              {row.original.scoNumber}
            </Link>
            <span className="text-2sm text-muted-foreground line-clamp-1">
              {row.original.title}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ),
        },
      },
      {
        id: 'vendor',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.vendor.name}</span>
        ),
        meta: {
          headerClassName: 'min-w-[130px]',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
          <span
            className={`text-sm font-medium ${
              row.original.amount < 0 ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {formatCurrency(row.original.amount)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[100px] text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge
            variant={SCO_STATUS_BADGE_VARIANTS[row.original.status.name] ?? 'primary'}
            appearance="outline"
            size="sm"
          >
            {row.original.status.label}
          </Badge>
        ),
        meta: {
          headerClassName: 'min-w-[90px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
      },
      {
        id: 'priority',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => (
          <Badge
            variant={PRIORITY_BADGE_VARIANTS[row.original.priority] ?? 'info'}
            appearance="outline"
            size="sm"
          >
            {PRIORITY_LABELS[row.original.priority] ?? row.original.priority}
          </Badge>
        ),
        meta: {
          headerClassName: 'min-w-[85px]',
          skeleton: <Skeleton className="h-5 w-16 rounded-sm" />,
        },
      },
      {
        id: 'initiatedBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Initiated By" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {INITIATED_BY_LABELS[row.original.initiatedBy] ?? row.original.initiatedBy}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[95px]',
          skeleton: <Skeleton className="h-3.5 w-16" />,
        },
      },
      {
        accessorKey: 'date',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {formatDate(row.original.date)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[100px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const isDraft = row.original.status.name === 'DRAFT';
          return (
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
                {isDraft && (
                  <DropdownMenuItem asChild>
                    <Link to={`${row.original.id}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                )}
                {isDraft && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteId(row.original.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        meta: {
          headerClassName: 'w-[60px]',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
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
        const newSortBy = isSortByField(col.id) ? col.id : 'scoNumber';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'scoNumber' ? undefined : newSortBy,
          sortOrder: newSortOrder === 'asc' ? undefined : newSortOrder,
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
            <ToolbarPageTitle>Subcontractor Change Orders</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `All SCOs: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add SCO
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5 lg:mb-7.5">
          <StatsCard
            icon={<Hash className="size-5 text-primary" />}
            bgClass="bg-primary/10"
            label="Total SCOs"
            value={summary.totalCount}
          />
          <StatsCard
            icon={<FileCheck className="size-5 text-success" />}
            bgClass="bg-success/10"
            label="Approved Amount"
            value={formatCurrency(summary.totalApprovedAmount)}
          />
          <StatsCard
            icon={<FileClock className="size-5 text-warning" />}
            bgClass="bg-warning/10"
            label="Pending Amount"
            value={formatCurrency(summary.totalPendingAmount)}
          />
          <StatsCard
            icon={
              summary.netMarginImpact < 0 ? (
                <TrendingDown className="size-5 text-destructive" />
              ) : (
                <DollarSign className="size-5 text-info" />
              )
            }
            bgClass={summary.netMarginImpact < 0 ? 'bg-destructive/10' : 'bg-info/10'}
            label="Net Impact"
            value={formatCurrency(summary.netMarginImpact)}
          />
        </div>
      )}

      {/* SCO Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {/* Status Tabs */}
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => updateParams({ status: undefined, page: undefined })}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                  !statusFilter
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {SCO_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateParams({ status: opt.value, page: undefined })}
                  className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                    statusFilter === opt.value
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search SCOs..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputWrapper>
              <Select
                value={initiatedByFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    initiatedBy: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {INITIATED_BY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearchInput('');
                    updateParams({
                      search: undefined,
                      status: undefined,
                      initiatedBy: undefined,
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
              <p className="text-sm font-medium">Failed to load change orders</p>
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
                <p className="text-sm font-medium">No change orders yet</p>
                <p className="text-xs text-muted-foreground">
                  Subcontractor change orders will appear here once created.
                </p>
              </div>
            }
            tableLayout={{
              cellBorder: false,
              rowBorder: true,
              headerBackground: true,
            }}
          >
            <CardTable className="overflow-x-auto">
              <DataGridTable />
            </CardTable>
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </DataGrid>
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete Change Order"
        description="Are you sure you want to delete this change order? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isPending={del.isPending}
        onConfirm={() => {
          if (deleteId) {
            del.mutate(deleteId, {
              onSettled: () => setDeleteId(null),
            });
          }
        }}
      />
    </div>
  );
}
