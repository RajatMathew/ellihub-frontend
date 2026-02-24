import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertCircle, ClipboardList, Plus, RefreshCcw } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardTable,
} from '@app/components/ui/card';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { parsePageParam, parseSizeParam } from '@app/lib/helpers';

import { RfqListFilters } from '../components/rfq-list-filters';
import { RfqListStats } from '../components/rfq-list-stats';
import { useRfqColumns } from '../components/rfq-columns';
import {
  DEFAULT_PAGE_SIZE,
  HARDCODED_RFQS,
  SEARCH_DEBOUNCE_MS,
  TRACK_TABS,
  isSortField,
  isValidStatus,
  type MockRFQItem,
  type SortField,
  type TrackFilter,
} from '../constants/rfq.constants';

export default function RfqsPage() {
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

  // Tanstack sorting state
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === 'desc' }];

  // Columns
  const columns = useRfqColumns();

  // Table
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
      <RfqListStats data={HARDCODED_RFQS} />

      {/* Table card */}
      <Card>
        <RfqListFilters
          trackFilter={trackFilter}
          sortBy={sortBy}
          searchInput={searchInput}
          hasActiveFilters={hasActiveFilters}
          onTrackChange={(track) => updateParams({ track: track, page: undefined })}
          onSortChange={(value) =>
            updateParams({ sortBy: value === 'createdAt' ? undefined : value, page: undefined })
          }
          onSearchChange={handleSearchChange}
          onClearFilters={() => {
            setSearchInput('');
            updateParams({ search: undefined, status: undefined, page: undefined });
          }}
        />

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
