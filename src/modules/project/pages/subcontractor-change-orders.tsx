import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertCircle, ClipboardList, MoreHorizontal, Plus, RefreshCcw, Search, X } from 'lucide-react';
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
  SCO_STATUS_BADGE_VARIANTS,
  SCO_STATUS_OPTIONS,
} from '@modules/sco/constants/sco.constants';
import { useSCOChangeTypesQuery, useSCOsQuery } from '@modules/sco/hooks/sco.hooks';
import type { ListSCOsParams, SCOListItem, SCOStatusName } from '@modules/sco/schemas/sco.schema';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['createdAt', 'scoNumber', 'amount', 'status', 'date'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

function isSortByField(value: string | null): value is SortByField {
  return SORT_BY_OPTIONS.includes(value as SortByField);
}

function isValidSCOStatus(value: string | null): value is SCOStatusName {
  return value === 'DRAFT' || value === 'APPROVED' || value === 'REJECTED' || value === 'VOID';
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDate(value) : '-';
}

function formatOptionalCurrency(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? formatCurrency(numeric) : '-';
}

function getChangeTypeLabel(sco: SCOListItem, fallback?: string) {
  return (
    sco.changeType?.label ??
    sco.changeType?.name ??
    sco.changeType?.code ??
    fallback ??
    '-'
  );
}

function getPurchaseOrderLabel(sco: SCOListItem) {
  return sco.purchaseOrder?.poNumber ?? sco.purchaseOrderId ?? '-';
}

export default function ProjectSCOs() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter: SCOStatusName | undefined = isValidSCOStatus(searchParams.get('status'))
    ? (searchParams.get('status') as SCOStatusName)
    : undefined;
  const changeTypeFilter = searchParams.get('changeTypeId') || undefined;
  const searchQuery = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (!value) {
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

  const filters: ListSCOsParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    status: statusFilter,
    changeTypeId: changeTypeFilter,
  };

  const hasActiveFilters = !!searchQuery || !!statusFilter || !!changeTypeFilter;
  const { data, isLoading, isError, refetch } = useSCOsQuery(filters);
  const { data: changeTypes } = useSCOChangeTypesQuery();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const changeTypeLabelById = useMemo(
    () => new Map((changeTypes ?? []).map((type) => [type.id, type.label ?? type.name ?? type.code ?? type.id])),
    [changeTypes],
  );
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const columns = useMemo<ColumnDef<SCOListItem>[]>(
    () => [
      {
        accessorKey: 'scoNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SCO #" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              to={`${row.original.id}`}
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              {row.original.scoNumber ?? '-'}
            </Link>
            <span className="line-clamp-1 text-2sm text-muted-foreground">
              {row.original.title ?? row.original.description ?? '-'}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[190px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ),
        },
      },
      {
        id: 'purchaseOrder',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Purchase Order" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to={
                row.original.purchaseOrder?.id
                  ? `/app/project/${projectId}/purchase-orders/${row.original.purchaseOrder.id}`
                  : `${row.original.id}`
              }
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {getPurchaseOrderLabel(row.original)}
            </Link>
            {row.original.purchaseOrder?.status && (
              <span className="text-2sm text-muted-foreground">
                PO {row.original.purchaseOrder.status}
              </span>
            )}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[170px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ),
        },
        enableSorting: false,
      },
      {
        id: 'changeTypeId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Change Type" />,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="primary" appearance="outline" size="sm">
              {getChangeTypeLabel(
                row.original,
                row.original.changeTypeId
                  ? changeTypeLabelById.get(row.original.changeTypeId)
                  : undefined,
              )}
            </Badge>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-5 w-24 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        id: 'requestedBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Requested By" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.requestedBy ?? '-'}</span>
        ),
        meta: {
          headerClassName: 'min-w-[140px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-medium text-foreground">
              {formatOptionalCurrency(row.original.amount)}
            </span>
            {Number(row.original.markupAmount ?? 0) !== 0 && (
              <span className="text-2sm text-muted-foreground">
                Markup {formatOptionalCurrency(row.original.markupAmount)}
              </span>
            )}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[130px] text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge
            variant={SCO_STATUS_BADGE_VARIANTS[row.original.status] ?? 'primary'}
            appearance="outline"
            size="sm"
          >
            {row.original.status}
          </Badge>
        ),
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
      },
      {
        id: 'date',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-foreground">
              {formatOptionalDate(row.original.date)}
            </span>
            <span className="text-2sm text-muted-foreground">
              {row.original.impactsSchedule ? 'Schedule impact' : 'No schedule impact'}
            </span>
            {row.original.scheduleImpactDays != null && row.original.scheduleImpactDays > 0 && (
              <span className="text-2sm text-muted-foreground">
                {row.original.scheduleImpactDays} day{row.original.scheduleImpactDays === 1 ? '' : 's'}
              </span>
            )}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {formatOptionalDate(row.original.createdAt)}
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
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                className="size-7"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link to={`${row.original.id}`}>View</Link>
              </DropdownMenuItem>
              {row.original.status === 'DRAFT' && (
                <DropdownMenuItem asChild>
                  <Link to={`${row.original.id}/edit`}>Edit</Link>
                </DropdownMenuItem>
              )}
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
    [changeTypeLabelById, projectId],
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
      const column = next[0];

      if (!column) {
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
        return;
      }

      const newSortBy = isSortByField(column.id) ? column.id : 'createdAt';
      const newSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
        sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>Sub Change Order</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
                : `All SCOs: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add Sub Change Order
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Card className="overflow-hidden">
        <CardHeader className="items-stretch sm:items-center">
          <CardTitle className="w-full overflow-x-auto sm:w-auto">
            <div className="inline-flex min-w-max items-center gap-0">
              <button
                type="button"
                onClick={() => updateParams({ status: undefined, page: undefined })}
                className={`border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                  !statusFilter
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {SCO_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateParams({ status: option.value, page: undefined })}
                  className={`border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                    statusFilter === option.value
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardTitle>
          <CardToolbar className="w-full sm:w-auto">
            <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
              <InputWrapper variant="sm" className="w-full sm:w-[220px]">
                <Search className="size-4" />
                <Input
                  placeholder="Search SCOs..."
                  value={searchInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </InputWrapper>
              <Select
                value={changeTypeFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    changeTypeId: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]">
                  <SelectValue placeholder="All Change Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Change Types</SelectItem>
                  {(changeTypes ?? []).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label ?? type.name ?? type.code ?? type.id}
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
                      changeTypeId: undefined,
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
              <p className="text-sm font-medium">Failed to load sub change orders</p>
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
                <p className="text-sm font-medium">No sub change orders yet</p>
                <p className="text-xs text-muted-foreground">
                  Sub change orders will appear here once created.
                </p>
              </div>
            }
            tableLayout={{
              dense: true,
              cellBorder: false,
              rowBorder: true,
              headerBackground: true,
            }}
            tableClassNames={{
              base: 'min-w-[980px]',
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
    </div>
  );
}
