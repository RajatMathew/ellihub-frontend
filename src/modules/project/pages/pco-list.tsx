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
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
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

import {
  useDeletePCOMutation,
  usePCOListQuery,
  usePCOPipelineQuery,
  usePCOStatusesQuery,
} from '../hooks';
import { getPriorityVariant, getStatusBadgeVariant, PCO_PRIORITY_OPTIONS } from '../constants/pco.constants';
import type { ListPCOParams, PCOListItem } from '../schemas/pco.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['pcoNumber', 'title', 'amount', 'date', 'createdAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

/* ---- Page ---- */

export function PCOListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'pcoNumber';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const statusFilter = searchParams.get('status') ?? undefined;
  const priorityFilter = searchParams.get('priority') ?? undefined;

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
  const filters: ListPCOParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    status: statusFilter,
    priority: priorityFilter,
  };

  const hasActiveFilters = !!searchQuery || !!statusFilter || !!priorityFilter;

  const { data, isLoading, isError, refetch } = usePCOListQuery(filters);
  const { data: pipeline } = usePCOPipelineQuery(projectId);
  const { data: statuses } = usePCOStatusesQuery();
  const del = useDeletePCOMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;

  // Map URL sort state → TanStack SortingState
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const statsItems = [
    {
      label: 'Draft',
      value: pipeline?.draft?.count ?? 0,
      description: formatCurrency(pipeline?.draft?.totalAmount ?? 0),
      icon: <ClipboardList className="size-6 text-muted-foreground" />,
      bgClass: 'bg-muted/50',
    },
    {
      label: 'Pending',
      value: pipeline?.pending_review?.count ?? 0,
      description: formatCurrency(pipeline?.pending_review?.totalAmount ?? 0),
      icon: <ClipboardList className="size-6 text-warning" />,
      bgClass: 'bg-warning/10',
    },
    {
      label: 'Approved',
      value: pipeline?.approved?.count ?? 0,
      description: formatCurrency(pipeline?.approved?.totalAmount ?? 0),
      icon: <ClipboardList className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
    {
      label: 'Executed',
      value: pipeline?.executed?.count ?? 0,
      description: formatCurrency(pipeline?.executed?.totalAmount ?? 0),
      icon: <ClipboardList className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
  ];

  const columns = useMemo<ColumnDef<PCOListItem>[]>(
    () => [
      {
        accessorKey: 'pcoNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="PCO #" />,
        cell: ({ row }) =>
          row.original.pcoNumber ? (
            <Link
              to={`${row.original.id}`}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {row.original.pcoNumber}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: { headerClassName: 'min-w-[100px]' },
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
            <Badge variant={getStatusBadgeVariant(row.original.status.name)} appearance="light" size="sm">
              {row.original.status.label}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: { headerClassName: 'min-w-[120px]' },
        enableSorting: false,
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(row.original.amount)}
          </span>
        ),
        meta: { headerClassName: 'min-w-[120px]' },
      },
      {
        id: 'priority',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Priority" />,
        cell: ({ row }) =>
          row.original.priority ? (
            <Badge variant={getPriorityVariant(row.original.priority)} appearance="light" size="sm">
              {row.original.priority}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: { headerClassName: 'min-w-[100px]' },
        enableSorting: false,
      },
      {
        accessorKey: 'date',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.date ? formatDate(row.original.date) : '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[140px]' },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const isDraft =
            row.original.status?.name?.toLowerCase() === 'draft';
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
                <DropdownMenuItem asChild>
                  <Link to={`${row.original.id}/edit`}>Edit</Link>
                </DropdownMenuItem>
                {isDraft && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => del.mutate(row.original.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        meta: { headerClassName: 'w-[60px]' },
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
        const newSortBy = isSortByField(col.id) ? col.id : 'pcoNumber';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'pcoNumber' ? undefined : newSortBy,
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
            <ToolbarPageTitle>Prime Change Orders</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `All Change Orders: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add Change Order
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5 lg:mb-7.5">
        {statsItems.map((item) => (
          <StatsCard
            key={item.label}
            icon={item.icon}
            bgClass={item.bgClass}
            label={item.label}
            value={item.value}
            description={item.description}
          />
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Change Orders</CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <Select
                value={statusFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    status: value === 'all' ? undefined : value,
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
                    <SelectItem key={s.id} value={s.name}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={priorityFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    priority: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <Filter className="size-3.5 mr-1.5" />
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {PCO_PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search change orders..."
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
                      status: undefined,
                      priority: undefined,
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
                  Click &quot;+ Add Change Order&quot; to get started.
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
