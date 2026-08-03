import { useEffect, useMemo, useRef, useState, type Ref } from 'react';

import { TableCardHeader, TableCardHeaderClearButton } from '@/app/components/table-card-header';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useLookupsQuery } from '@/modules/lookup/hooks';
import { MonthlyBillsColumnToggle } from '@/modules/monthly-bills/components/monthly-bills-column-toggle';
import { MonthlyBillsFilters } from '@/modules/monthly-bills/components/monthly-bills-filters';
import { MonthlyBillsStats } from '@/modules/monthly-bills/components/monthly-bills-stats';
import { MonthlyBillsTable } from '@/modules/monthly-bills/components/monthly-bills-table';
import { PaymentMarkedDialog } from '@/modules/monthly-bills/components/payment-marked-dialog';
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
import type {
  MarkPaymentResult,
  MonthlyBillItem,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const tableHeaderActionButtonClassName =
  '!border-table-card-header-foreground/25 !bg-card-header !text-table-card-header-foreground hover:!border-table-card-header-foreground/40 hover:!bg-card-header [&_svg]:!text-table-card-header-foreground';

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
  const [markedPayment, setMarkedPayment] = useState<{
    payment: MarkPaymentResult;
    bill: MonthlyBillItem;
    amount: number;
  } | null>(null);
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
  const {
    fetchNextPage: fetchNextMonthlyBillsPage,
    hasNextPage: hasNextMonthlyBillsPage,
    isFetchingNextPage: isFetchingNextMonthlyBillsPage,
  } = monthlyBillsQuery;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextMonthlyBillsPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextMonthlyBillsPage) {
          void fetchNextMonthlyBillsPage();
        }
      },
      { rootMargin: '360px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextMonthlyBillsPage, hasNextMonthlyBillsPage, isFetchingNextMonthlyBillsPage]);

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
    <>
      <div>
        <MonthlyBillsStats
          summary={monthlyBillsResponse?.meta.summary}
          isLoading={showMonthlyBillsInitialLoader}
        />

        <Card className="overflow-hidden">
          <TableCardHeader
            actions={
              <div className="ml-auto flex w-full min-w-0 flex-col items-stretch gap-2.5 xl:w-auto xl:flex-row xl:flex-nowrap xl:items-center xl:justify-end">
                <div className="min-w-0 xl:w-auto xl:shrink-0">
                  <MonthlyBillsFilters
                    searchInput={searchInput}
                    vendorIds={vendorIds}
                    vendorSearch={vendorSearchInput}
                    vendorPicker={vendorPicker}
                    tradeCategoryIds={tradeCategoryIds}
                    tradeCategorySearch={tradeCategorySearch}
                    tradeCategoryOptions={tradeCategoryOptions}
                    onSearchChange={setSearchInput}
                    onVendorChange={handleVendorChange}
                    onVendorSearchChange={setVendorSearchInput}
                    onTradeCategoryChange={setTradeCategoryIds}
                    onTradeCategorySearchChange={setTradeCategorySearch}
                    className="xl:w-auto xl:grid-cols-[18rem_12rem_12rem]"
                  />
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:w-auto xl:flex-nowrap">
                  <MonthlyBillsColumnToggle
                    visibleColumns={visibleColumns}
                    onToggleColumn={toggleColumn}
                    triggerClassName={`${tableHeaderActionButtonClassName} data-[state=open]:!border-table-card-header-foreground/40 data-[state=open]:!bg-card-header data-[state=open]:!text-table-card-header-foreground`}
                    contentClassName="!bg-popover"
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
                        className={`w-full shrink-0 sm:w-auto ${tableHeaderActionButtonClassName}`}
                      >
                        <Pencil className="size-3.5" />
                        Bulk Edit
                      </Button>
                    ))}
                  <TableCardHeaderClearButton active={hasActiveFilters} onClick={clearFilters} />
                </div>
              </div>
            }
          />

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
            onPaymentMarked={(payment, bill, amount) => {
              setMarkedPayment({ payment, bill, amount });
            }}
          />
          <MonthlyBillsLoadMore
            ref={loadMoreRef}
            loadedCount={groups.length}
            totalCount={
              pagination?.totalItems ?? monthlyBillsResponse?.meta.summary.projectCount ?? 0
            }
            hasNextPage={Boolean(hasNextMonthlyBillsPage)}
            isFetchingNextPage={isFetchingNextMonthlyBillsPage}
          />
        </Card>
      </div>
      {markedPayment ? (
        <PaymentMarkedDialog
          open
          onOpenChange={(next) => {
            if (!next) setMarkedPayment(null);
          }}
          payment={markedPayment.payment}
          amount={markedPayment.amount}
          vendorName={markedPayment.bill.purchaseOrder.vendor.name}
          poNumber={markedPayment.bill.purchaseOrder.poNumber}
          balance={markedPayment.payment.billState.balance}
        />
      ) : null}
    </>
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
