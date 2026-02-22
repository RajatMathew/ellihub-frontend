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
  Award,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

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
import { formatDate, parsePageParam, parseSizeParam } from '@app/lib/helpers';

import { RFQStatus, TradeCategory, type RFQListItem } from '@modules/rfq/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS = ['rfqNumber', 'title', 'quoteDeadline', 'status', 'createdAt'] as const;
type SortField = (typeof SORT_OPTIONS)[number];

const STATUS_LABELS: Record<string, string> = {
  [RFQStatus.DRAFT]: 'Draft',
  [RFQStatus.PUBLISHED]: 'Open',
  [RFQStatus.CLOSED]: 'Open',
  [RFQStatus.AWARDED]: 'Awarded',
  [RFQStatus.CANCELLED]: 'Cancelled',
};

const STATUS_BADGE_VARIANT: Record<
  string,
  'secondary' | 'primary' | 'warning' | 'success' | 'destructive' | 'info'
> = {
  [RFQStatus.DRAFT]: 'secondary',
  [RFQStatus.PUBLISHED]: 'info',
  [RFQStatus.CLOSED]: 'warning',
  [RFQStatus.AWARDED]: 'success',
  [RFQStatus.CANCELLED]: 'destructive',
};

const STATUS_BADGE_APPEARANCE: Record<string, 'default' | 'light' | 'outline' | 'ghost'> = {
  [RFQStatus.DRAFT]: 'outline',
  [RFQStatus.PUBLISHED]: 'light',
  [RFQStatus.CLOSED]: 'light',
  [RFQStatus.AWARDED]: 'light',
  [RFQStatus.CANCELLED]: 'light',
};

const TRADE_CATEGORY_LABELS: Record<string, string> = {
  [TradeCategory.ELECTRICAL]: 'Electrical',
  [TradeCategory.PLUMBING]: 'Plumbing',
  [TradeCategory.HVAC]: 'HVAC',
  [TradeCategory.CARPENTRY]: 'Carpentry',
  [TradeCategory.MASONRY]: 'Masonry',
  [TradeCategory.PAINTING]: 'Painting',
  [TradeCategory.ROOFING]: 'Roofing',
  [TradeCategory.LANDSCAPING]: 'Landscaping',
  [TradeCategory.GENERAL_CONSTRUCTION]: 'General Construction',
  [TradeCategory.MECHANICAL]: 'Mechanical',
  [TradeCategory.CIVIL]: 'Civil',
  [TradeCategory.OTHER]: 'Other',
  MATERIAL: 'Material',
  FABRICATION: 'Fabrication',
  INSTALLATION: 'Installation',
};

// ---------------------------------------------------------------------------
// Mock / Hardcoded data (temporary)
// ---------------------------------------------------------------------------

type MockRFQItem = RFQListItem & { awardedVendorName?: string };

const HARDCODED_RFQS: MockRFQItem[] = [
  {
    id: '1',
    rfqNumber: '2025-101',
    title: 'Exterior Door Hardware Package',
    tradeCategory: 'MATERIAL' as TradeCategory,
    status: RFQStatus.AWARDED,
    quoteDeadline: '2025-02-15',
    vendorsInvitedCount: 3,
    quotesReceivedCount: 3,
    awardedVendorName: 'Mid-Island Doors',
  },
  {
    id: '2',
    rfqNumber: '2025-102',
    title: 'Custom Steel Door Frames',
    tradeCategory: 'FABRICATION' as TradeCategory,
    status: RFQStatus.PUBLISHED,
    quoteDeadline: '2025-02-28',
    vendorsInvitedCount: 5,
    quotesReceivedCount: 2,
  },
  {
    id: '3',
    rfqNumber: '2025-103',
    title: 'Glazing & Storefront Systems',
    tradeCategory: 'INSTALLATION' as TradeCategory,
    status: RFQStatus.PUBLISHED,
    quoteDeadline: '2025-03-10',
    vendorsInvitedCount: 2,
    quotesReceivedCount: 0,
  },
  {
    id: '4',
    rfqNumber: '2025-104',
    title: 'Pantry Millwork & Countertops',
    tradeCategory: 'FABRICATION' as TradeCategory,
    status: RFQStatus.PUBLISHED,
    quoteDeadline: '2025-02-10',
    vendorsInvitedCount: 4,
    quotesReceivedCount: 1,
  },
  {
    id: '5',
    rfqNumber: '2025-105',
    title: 'Acoustic Baffles - Auditorium',
    tradeCategory: 'MATERIAL' as TradeCategory,
    status: RFQStatus.DRAFT,
    quoteDeadline: '2025-03-01',
    vendorsInvitedCount: 0,
    quotesReceivedCount: 0,
  },
];

