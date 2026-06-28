import { useEffect, useMemo, useRef, useState, type Ref } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useLookupsQuery } from '@/modules/lookup/hooks';
import { MonthlyBillsColumnToggle } from '@/modules/monthly-bills/components/monthly-bills-column-toggle';
import { MonthlyBillsFilters } from '@/modules/monthly-bills/components/monthly-bills-filters';
import { MonthlyBillsStats } from '@/modules/monthly-bills/components/monthly-bills-stats';
import { MonthlyBillsTable } from '@/modules/monthly-bills/components/monthly-bills-table';
import {
  getDefaultMonthlyBillColumns,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { useInfiniteMonthlyBillsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { useMonthlyBillsVendorFilterOptions } from '@/modules/monthly-bills/hooks/use-monthly-bills-vendor-filter-options';
import {
  getMonthlyBillMonthNumber,
  getMonthlyBillYear,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const tableHeaderActionButtonClassName =
  '!border-input !bg-background !text-foreground hover:!bg-background hover:!text-foreground [&_svg]:!text-muted-foreground';

interface MonthlyBillsSubcontractorPageProps {
  selectedDate: Date;
  enabled: boolean;
}

export function MonthlyBillsSubcontractorPage({
  selectedDate,
  enabled,
}: MonthlyBillsSubcontractorPageProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(getDefaultMonthlyBillColumns);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSaveVersion, setBulkSaveVersion] = useState(0);
  const [bulkCancelVersion, setBulkCancelVersion] = useState(0);
  const bulkSaveRef = useRef({
    active: false,
    version: 0,
    expected: 0,
    completed: 0,
    saved: 0,
    failed: 0,
  });

  const toggleColumn = (key: MonthlyBillColumnKey) =>
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);

  // Selected vendor option objects are the source of truth so labels render even when a vendor
  // is not on the currently loaded search page.
  const [selectedVendors, setSelectedVendors] = useState<InfiniteMultiSearchSelectOption[]>([]);
  const [vendorSearchInput, setVendorSearchInput] = useState('');
  const vendorSearch = useDebouncedValue(vendorSearchInput.trim(), 250);

  const [tradeCategoryIds, setTradeCategoryIds] = useState<string[]>([]);
  const [tradeCategorySearch, setTradeCategorySearch] = useState('');

  const vendorPicker = useMonthlyBillsVendorFilterOptions({
    search: vendorSearch,
    selectedOptions: selectedVendors,
  });

  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const tradeCategoryOptions = useMemo<InfiniteMultiSearchSelectOption[]>(() => {
    const query = tradeCategorySearch.trim().toLowerCase();
    return (tradeCategories ?? [])
      .map((category) => ({
        value: category.id,
        label: category.label ?? category.name ?? category.id,
      }))
      .filter((option) => !query || option.label.toLowerCase().includes(query));
  }, [tradeCategories, tradeCategorySearch]);

  const vendorIds = useMemo(() => selectedVendors.map((vendor) => vendor.value), [selectedVendors]);
  const hasActiveFilters = Boolean(search || vendorIds.length || tradeCategoryIds.length);

  const monthlyBillsParams = useMemo(
    () => ({
      month: getMonthlyBillMonthNumber(selectedDate),
      year: getMonthlyBillYear(selectedDate),
      size: 8,
      search: search || undefined,
      vendorId: vendorIds,
      tradeCategoryId: tradeCategoryIds,
    }),
    [search, selectedDate, tradeCategoryIds, vendorIds]
  );

  const monthlyBillsQuery = useInfiniteMonthlyBillsQuery(monthlyBillsParams, enabled);
  const monthlyBillsPages = monthlyBillsQuery.data?.pages;
  const hasMonthlyBillsData = monthlyBillsPages !== undefined;
  const showMonthlyBillsInitialLoader =
    enabled &&
    (monthlyBillsQuery.isLoading || (monthlyBillsQuery.isFetching && !hasMonthlyBillsData));
  const isRefreshingMonthlyBills =
    hasMonthlyBillsData && monthlyBillsQuery.isFetching && !monthlyBillsQuery.isFetchingNextPage;
  const monthlyBillsResponse = monthlyBillsPages?.[0];
  const groups = useMemo(
    () => monthlyBillsPages?.flatMap((page) => page.groups) ?? [],
    [monthlyBillsPages]
  );
  const lastPage = monthlyBillsPages?.at(-1);
  const pagination = lastPage?.meta.pagination ?? monthlyBillsResponse?.meta.pagination;
  const periodMeta = monthlyBillsResponse?.meta.period;
  const capabilities = monthlyBillsResponse?.meta.capabilities;
  const isCurrentPeriod = Boolean(periodMeta?.isCurrent);
  const canUpdateCurrentBills = Boolean(capabilities?.canUpdateBills);
  const canMarkCurrentPayment = Boolean(capabilities?.canMarkPayment);
  const effectiveBulkEditMode = isCurrentPeriod && bulkEditMode;
  const effectiveBulkSaving = isCurrentPeriod && bulkSaving;
  const effectiveBulkSaveVersion = isCurrentPeriod ? bulkSaveVersion : 0;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !monthlyBillsQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !monthlyBillsQuery.isFetchingNextPage
        ) {
          void monthlyBillsQuery.fetchNextPage();
        }
      },
      { rootMargin: '360px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    monthlyBillsQuery.fetchNextPage,
    monthlyBillsQuery.hasNextPage,
    monthlyBillsQuery.isFetchingNextPage,
  ]);

  const handleVendorChange = (ids: string[]) => {
    setSelectedVendors(
      ids.map(
        (id) =>
          selectedVendors.find((vendor) => vendor.value === id) ??
          vendorPicker.options.find((option) => option.value === id) ?? { value: id, label: id }
      )
    );
  };

  const clearFilters = () => {
    setSearchInput('');
    setSelectedVendors([]);
    setVendorSearchInput('');
    setTradeCategoryIds([]);
    setTradeCategorySearch('');
  };

  const handleBulkSave = () => {
    if (!canUpdateCurrentBills) return;

    if (groups.length === 0) return;

    setBulkSaveVersion((current) => {
      const version = current + 1;
      bulkSaveRef.current = {
        active: true,
        version,
        expected: groups.length,
        completed: 0,
        saved: 0,
        failed: 0,
      };
      return version;
    });
    setBulkSaving(true);
  };

  const handleBulkSaveComplete = (result: { version: number; saved: number; failed: number }) => {
    const state = bulkSaveRef.current;
    if (!state.active || result.version !== state.version) return;

    state.completed += 1;
    state.saved += result.saved;
    state.failed += result.failed;

    if (state.completed < state.expected) return;

    state.active = false;
    setBulkSaving(false);
    setBulkSaveVersion(0);

    if (state.failed > 0) {
      toast.error(`Saved ${state.saved} planned payment(s). ${state.failed} failed.`);
      return;
    }

    setBulkEditMode(false);
    if (state.saved > 0) {
      toast.success(`Saved ${state.saved} planned payment(s).`);
    } else {
      toast.info('No monthly bill changes to save.');
    }
  };

  const handleBulkCancel = () => {
    bulkSaveRef.current.active = false;
    setBulkCancelVersion((current) => current + 1);
    setBulkSaveVersion(0);
    setBulkEditMode(false);
    setBulkSaving(false);
  };

  return (
    <div>
      <MonthlyBillsStats
        summary={monthlyBillsResponse?.meta.summary}
        isLoading={showMonthlyBillsInitialLoader}
      />

      <Card className="overflow-hidden">
        <CardHeader className="items-stretch gap-3 2xl:flex-row 2xl:items-center">
          <CardTitle className="!text-table-card-header-foreground text-base font-semibold tracking-normal">
            Subcontractor Bills
          </CardTitle>
          <CardToolbar className="w-full flex-col items-stretch gap-2.5 2xl:w-auto 2xl:flex-row 2xl:items-center">
            <MonthlyBillsFilters
              searchInput={searchInput}
              vendorIds={vendorIds}
              vendorSearch={vendorSearchInput}
              vendorPicker={vendorPicker}
              tradeCategoryIds={tradeCategoryIds}
              tradeCategorySearch={tradeCategorySearch}
              tradeCategoryOptions={tradeCategoryOptions}
              hasActiveFilters={hasActiveFilters}
              onSearchChange={setSearchInput}
              onVendorChange={handleVendorChange}
              onVendorSearchChange={setVendorSearchInput}
              onTradeCategoryChange={setTradeCategoryIds}
              onTradeCategorySearchChange={setTradeCategorySearch}
              onClearFilters={clearFilters}
            />

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end 2xl:w-auto">
              {isRefreshingMonthlyBills && (
                <span className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 text-xs font-medium text-muted-foreground sm:w-auto">
                  <Loader2 className="size-3.5 animate-spin" />
                  Refreshing
                </span>
              )}
              <MonthlyBillsColumnToggle
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
              />
              {canUpdateCurrentBills &&
                (effectiveBulkEditMode ? (
                  <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
                    <Button
                      type="button"
                      size="sm"
                      disabled={effectiveBulkSaving}
                      onClick={handleBulkSave}
                      className="min-w-28"
                    >
                      {effectiveBulkSaving ? (
                        <Loader2 className="size-4 animate-spin text-white!" />
                      ) : (
                        <Save className="size-4 text-white!" />
                      )}
                      Save All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={effectiveBulkSaving}
                      onClick={handleBulkCancel}
                      className={`min-w-24 ${tableHeaderActionButtonClassName}`}
                    >
                      <X className="size-3.5" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkEditMode(true)}
                    className={`w-full sm:w-auto ${tableHeaderActionButtonClassName}`}
                  >
                    <Pencil className="size-3.5" />
                    Bulk Edit
                  </Button>
                ))}
            </div>
          </CardToolbar>
        </CardHeader>

        <MonthlyBillsTable
          groups={groups}
          period={periodMeta}
          selectedDate={selectedDate}
          canUpdateBills={canUpdateCurrentBills}
          canMarkPayment={canMarkCurrentPayment}
          bulkEditMode={effectiveBulkEditMode}
          bulkSaveVersion={effectiveBulkSaveVersion}
          bulkCancelVersion={bulkCancelVersion}
          visibleColumns={visibleColumns}
          isLoading={showMonthlyBillsInitialLoader}
          isError={monthlyBillsQuery.isError}
          onRetry={() => void monthlyBillsQuery.refetch()}
          onBulkSaveComplete={handleBulkSaveComplete}
        />
        <MonthlyBillsLoadMore
          ref={loadMoreRef}
          loadedCount={groups.length}
          totalCount={
            pagination?.totalItems ?? monthlyBillsResponse?.meta.summary.projectCount ?? 0
          }
          hasNextPage={Boolean(monthlyBillsQuery.hasNextPage)}
          isFetchingNextPage={monthlyBillsQuery.isFetchingNextPage}
        />
      </Card>
    </div>
  );
}

interface MonthlyBillsLoadMoreProps {
  loadedCount: number;
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

function MonthlyBillsLoadMore({
  ref,
  loadedCount,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
}: MonthlyBillsLoadMoreProps & { ref: Ref<HTMLDivElement> }) {
  if (totalCount === 0 && !isFetchingNextPage) return null;

  return (
    <div ref={ref} className="flex min-h-14 items-center justify-center border-t px-4 py-4 text-xs">
      {isFetchingNextPage ? (
        <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading more bills
        </span>
      ) : (
        <span className="font-medium text-muted-foreground">
          {hasNextPage
            ? `Loaded ${loadedCount} of ${totalCount} projects`
            : `Showing ${loadedCount} of ${totalCount} projects`}
        </span>
      )}
    </div>
  );
}
