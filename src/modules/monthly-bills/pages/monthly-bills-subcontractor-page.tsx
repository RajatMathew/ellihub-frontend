import { useMemo, useRef, useState } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import { useAccess } from '@/app/contexts/access-context';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { formatCurrency } from '@/app/lib/helpers';
import { useLookupsQuery } from '@/modules/lookup/hooks';
import { MonthlyBillsColumnToggle } from '@/modules/monthly-bills/components/monthly-bills-column-toggle';
import { MonthlyBillsFilters } from '@/modules/monthly-bills/components/monthly-bills-filters';
import { MonthlyBillsStats } from '@/modules/monthly-bills/components/monthly-bills-stats';
import { MonthlyBillsTable } from '@/modules/monthly-bills/components/monthly-bills-table';
import {
  getDefaultMonthlyBillColumns,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { useMonthlyBillsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { useMonthlyBillsVendorFilterOptions } from '@/modules/monthly-bills/hooks/use-monthly-bills-vendor-filter-options';
import {
  getMonthlyBillDateRange,
  getMonthlyBillMonthNumber,
  isCurrentMonthlyBillDate,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import type {
  MonthlyBillItem,
  MonthlyBillProjectGroup,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';

type PipelineColumnKey = 'outstanding' | 'planned' | 'paid';

interface FlatMonthlyBill {
  bill: MonthlyBillItem;
  project: MonthlyBillProjectGroup['project'];
}

const PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<PipelineColumnKey>> = [
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'planned', label: 'Planned' },
  { key: 'paid', label: 'Paid' },
];

function classifyBill({ bill }: FlatMonthlyBill): PipelineColumnKey {
  const balance = bill.balance ?? 0;
  const totalPaid = bill.totalPaid ?? 0;
  const payments = bill.payments ?? [];
  const plannedReady = bill.plannedPayment?.isReady === true;

  if (balance === 0 || totalPaid > 0) return 'paid';
  if (plannedReady) return 'planned';
  if (balance > 0 && !plannedReady && payments.length === 0) return 'outstanding';
  return 'outstanding';
}

interface MonthlyBillsSubcontractorPageProps {
  selectedDate: Date;
  enabled: boolean;
}

export function MonthlyBillsSubcontractorPage({
  selectedDate,
  enabled,
}: MonthlyBillsSubcontractorPageProps) {
  const { can } = useAccess();
  const canUpdateBills = can('monthlyBills', 'update');
  const canMarkPayment = can('monthlyBills', 'mark-payment');
  const isCurrentPeriod = isCurrentMonthlyBillDate(selectedDate);
  const canUpdateCurrentBills = canUpdateBills && isCurrentPeriod;
  const canMarkCurrentPayment = canMarkPayment && isCurrentPeriod;
  const [view, setView] = useViewMode<'list' | 'pipeline'>('monthly-bills', 'list');
  const [visibleColumns, setVisibleColumns] = useState(getDefaultMonthlyBillColumns);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSaveVersion, setBulkSaveVersion] = useState(0);
  const [bulkCancelVersion, setBulkCancelVersion] = useState(0);
  const effectiveBulkEditMode = isCurrentPeriod && bulkEditMode;
  const effectiveBulkSaving = isCurrentPeriod && bulkSaving;
  const effectiveBulkSaveVersion = isCurrentPeriod ? bulkSaveVersion : 0;
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

  const vendorIds = selectedVendors.map((vendor) => vendor.value);
  const hasActiveFilters = Boolean(search || vendorIds.length || tradeCategoryIds.length);

  const { startDate, endDate } = getMonthlyBillDateRange(selectedDate);
  const monthlyBillsQuery = useMonthlyBillsQuery(
    {
      startDate,
      endDate,
      month: getMonthlyBillMonthNumber(selectedDate),
      year: selectedDate.getFullYear(),
      search: search || undefined,
      vendorId: vendorIds,
      tradeCategoryId: tradeCategoryIds,
    },
    enabled
  );

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
    if (!isCurrentPeriod) return;

    const groups = monthlyBillsQuery.data ?? [];
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

  const flatBills = useMemo<FlatMonthlyBill[]>(() => {
    const groups = monthlyBillsQuery.data ?? [];
    const result: FlatMonthlyBill[] = [];
    for (const group of groups) {
      for (const bill of group.bills ?? []) {
        result.push({ bill, project: group.project });
      }
    }
    return result;
  }, [monthlyBillsQuery.data]);

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
        groups={monthlyBillsQuery.data ?? []}
        selectedDate={selectedDate}
        isLoading={monthlyBillsQuery.isLoading}
      />

      <div className="mb-3 flex justify-end">
        <ViewSwitcher
          views={[
            { key: 'list', label: 'List' },
            { key: 'pipeline', label: 'Pipeline' },
          ]}
          active={view}
          onChange={setView}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="items-stretch gap-3 2xl:flex-row 2xl:items-center">
          <CardTitle className="text-base font-semibold tracking-normal text-foreground">
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
                      className="min-w-24"
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
                    className="w-full sm:w-auto"
                  >
                    <Pencil className="size-3.5" />
                    Bulk Edit
                  </Button>
                ))}
            </div>
          </CardToolbar>
        </CardHeader>

        {view === 'list' && (
          <MonthlyBillsTable
            groups={monthlyBillsQuery.data ?? []}
            selectedDate={selectedDate}
            canUpdateBills={canUpdateCurrentBills}
            canMarkPayment={canMarkCurrentPayment}
            bulkEditMode={effectiveBulkEditMode}
            bulkSaveVersion={effectiveBulkSaveVersion}
            bulkCancelVersion={bulkCancelVersion}
            visibleColumns={visibleColumns}
            isLoading={monthlyBillsQuery.isLoading}
            isError={monthlyBillsQuery.isError}
            onRetry={() => void monthlyBillsQuery.refetch()}
            onBulkSaveComplete={handleBulkSaveComplete}
          />
        )}

        {view === 'pipeline' && (
          <div className="px-4 pb-5 pt-2 lg:px-7.5">
            <PipelineBoard<FlatMonthlyBill, PipelineColumnKey>
              items={flatBills}
              columns={PIPELINE_COLUMNS}
              groupOf={classifyBill}
              emptyLabel="No bills"
              renderCard={({ bill, project }) => {
                const poNumber = bill.purchaseOrder?.poNumber ?? '—';
                const vendorName = bill.purchaseOrder?.vendor?.name ?? 'Unknown vendor';
                const projectName = project?.name ?? 'Unassigned project';
                return (
                  <div className="flex flex-col gap-2 rounded-sm border border-[#a09683]/40 bg-card px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {poNumber}
                        </div>
                        <div className="truncate text-xs text-foreground/60">{vendorName}</div>
                      </div>
                      <div className="shrink-0 text-right font-semibold tabular-nums text-foreground">
                        {formatCurrency(bill.balance ?? 0)}
                      </div>
                    </div>
                    <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                      {projectName}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
