import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import { useAccess } from '@/app/contexts/access-context';
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
import { useMonthlyBillsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { useMonthlyBillsVendorFilterOptions } from '@/modules/monthly-bills/hooks/use-monthly-bills-vendor-filter-options';
import {
  getMonthlyBillDateRange,
  getMonthlyBillMonthNumber,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { Check, Pencil } from 'lucide-react';

interface MonthlyBillsSubcontractorPageProps {
  selectedDate: Date;
  enabled: boolean;
}

export function MonthlyBillsSubcontractorPage({
  selectedDate,
  enabled,
}: MonthlyBillsSubcontractorPageProps) {
  const { access, isAdmin } = useAccess();
  const canMarkPayment = isAdmin || access?.role === 'accountant';
  const [editMode, setEditMode] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(getDefaultMonthlyBillColumns);

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

  return (
    <div>
      <MonthlyBillsStats
        groups={monthlyBillsQuery.data ?? []}
        selectedDate={selectedDate}
        isLoading={monthlyBillsQuery.isLoading}
      />

      <Card className="overflow-hidden">
        <CardHeader className="items-stretch gap-3 xl:flex-row xl:items-center">
          <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground">
            Subcontractor Bills
          </CardTitle>
          <CardToolbar className="w-full flex-col items-stretch gap-2.5 xl:w-auto xl:flex-row xl:items-center">
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

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <MonthlyBillsColumnToggle
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
              />
              <Button
                type="button"
                variant={editMode ? 'primary' : 'outline'}
                size="sm"
                aria-pressed={editMode}
                onClick={() => setEditMode((current) => !current)}
                className="w-full sm:w-auto"
              >
                {editMode ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                {editMode ? 'Done' : 'Edit'}
              </Button>
            </div>
          </CardToolbar>
        </CardHeader>

        <MonthlyBillsTable
          groups={monthlyBillsQuery.data ?? []}
          selectedDate={selectedDate}
          canMarkPayment={canMarkPayment}
          editMode={editMode}
          visibleColumns={visibleColumns}
          isLoading={monthlyBillsQuery.isLoading}
          isError={monthlyBillsQuery.isError}
          onRetry={() => void monthlyBillsQuery.refetch()}
        />
      </Card>
    </div>
  );
}
