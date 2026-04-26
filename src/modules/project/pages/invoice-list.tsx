import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, MoreHorizontal, Plus, RefreshCcw, Search, X } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@app/components/ui/input';
import { Skeleton } from '@app/components/ui/skeleton';
import { formatCurrency, formatDate, parsePageParam, parseSizeParam } from '@app/lib/helpers';
import { vendorsApi } from '@modules/directory/api/vendors.api';
import { poApi } from '@modules/purchase-orders/api/po.api';
import type { POListItem } from '@modules/purchase-orders/schemas/po.schema';

import { useInvoiceListQuery } from '../hooks';
import type { InvoiceListItem, ListInvoiceParams } from '../schemas/invoice.schema';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['createdAt', 'invoiceNumber', 'invoiceDate', 'dueDate', 'totalAmount'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

function isSortByField(value: string | null): value is SortByField {
  return SORT_BY_OPTIONS.includes(value as SortByField);
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDate(value) : '-';
}

function formatOptionalCurrency(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? formatCurrency(numeric) : '-';
}

function getPaymentLabel(invoice: InvoiceListItem) {
  if (invoice.isPaid) return 'Paid';
  if (invoice.isDisputed) return 'Disputed';
  return 'Unpaid';
}

export function InvoiceListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const vendorFilter = searchParams.get('vendorId') || undefined;
  const purchaseOrderFilter = searchParams.get('purchaseOrderId') || undefined;
  const paidParam = searchParams.get('isPaid');
  const paidFilter = paidParam === 'true' ? true : paidParam === 'false' ? false : undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [vendorSearch, setVendorSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debouncedVendorSearch = useDebouncedValue(vendorSearch.trim(), 250);
  const debouncedPOSearch = useDebouncedValue(poSearch.trim(), 250);

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

  const filters: ListInvoiceParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    vendorId: vendorFilter,
    purchaseOrderId: purchaseOrderFilter,
    isPaid: paidFilter,
  };

  const hasActiveFilters =
    !!searchQuery || !!vendorFilter || !!purchaseOrderFilter || paidFilter !== undefined;

  const { data, isLoading, isError, refetch } = useInvoiceListQuery(filters);
  const listData = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalItems ?? 0;
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  const selectedVendorOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!vendorFilter) return undefined;
    const invoice = listData.find((item) => item.vendorId === vendorFilter || item.vendor?.id === vendorFilter);
    return {
      value: vendorFilter,
      label: invoice?.vendor?.name ?? vendorFilter,
    };
  }, [listData, vendorFilter]);

  const selectedPOOption = useMemo<InfiniteSearchSelectOption | undefined>(() => {
    if (!purchaseOrderFilter) return undefined;
    const invoice = listData.find(
      (item) =>
        item.purchaseOrderId === purchaseOrderFilter ||
        item.purchaseOrder?.id === purchaseOrderFilter,
    );
    return {
      value: purchaseOrderFilter,
      label: invoice?.purchaseOrder?.poNumber ?? purchaseOrderFilter,
      description: invoice?.vendor?.name ?? undefined,
    };
  }, [listData, purchaseOrderFilter]);

  const vendorPicker = useVendorFilterOptions({
    search: debouncedVendorSearch,
    selectedOption: selectedVendorOption,
  });
  const purchaseOrderPicker = usePurchaseOrderFilterOptions({
    projectId,
    search: debouncedPOSearch,
    selectedOption: selectedPOOption,
  });

  const columns = useMemo<ColumnDef<InvoiceListItem>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice #" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              to={`${row.original.id}`}
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              {row.original.invoiceNumber ?? '-'}
            </Link>
            {row.original.notes && (
              <span className="line-clamp-1 text-2sm text-muted-foreground">
                {row.original.notes}
              </span>
            )}
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
        id: 'vendor',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.vendor?.name ?? '-'}</span>
        ),
        meta: {
          headerClassName: 'min-w-[180px]',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
        enableSorting: false,
      },
      {
        id: 'purchaseOrder',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Purchase Order" />,
        cell: ({ row }) =>
          row.original.purchaseOrder?.id ? (
            <Link
              to={`/app/project/${projectId}/purchase-orders/${row.original.purchaseOrder.id}`}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {row.original.purchaseOrder.poNumber}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">
              {row.original.purchaseOrderId ?? '-'}
            </span>
          ),
        meta: {
          headerClassName: 'min-w-[170px]',
          skeleton: <Skeleton className="h-3.5 w-32" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatOptionalDate(row.original.invoiceDate)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[130px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => {
          const isPastDue =
            !row.original.isPaid &&
            !!row.original.dueDate &&
            new Date(row.original.dueDate) < new Date();

          return (
            <span
              className={`text-sm ${
                isPastDue ? 'font-medium text-destructive' : 'text-muted-foreground'
              }`}
            >
              {formatOptionalDate(row.original.dueDate)}
            </span>
          );
        },
        meta: {
          headerClassName: 'min-w-[130px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
      },
      {
        accessorKey: 'totalAmount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-medium tabular-nums">
              {formatOptionalCurrency(row.original.totalAmount)}
            </span>
            {Number(row.original.taxAmount ?? 0) > 0 && (
              <span className="text-2sm text-muted-foreground">
                Tax {formatOptionalCurrency(row.original.taxAmount)}
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
        id: 'payment',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Payment" />,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={row.original.isPaid ? 'success' : 'warning'}
                appearance="outline"
                size="sm"
              >
                {getPaymentLabel(row.original)}
              </Badge>
              {row.original.isDisputed && (
                <Badge variant="destructive" appearance="outline" size="sm">
                  Disputed
                </Badge>
              )}
            </div>
            {row.original.paidDate && (
              <span className="text-2sm text-muted-foreground">
                Paid {formatDate(row.original.paidDate)}
              </span>
            )}
          </div>
        ),
        meta: {
          headerClassName: 'min-w-[150px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
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
              {!row.original.isPaid && (
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
    [projectId],
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
            <ToolbarPageTitle>Invoices</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount === 1 ? '' : 's'}`
                : `All Invoices: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                Add Invoice
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
                onClick={() => updateParams({ isPaid: undefined, page: undefined })}
                className={`border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                  paidFilter === undefined
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => updateParams({ isPaid: 'true', page: undefined })}
                className={`border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                  paidFilter === true
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Paid
              </button>
              <button
                type="button"
                onClick={() => updateParams({ isPaid: 'false', page: undefined })}
                className={`border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                  paidFilter === false
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Unpaid
              </button>
            </div>
          </CardTitle>
          <CardToolbar className="w-full sm:w-auto">
            <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
              <InputWrapper variant="sm" className="w-full sm:w-[240px]">
                <Search className="size-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </InputWrapper>
              <div className="w-full sm:w-[210px]">
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
              <div className="w-full sm:w-[230px]">
                <InfiniteSearchSelect
                  options={purchaseOrderPicker.options}
                  value={purchaseOrderFilter ?? null}
                  onValueChange={(value) =>
                    updateParams({ purchaseOrderId: value ?? undefined, page: undefined })
                  }
                  search={poSearch}
                  onSearchChange={setPoSearch}
                  isLoading={purchaseOrderPicker.isLoading}
                  isFetchingNextPage={purchaseOrderPicker.isFetchingNextPage}
                  hasNextPage={purchaseOrderPicker.hasNextPage}
                  onFetchNextPage={() => purchaseOrderPicker.fetchNextPage()}
                  placeholder="All Purchase Orders"
                  searchPlaceholder="Search purchase orders..."
                  emptyMessage="No purchase orders found."
                  triggerClassName="h-8 text-xs"
                  placeholderClassName="text-foreground"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearchInput('');
                    setVendorSearch('');
                    setPoSearch('');
                    updateParams({
                      search: undefined,
                      vendorId: undefined,
                      purchaseOrderId: undefined,
                      isPaid: undefined,
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
              <p className="text-sm font-medium">Failed to load invoices</p>
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
                <FileText className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No invoices yet</p>
                <p className="text-xs text-muted-foreground">
                  Invoices will appear here once created.
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
              base: 'min-w-[1080px]',
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

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

function formatPurchaseOrderOption(po: POListItem): InfiniteSearchSelectOption {
  return {
    value: po.id,
    label: po.poNumber ?? po.id,
    description: [po.vendor?.name, po.total ? formatCurrency(Number(po.total)) : undefined]
      .filter(Boolean)
      .join(' - '),
  };
}

function useVendorFilterOptions({
  search,
  selectedOption,
}: {
  search: string;
  selectedOption?: InfiniteSearchSelectOption;
}) {
  const query = useInfiniteQuery({
    queryKey: ['vendors', 'invoice-filter-picker', search],
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

function usePurchaseOrderFilterOptions({
  projectId,
  search,
  selectedOption,
}: {
  projectId: string;
  search: string;
  selectedOption?: InfiniteSearchSelectOption;
}) {
  const query = useInfiniteQuery({
    queryKey: ['purchase-orders', 'invoice-filter-picker', projectId, search],
    queryFn: ({ pageParam }) =>
      poApi.list({
        projectId,
        search: search || undefined,
        page: pageParam,
        size: 25,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    enabled: !!projectId,
  });

  const options = useMemo(() => {
    const next =
      query.data?.pages.flatMap((page) => page.data.map(formatPurchaseOrderOption)) ?? [];

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
