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
  Building2,
  DollarSign,
  ExternalLink,
  FolderOpen,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@app/components/ui/avatar';
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
import { Skeleton } from '@app/components/ui/skeleton';
import { StatsCard } from '@app/components/ui/stats-card';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { formatCurrency, getInitials, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import { useDeleteGCMutation, useGCsQuery, useGCTypesQuery } from '../hooks';
import type {
  GCStatus,
  GCTypeCode,
  GeneralContractor,
  ListGCsParams,
} from '../schemas/gc.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['name', 'type', 'status', 'createdAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

const GC_TYPE_BADGE_VARIANTS: Record<string, 'primary' | 'success' | 'info' | 'warning'> = {
  PUBLIC_STATE: 'primary',
  PRIVATE: 'success',
  INSTITUTIONAL: 'info',
  CIVIL: 'warning',
  SCA: 'primary',
};

const GC_STATUS_COLORS: Record<GCStatus, string> = {
  ACTIVE: 'bg-success',
  PROSPECTING: 'bg-primary',
  INACTIVE: 'bg-muted-foreground',
};

const GC_STATUS_LABELS: Record<GCStatus, string> = {
  ACTIVE: 'Active',
  PROSPECTING: 'Prospect',
  INACTIVE: 'Inactive',
};

/* ---- Helpers ---- */

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

function isValidGCStatus(v: string | null): v is GCStatus {
  return v === 'ACTIVE' || v === 'PROSPECTING' || v === 'INACTIVE';
}

/* ---- Page ---- */

export function GCListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'name';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const gcTypeIdFilter = searchParams.get('gcTypeId') ?? undefined;
  const statusFilter: GCStatus | undefined = isValidGCStatus(searchParams.get('status'))
    ? (searchParams.get('status') as GCStatus)
    : undefined;

  // Local search input tracks typing; debounce syncs to URL
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep local input in sync when URL changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Stable setter that merges into existing params
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

  // Clean up debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Build API filter object
  const filters: ListGCsParams = {
    page,
    limit: size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    gcTypeId: gcTypeIdFilter,
    status: statusFilter,
  };

  const hasActiveFilters = !!searchQuery || !!gcTypeIdFilter || !!statusFilter;

  // Fetch all GCs (unfiltered) to derive the type tabs
  const { data: allData } = useGCsQuery({ limit: 100 });
  const { data: apiTypes } = useGCTypesQuery();
  const { data, isLoading, isError, refetch } = useGCsQuery(filters);
  const del = useDeleteGCMutation();

  // Use API data
  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const resolvedStats = {
    totalGCs: totalCount,
    activeProjects: 0,
    totalCommitted: 0,
  };

  // Use all available types from lookup for stable tabs
  const typeTabs = useMemo(() => {
    return apiTypes ?? [];
  }, [apiTypes]);

  // Map URL sort state to TanStack SortingState
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const statsItems = [
    {
      label: 'Total GCs',
      value: resolvedStats.totalGCs,
      description: 'Approved partners',
      icon: <Building2 className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Active Projects',
      value: resolvedStats.activeProjects,
      description: 'Current workload',
      icon: <FolderOpen className="size-6 text-info" />,
      bgClass: 'bg-info/10',
    },
    {
      label: 'Total Committed',
      value: formatCurrency(resolvedStats.totalCommitted),
      description: 'Portfolio value',
      icon: <DollarSign className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
    {
      label: 'Compliance Alert',
      value: 0,
      description: 'Action required',
      icon: <AlertTriangle className="size-6 text-destructive" />,
      bgClass: 'bg-destructive/10',
    },
  ];

  const columns = useMemo<ColumnDef<GeneralContractor>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="GC Name" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to={`${row.original.id}`}
              className="text-sm font-semibold text-foreground uppercase hover:text-primary"
            >
              {row.original.name}
            </Link>
            {row.original.website && (
              <a
                href={row.original.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-2sm text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="size-3" />
                {row.original.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[200px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ),
        },
      },
      {
        id: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const typeCode = row.original.gcType?.code;
          const typeName = row.original.gcType?.label || row.original.gcType?.name || (row.original.gcTypeId ? apiTypes?.find(t => t.id === row.original.gcTypeId)?.label : 'Unknown');
          return (
            <Badge
              variant={(typeCode && typeCode in GC_TYPE_BADGE_VARIANTS ? GC_TYPE_BADGE_VARIANTS[typeCode] : 'primary') as 'primary' | 'success' | 'info' | 'warning'}
              appearance="outline"
              size="sm"
            >
              {typeName || 'Unknown'}
            </Badge>
          );
        },
        meta: {
          headerClassName: 'min-w-[140px]',
          skeleton: <Skeleton className="h-5 w-24 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${GC_STATUS_COLORS[row.original.status] ?? 'bg-muted-foreground'}`}
            />
            <span className="text-sm text-foreground">
              {GC_STATUS_LABELS[row.original.status] ?? row.original.status}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[120px]',
          skeleton: (
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ),
        },
      },
      {
        id: 'primaryContact',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Primary Contact" />
        ),
        cell: ({ row }) => {
          const { email } = row.original;
          if (!email)
            return <span className="text-sm text-muted-foreground">&mdash;</span>;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="text-[10px] font-semibold">
                  {getInitials(row.original.name, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {row.original.name}
                </span>
                <a
                  href={`mailto:${email}`}
                  className="text-2sm text-muted-foreground hover:text-primary"
                >
                  {email}
                </a>
              </div>
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-[220px]',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'activeProjects',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Active Projects" />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground text-center block">
            {row.original._count.projects}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[130px] text-center',
          cellClassName: 'text-center',
          skeleton: <Skeleton className="h-3.5 w-8 mx-auto" />,
        },
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => del.mutate(row.original.id)}
              >
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        meta: {
          headerClassName: 'w-[60px]',
          skeleton: <Skeleton className="size-7 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [del, apiTypes],
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
        const newSortBy = isSortByField(col.id) ? col.id : 'name';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'name' ? undefined : newSortBy,
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
            <ToolbarPageTitle>General Contractors</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `All GCs: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add GC
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

      {/* GC Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {/* Type Tabs */}
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => updateParams({ gcTypeId: undefined, page: undefined })}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                  !gcTypeIdFilter
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {typeTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    updateParams({ gcTypeId: tab.id, page: undefined })
                  }
                  className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                    gcTypeIdFilter === tab.id
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label || tab.name}
                </button>
              ))}
            </div>
          </CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search GCs..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputWrapper>
              <Select
                value={statusFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    status: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                      gcTypeId: undefined,
                      status: undefined,
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
              <p className="text-sm font-medium">Failed to load general contractors</p>
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
                <Building2 className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No general contractors yet</p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;+ Add GC&quot; to get started.
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
