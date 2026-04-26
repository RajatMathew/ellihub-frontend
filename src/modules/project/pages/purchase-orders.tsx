import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  AlertCircle,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Skeleton } from '@app/components/ui/skeleton';
import { Textarea } from '@app/components/ui/textarea';
import { formatCurrency, formatDate, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import {
  PO_STATUS_BADGE_VARIANTS,
  PO_STATUS_LABELS,
  PO_STATUS_OPTIONS,
} from '@modules/purchase-orders/constants/po.constants';
import { useCancelPOMutation, usePOsQuery } from '@modules/purchase-orders/hooks/po.hooks';
import type {
  ListPOsParams,
  POListItem,
  POStatusName,
} from '@modules/purchase-orders/schemas/po.schema';
import { vendorsApi } from '@modules/directory/api/vendors.api';
import { useLookupsQuery } from '../hooks/lookup.hooks';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = [
  'poNumber',
  'expectedDate',
  'deliveryDate',
  'total',
  'status',
  'createdAt',
] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

/* ---- Helpers ---- */

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

function isValidPOStatus(v: string | null): v is POStatusName {
  return (
    v === 'DRAFT' ||
    v === 'ISSUED' ||
    v === 'DELIVERED' ||
    v === 'CANCELLED'
  );
}

function formatOptionalDate(value?: string | null): string {
  return value ? formatDate(value) : '—';
}

function formatPaymentTerms(value?: string | null): string {
  return value ? value.replaceAll('_', ' ') : '—';
}

function formatOptionalCurrency(value?: string | null): string {
  return value ? formatCurrency(value) : '—';
}

function getVendorName(po: POListItem): string {
  return po.vendor?.name || '—';
}

function getReadableRfq(po: POListItem): string | null {
  return po.rfq?.rfqNumber || po.rfq?.title || null;
}

function getTradeCategoryLabel(po: POListItem, fallback?: string): string {
  return po.tradeCategory?.label ?? po.tradeCategory?.name ?? fallback ?? '—';
}

/* ---- Page ---- */

export default function ProjectPOs() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter: POStatusName | undefined = isValidPOStatus(searchParams.get('status'))
    ? (searchParams.get('status') as POStatusName)
    : undefined;
  const tradeCategoryFilter = searchParams.get('tradeCategoryId') ?? undefined;
  const vendorFilter = searchParams.get('vendorId') ?? undefined;
  const rfqFilter = searchParams.get('rfqId') ?? undefined;

  // Local search input tracks typing; debounce syncs to URL
  const searchQuery = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [vendorSearch, setVendorSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debouncedVendorSearch = useDebouncedValue(vendorSearch.trim(), 250);

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
    search: searchQuery || undefined,
    status: statusFilter,
    tradeCategoryId: tradeCategoryFilter,
    vendorId: vendorFilter,
    rfqId: rfqFilter,
  };

  const hasActiveFilters =
    !!searchQuery || !!statusFilter || !!tradeCategoryFilter || !!vendorFilter || !!rfqFilter;

  const { data, isLoading, isError, refetch } = usePOsQuery(filters);
  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const cancelMutation = useCancelPOMutation();
  const [cancelTarget, setCancelTarget] = useState<POListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const listData = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasReadableRfq = listData.some((po) => !!getReadableRfq(po));
  const tradeCategoryLabelById = useMemo(
    () => new Map((tradeCategories ?? []).map((cat) => [cat.id, cat.label ?? cat.name ?? cat.id])),
    [tradeCategories],
  );
  const selectedVendorOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!vendorFilter) return undefined;
    const po = listData.find((item) => item.vendorId === vendorFilter || item.vendor?.id === vendorFilter);
    return {
      value: vendorFilter,
      label: po?.vendor?.name ?? vendorFilter,
    };
  }, [listData, vendorFilter]);
  const vendorPicker = useVendorFilterOptions({
    search: debouncedVendorSearch,
    selectedOption: selectedVendorOption,
  });

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
              {row.original.poNumber ?? '—'}
            </Link>
            <span className="text-2sm text-muted-foreground line-clamp-1">
              {row.original.description ?? '—'}
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
      },
      {
        accessorKey: 'vendorId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground line-clamp-1">
              {getVendorName(row.original)}
            </span>
            {row.original.vendor?.paymentTerms && (
              <span className="text-2sm text-muted-foreground">
                {formatPaymentTerms(row.original.vendor.paymentTerms)}
              </span>
            )}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'rfqId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RFQ" />,
        cell: ({ row }) => (
          row.original.rfqId ? (
            <Link
              to={`/app/project/${projectId}/rfqs/${row.original.rfqId}`}
              className="font-mono text-xs text-foreground hover:text-primary"
              title={row.original.rfqId}
            >
              {getReadableRfq(row.original)}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )
        ),
        meta: {
          headerClassName: 'min-w-[100px]',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      {
        id: 'tradeCategoryId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Trade Category" />,
        cell: ({ row }) => (
          row.original.tradeCategory || row.original.tradeCategoryId ? (
            <Badge variant="primary" appearance="outline" size="sm">
              {getTradeCategoryLabel(
                row.original,
                row.original.tradeCategoryId
                  ? tradeCategoryLabelById.get(row.original.tradeCategoryId)
                  : undefined,
              )}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )
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
          const statusName = row.original.status;
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant={PO_STATUS_BADGE_VARIANTS[statusName] ?? 'primary'}
                appearance="outline"
                size="sm"
              >
                {PO_STATUS_LABELS[statusName] ?? statusName}
              </Badge>
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
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-medium text-foreground">
              {formatOptionalCurrency(row.original.total)}
            </span>
            <span className="text-2sm text-muted-foreground">
              Subtotal {formatOptionalCurrency(row.original.subtotal)}
            </span>
            <span className="text-2sm text-muted-foreground">
              Tax {formatOptionalCurrency(row.original.taxAmount)}
            </span>
            <span className="text-2sm text-muted-foreground">
              {formatPaymentTerms(row.original.paymentTerms)}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px] text-right',
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
        id: 'timeline',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Timeline" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-foreground">
              Expected: {formatOptionalDate(row.original.expectedDate)}
            </span>
            <span className="text-2sm text-muted-foreground">
              Delivered: {formatOptionalDate(row.original.deliveryDate)}
            </span>
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[180px]',
          skeleton: (
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          ),
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
        cell: ({ row }) => {
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
                {row.original.status === 'DRAFT' && (
                  <DropdownMenuItem asChild>
                    <Link to={`${row.original.id}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                )}
                {row.original.status !== 'CANCELLED' && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setCancelTarget(row.original);
                      setCancelReason('');
                    }}
                  >
                    Cancel
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
    [projectId, tradeCategoryLabelById],
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  const table = useReactTable({
    data: listData,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
      columnVisibility: {
        rfqId: hasReadableRfq,
      },
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
    <>
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
      <Card className="overflow-hidden">
        <CardHeader className="items-stretch sm:items-center">
          <CardTitle className="w-full overflow-x-auto sm:w-auto">
            {/* Status Tabs */}
            <div className="inline-flex min-w-max items-center gap-0">
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
              {PO_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    updateParams({ status: opt.value, page: undefined })
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
            </div>
          </CardTitle>
          <CardToolbar className="w-full sm:w-auto">
            <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
              <InputWrapper variant="sm" className="w-full sm:w-[220px]">
                <Search className="size-4" />
                <Input
                  placeholder="Search POs..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputWrapper>
              <div className="w-full sm:w-[180px]">
                <InfiniteSearchSelect
                  options={vendorPicker.options}
                  value={vendorFilter ?? null}
                  onValueChange={(value) =>
                    updateParams({ vendorId: value ?? undefined, page: undefined })
                  }
                  search={vendorSearch}
                  onSearchChange={setVendorSearch}
                  isLoading={vendorPicker.isLoading}
                  isFetchingNextPage={vendorPicker.isFetchingNextPage}
                  hasNextPage={vendorPicker.hasNextPage}
                  onFetchNextPage={() => vendorPicker.fetchNextPage()}
                  placeholder="All Vendors"
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found."
                  triggerClassName="h-8 text-xs"
                  placeholderClassName="text-foreground"
                />
              </div>
              <Select
                value={tradeCategoryFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    tradeCategoryId: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-full text-xs sm:w-[150px]">
                  <SelectValue placeholder="All Trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trades</SelectItem>
                  {tradeCategories?.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label ?? opt.name ?? opt.id}
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
                    setVendorSearch('');
                    updateParams({
                      search: undefined,
                      status: undefined,
                      tradeCategoryId: undefined,
                      vendorId: undefined,
                      rfqId: undefined,
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
              dense: true,
              cellBorder: false,
              rowBorder: true,
              headerBackground: true,
            }}
            tableClassNames={{
              base: 'min-w-[760px]',
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
    <Dialog
      open={!!cancelTarget}
      onOpenChange={(open) => {
        if (!open) {
          setCancelTarget(null);
          setCancelReason('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Purchase Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Provide a reason for cancelling{' '}
            <strong>{cancelTarget?.poNumber ?? 'this PO'}</strong>.
          </p>
          <Textarea
            placeholder="Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
          />
          {cancelReason.trim().length === 0 && (
            <p className="text-xs text-destructive">Cancellation reason is required.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setCancelTarget(null);
              setCancelReason('');
            }}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            disabled={!cancelTarget || cancelReason.trim().length === 0 || cancelMutation.isPending}
            onClick={() => {
              if (!cancelTarget) return;
              cancelMutation.mutate(
                { id: cancelTarget.id, reason: cancelReason.trim() },
                {
                  onSuccess: () => {
                    setCancelTarget(null);
                    setCancelReason('');
                  },
                },
              );
            }}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

function useVendorFilterOptions({
  search,
  selectedOption,
}: {
  search: string;
  selectedOption?: InfiniteSearchSelectOption;
}) {
  const query = useInfiniteQuery({
    queryKey: ['vendors', 'purchase-order-filter-picker', search],
    queryFn: ({ pageParam }) =>
      vendorsApi.list({
        search: search || undefined,
        page: pageParam,
        limit: 25,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
  });

  const options = useMemo(() => {
    const next =
      query.data?.pages.flatMap((page) =>
        page.data.map((vendor) => ({
          value: vendor.id,
          label: vendor.name,
          description: vendor.email ?? vendor.phone ?? undefined,
        })),
      ) ?? [];

    if (selectedOption && !next.some((option) => option.value === selectedOption.value)) {
      return [selectedOption, ...next];
    }

    return next;
  }, [query.data?.pages, selectedOption]);

  return {
    options,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