// Track tabs shown in the card header
const TRACK_TABS = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'FABRICATION', label: 'Fabrication' },
  { value: 'INSTALLATION', label: 'Installation' },
] as const;
type TrackFilter = (typeof TRACK_TABS)[number]['value'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSortField(v: string | null): v is SortField {
  return SORT_OPTIONS.includes(v as SortField);
}

function isValidStatus(v: string | null): v is string {
  return Object.values(RFQStatus).includes(v as never);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectRfqs() {
  useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-derived state
  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'));
  const searchQuery = searchParams.get('search') ?? '';
  const sortBy: SortField = isSortField(searchParams.get('sortBy'))
    ? (searchParams.get('sortBy') as SortField)
    : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const statusFilter = isValidStatus(searchParams.get('status'))
    ? searchParams.get('status')!
    : undefined;
  const trackFilter = (TRACK_TABS.map((t) => t.value) as string[]).includes(
    searchParams.get('track') ?? '',
  )
    ? (searchParams.get('track') as TrackFilter)
    : undefined;

  // Local search input — debounced to URL
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
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '') next.delete(k);
          else next.set(k, v);
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

  // Hardcoded data — client-side filtering
  const isLoading = false;
  const isError = false;
  const refetch = () => {};

  const filteredData = useMemo(() => {
    let result: MockRFQItem[] = HARDCODED_RFQS;
    if (trackFilter) result = result.filter((r) => r.tradeCategory === trackFilter);
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q),
      );
    }
    return result;
  }, [trackFilter, statusFilter, searchQuery]);

  const listData = filteredData.slice((page - 1) * size, page * size);
  const totalCount = filteredData.length;
  const hasActiveFilters = !!searchQuery || !!statusFilter || !!trackFilter;

  // Stats from full hardcoded list
  const stats = useMemo(
    () => ({
      total: HARDCODED_RFQS.length,
      draft: HARDCODED_RFQS.filter((r) => r.status === RFQStatus.DRAFT).length,
      open: HARDCODED_RFQS.filter(
        (r) => r.status === RFQStatus.PUBLISHED || r.status === RFQStatus.CLOSED,
      ).length,
      awarded: HARDCODED_RFQS.filter((r) => r.status === RFQStatus.AWARDED).length,
    }),
    [],
  );

  const statsItems = [
    {
      label: 'Total RFQ',
      value: stats.total,
      description: 'All requests for quotation',
      icon: <ClipboardList className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Draft',
      value: stats.draft,
      description: 'Not yet published',
      icon: <FileText className="size-6 text-muted-foreground" />,
      bgClass: 'bg-muted/50',
    },
    {
      label: 'Open',
      value: stats.open,
      description: 'Published or closed for quotes',
      icon: <CheckCircle2 className="size-6 text-info" />,
      bgClass: 'bg-info/10',
    },
    {
      label: 'Awarded',
      value: stats.awarded,
      description: 'Vendor selected',
      icon: <Award className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
  ];

  // Tanstack sorting state
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<RFQListItem>[]>(
    () => [
      {
        accessorKey: 'rfqNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RFQ #" />,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground font-mono">
            {row.original.rfqNumber}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[120px]',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
        cell: ({ row }) => {
          const item = row.original as MockRFQItem;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground line-clamp-1">
                {row.original.title}
              </span>
              {item.awardedVendorName ? (
                <span className="text-2sm font-medium flex items-center gap-1 text-success">
                  <CheckCircle2 className="size-3 shrink-0 text-success" />
                  Awarded:{' '}
                  <span className="font-semibold">{item.awardedVendorName}</span>
                </span>
              ) : (
                <span className="text-2sm text-muted-foreground">
                  {TRADE_CATEGORY_LABELS[row.original.tradeCategory] ?? row.original.tradeCategory}
                </span>
              )}
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-[480px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
          ),
        },
      },
      {
        accessorKey: 'tradeCategory',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Track" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {TRADE_CATEGORY_LABELS[row.original.tradeCategory] ?? row.original.tradeCategory}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[130px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge
              variant={STATUS_BADGE_VARIANT[s] ?? 'secondary'}
              appearance={STATUS_BADGE_APPEARANCE[s] ?? 'default'}
              size="sm"
            >
              {STATUS_LABELS[s] ?? s}
            </Badge>
          );
        },
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: true,
      },
      {
        accessorKey: 'quoteDeadline',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Due Date" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground tabular-nums">
            {formatDate(row.original.quoteDeadline)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[140px]',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
      },
      {
        id: 'vendors',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendors" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground tabular-nums">
            {row.original.vendorsInvitedCount}{' '}
            <span className="text-muted-foreground">
              {row.original.vendorsInvitedCount === 1 ? 'vendor' : 'vendors'}
            </span>
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      {
        id: 'quotes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Quotes" />,
        cell: ({ row }) => (
          <Link
            to={`${row.original.rfqNumber}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors tabular-nums"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-semibold text-primary">{row.original.quotesReceivedCount}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{row.original.vendorsInvitedCount}</span>
            <span className="text-muted-foreground ml-0.5">Quotes</span>
          </Link>
        ),
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-6 w-24 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [],
  );

  // ---------------------------------------------------------------------------
  // Table
  // ---------------------------------------------------------------------------
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
        patches.size =
          next.pageSize === DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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
        const newSortBy = isSortField(col.id) ? col.id : 'createdAt';
        const newSortOrder = col.desc ? 'desc' : 'asc';
        updateParams({
          sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
          sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
          page: undefined,
        });
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="container-fluid py-7.5">
      {/* Toolbar */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>Request for Quotations</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" asChild>
              <Link to="create">
                <Plus className="size-4" />
                New RFQ
              </Link>
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* Stats */}
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

      {/* Table card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {/* Track tabs */}
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => updateParams({ track: undefined, page: undefined })}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                  !trackFilter
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {TRACK_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => updateParams({ track: tab.value, page: undefined })}
                  className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                    trackFilter === tab.value
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardTitle>
          <CardToolbar>
            <div className="flex items-center gap-2.5">
              <InputWrapper variant="sm">
                <Search className="size-4" />
                <Input
                  placeholder="Search RFQ..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </InputWrapper>
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  updateParams({ sortBy: value === 'createdAt' ? undefined : value, page: undefined })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest</SelectItem>
                  <SelectItem value="rfqNumber">RFQ #</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="quoteDeadline">Deadline</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearchInput('');
                    updateParams({ search: undefined, status: undefined, page: undefined });
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
              <p className="text-sm font-medium">Failed to load RFQ</p>
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
            onRowClick={(row) => navigate((row as MockRFQItem).rfqNumber)}
            emptyMessage={
              <div className="flex flex-col items-center gap-2 py-8">
                <ClipboardList className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No RFQ yet</p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;+ New RFQ&quot; to create your first request for quotation.
                </p>
              </div>
            }
            tableLayout={{ cellBorder: false, rowBorder: true, headerBackground: true }}
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
