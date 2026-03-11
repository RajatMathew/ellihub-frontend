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
  FileText,
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
  useDeleteInvoiceMutation,
  useInvoiceListQuery,
  useInvoiceStatusesQuery,
  useInvoiceSummaryQuery,
} from '../hooks';
import {
  getInvoiceStatusBadgeVariant,
  INVOICE_TYPE_OPTIONS,
  INVOICE_CATEGORY_OPTIONS,
} from '../constants/invoice.constants';
import type { ListInvoiceParams, InvoiceListItem } from '../schemas/invoice.schema';

/* ---- Constants ---- */

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_BY_OPTIONS = ['invoiceNumber', 'invoiceDate', 'dueDate', 'totalAmount', 'createdAt'] as const;
type SortByField = (typeof SORT_BY_OPTIONS)[number];

function isSortByField(v: string | null): v is SortByField {
  return SORT_BY_OPTIONS.includes(v as SortByField);
}

/* ---- Page ---- */

export function InvoiceListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortByField = isSortByField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortByField)
    : 'invoiceNumber';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const statusFilter = searchParams.get('status') ?? undefined;
  const typeFilter = searchParams.get('invoiceType') ?? undefined;
  const categoryFilter = searchParams.get('category') ?? undefined;

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
  const filters: ListInvoiceParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    status: statusFilter,
    invoiceType: typeFilter,
    category: categoryFilter,
  };

  const hasActiveFilters = !!searchQuery || !!statusFilter || !!typeFilter || !!categoryFilter;

  const { data, isLoading, isError, refetch } = useInvoiceListQuery(filters);
  const { data: summary } = useInvoiceSummaryQuery(projectId);
  const { data: statuses } = useInvoiceStatusesQuery();
  const del = useDeleteInvoiceMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;

  // Map URL sort state → TanStack SortingState
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  // Summary uses backend shape: byStatus.pending/approved/rejected + overdueCount/disputedCount
  const summaryData = summary as Record<string, unknown> | undefined;
  const byStatus = (summaryData?.byStatus ?? {}) as Record<string, { count?: number; totalAmount?: number }>;

  const statsItems = [
    {
      label: 'Pending',
      value: byStatus.pending?.count ?? 0,
      description: formatCurrency(byStatus.pending?.totalAmount ?? 0),
      icon: <FileText className="size-6 text-warning" />,
      bgClass: 'bg-warning/10',
    },
    {
      label: 'Approved',
      value: byStatus.approved?.count ?? 0,
      description: formatCurrency(byStatus.approved?.totalAmount ?? 0),
      icon: <FileText className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
    {
      label: 'Paid',
      value: summaryData?.totalPaid != null ? formatCurrency(summaryData.totalPaid as number) : formatCurrency(0),
      description: `Outstanding: ${formatCurrency((summaryData?.totalOutstanding as number) ?? 0)}`,
      icon: <FileText className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Overdue',
      value: (summaryData?.overdueCount as number) ?? 0,
      description: `Disputed: ${(summaryData?.disputedCount as number) ?? 0}`,
      icon: <FileText className="size-6 text-destructive" />,
      bgClass: 'bg-destructive/10',
    },
  ];

  const columns = useMemo<ColumnDef<InvoiceListItem>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice #" />,
        cell: ({ row }) =>
          row.original.invoiceNumber ? (
            <Link
              to={`${row.original.id}`}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {row.original.invoiceNumber}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: { headerClassName: 'min-w-[120px]' },
      },
      {
        id: 'vendor',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.vendor?.name ?? '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[180px]' },
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.invoiceDate ? formatDate(row.original.invoiceDate) : '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[130px]' },
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => (
          <span className={`text-sm ${row.original.isPastDue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {row.original.dueDate ? formatDate(row.original.dueDate) : '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[130px]' },
      },
      {
        accessorKey: 'totalAmount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(row.original.totalAmount)}
          </span>
        ),
        meta: { headerClassName: 'min-w-[120px]' },
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.status ? (
            <Badge variant={getInvoiceStatusBadgeVariant(row.original.status.name)} appearance="light" size="sm">
              {row.original.status.label}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        meta: { headerClassName: 'min-w-[120px]' },
        enableSorting: false,
      },
      {
        id: 'invoiceType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.invoiceType ?? '—'}
          </span>
        ),
        meta: { headerClassName: 'min-w-[100px]' },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const isPending = row.original.status?.name === 'PENDING';
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
                {isPending && (
                  <DropdownMenuItem asChild>
                    <Link to={`${row.original.id}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                )}
                {isPending && (
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
        const newSortBy = isSortByField(col.id) ? col.id : 'invoiceNumber';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'invoiceNumber' ? undefined : newSortBy,
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
            <ToolbarPageTitle>Invoices</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
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
          <CardTitle>Invoices</CardTitle>
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
                value={typeFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    invoiceType: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <Filter className="size-3.5 mr-1.5" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {INVOICE_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter ?? 'all'}
                onValueChange={(value) =>
                  updateParams({
                    category: value === 'all' ? undefined : value,
                    page: undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <Filter className="size-3.5 mr-1.5" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {INVOICE_CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search invoices..."
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
                      invoiceType: undefined,
                      category: undefined,
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
                  Click &quot;+ Add Invoice&quot; to get started.
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
