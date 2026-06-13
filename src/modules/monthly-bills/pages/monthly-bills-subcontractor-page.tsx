import { Button } from '@/app/components/ui/button';
import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import { useAccess } from '@/app/contexts/access-context';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { MonthlyBillsFilters } from '@/modules/monthly-bills/components/monthly-bills-filters';
import { MonthlyBillsTable } from '@/modules/monthly-bills/components/monthly-bills-table';
import { useMonthlyBillsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { useMonthlyBillsVendorFilterOptions } from '@/modules/monthly-bills/hooks/use-monthly-bills-vendor-filter-options';
import {
  getMonthlyBillDateRange,
  getMonthlyBillMonthNumber,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { useLookupsQuery } from '@/modules/lookup/hooks';
import { Check, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';

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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

        <Button
          type="button"
          variant={editMode ? 'primary' : 'outline'}
          size="sm"
          aria-pressed={editMode}
          className="shrink-0"
          onClick={() => setEditMode((current) => !current)}
        >
          {editMode ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
          {editMode ? 'Done' : 'Edit'}
        </Button>
      </div>

      <MonthlyBillsTable
        groups={monthlyBillsQuery.data ?? []}
        selectedDate={selectedDate}
        canMarkPayment={canMarkPayment}
        editMode={editMode}
        isLoading={monthlyBillsQuery.isLoading}
        isError={monthlyBillsQuery.isError}
        onRetry={() => void monthlyBillsQuery.refetch()}
      />
    </div>
  );
}
