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
  AlertTriangle,
  ClipboardList,
  MoreHorizontal,
  Plus,
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
import { formatCurrency, formatDate, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import {
  PO_STATUS_BADGE_VARIANTS,
  PO_STATUS_OPTIONS,
  TRADE_CATEGORY_BADGE_VARIANTS,
  TRADE_CATEGORY_LABELS,
  TRADE_CATEGORY_OPTIONS,
} from '@modules/purchase-orders/constants/po.constants';
import {
  useDeletePOMutation,
  usePOsQuery,
} from '@modules/purchase-orders/hooks/po.hooks';
import type {
  ListPOsParams,
  POListItem,
  POStatusName,
  TradeCategory,
} from '@modules/purchase-orders/schemas/po.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['issueDate', 'total', 'status', 'createdAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

/* ---- Helpers ---- */

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

function isValidPOStatus(v: string | null): v is POStatusName {
  return (
    v === 'DRAFT' ||
    v === 'ISSUED' ||
    v === 'PARTIALLY_PAID' ||
    v === 'PAID' ||
    v === 'CANCELLED'
  );
}

function isValidTradeCategory(v: string | null): v is TradeCategory {
  return (
    v === 'MATERIAL' ||
    v === 'FABRICATION' ||
    v === 'INSTALLATION' ||
    v === 'LABOR' ||
    v === 'EQUIPMENT'
  );
}

/* ---- Page ---- */

export default function ProjectPOs() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'issueDate';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter: POStatusName | undefined = isValidPOStatus(searchParams.get('status'))
    ? (searchParams.get('status') as POStatusName)
    : undefined;
  const tradeCategoryFilter: TradeCategory | undefined = isValidTradeCategory(
    searchParams.get('tradeCategory'),
  )
    ? (searchParams.get('tradeCategory') as TradeCategory)
    : undefined;
  const overdueFilter = searchParams.get('overdue') === 'true' ? ('true' as const) : undefined;

  // Local search input tracks typing; debounce syncs to URL
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

  // Build API filter object — scoped to this project
  const filters: ListPOsParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    status: statusFilter,
    tradeCategory: tradeCategoryFilter,
    overdue: overdueFilter,
  };

  const hasActiveFilters =
    !!searchQuery || !!statusFilter || !!tradeCategoryFilter || !!overdueFilter;

  const { data, isLoading, isError, refetch } = usePOsQuery(filters);
  const del = useDeletePOMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;

  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const columns = useMemo<ColumnDef<POListItem>[]>(
    () => [
      {
        accessorKey: 'poNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="PO #" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to={`${row.original.id}`}
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              {row.original.poNumber ?? 'Draft'}
            </Link>
            <span className="text-2sm text-muted-foreground line-clamp-1">
              {row.original.description}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[180px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'vendor',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.vendor.name}</span>
        ),
        meta: {
          headerClassName: 'min-w-[160px]',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
        enableSorting: false,
      },
      {
        id: 'tradeCategory',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Trade" />,
        cell: ({ row }) => (
          <Badge
            variant={TRADE_CATEGORY_BADGE_VARIANTS[row.original.tradeCategory] ?? 'primary'}
            appearance="outline"
            size="sm"
          >
            {TRADE_CATEGORY_LABELS[row.original.tradeCategory] ?? row.original.tradeCategory}
          </Badge>
        ),
        meta: {
          headerClassName: 'min-w-[120px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const statusName = row.original.status.name as POStatusName;
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant={PO_STATUS_BADGE_VARIANTS[statusName] ?? 'primary'}
                appearance="outline"
                size="sm"
              >
                {row.original.status.label}
              </Badge>
              {row.original.isOverdue && (
                <AlertTriangle className="size-3.5 text-destructive" />
              )}
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-[140px]',
          skeleton: (
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-sm" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        accessorKey: 'total',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-medium text-foreground">
              {formatCurrency(row.original.total)}
            </span>
            {row.original.totalCommitment !== row.original.total && (
              <span className="text-2sm text-muted-foreground">
                Committed: {formatCurrency(row.original.totalCommitment)}
              </span>
            )}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[130px] text-right',
          cellClassName: 'text-right',
          skeleton: (
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ),
        },
      },
      {
        accessorKey: 'issueDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Issue Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {formatDate(row.original.issueDate)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[130px]',
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
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => del.mutate(row.original.id)}
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
    [del],
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
        const newSortBy = isSortByField(col.id) ? col.id : 'issueDate';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'issueDate' ? undefined : newSortBy,
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
            <ToolbarPageTitle>Purchase Orders</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `All POs: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add PO
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* PO Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {/* Status Tabs */}
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => updateParams({ status: undefined, overdue: undefined, page: undefined })}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                  !statusFilter && !overdueFilter
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {PO_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    updateParams({ status: opt.value, overdue: undefined, page: undefined })
                  }
                  className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                    statusFilter === opt.value
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateParams({
                    overdue: overdueFilter ? undefined : 'true',
                    status: undefined,
                    page: undefined,
                  })
                }
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                  overdueFilter
                    ? 'border-destructive text-destructive'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Overdue
                </span>
              </button>
            </div>
          </CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search POs..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputWrapper>
              <Select
                value={tradeCategoryFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    tradeCategory: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="All Trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trades</SelectItem>
                  {TRADE_CATEGORY_OPTIONS.map((opt) => (
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
                      tradeCategory: undefined,
                      overdue: undefined,
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
              <p className="text-sm font-medium">Failed to load purchase orders</p>
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
                <p className="text-sm font-medium">No purchase orders yet</p>
                <p className="text-xs text-muted-foreground">
                  Purchase orders will appear here once created.
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
  );
}
