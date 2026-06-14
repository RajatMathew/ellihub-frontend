import { Button } from '@/app/components/ui/button';
import {
  InfiniteMultiSearchSelect,
  type InfiniteMultiSearchSelectOption,
} from '@/app/components/ui/infinite-multi-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Search, X } from 'lucide-react';

interface MonthlyBillsVendorPicker {
  options: InfiniteMultiSearchSelectOption[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

interface MonthlyBillsFiltersProps {
  searchInput: string;
  vendorIds: string[];
  vendorSearch: string;
  vendorPicker: MonthlyBillsVendorPicker;
  tradeCategoryIds: string[];
  tradeCategorySearch: string;
  tradeCategoryOptions: InfiniteMultiSearchSelectOption[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onVendorChange: (value: string[]) => void;
  onVendorSearchChange: (value: string) => void;
  onTradeCategoryChange: (value: string[]) => void;
  onTradeCategorySearchChange: (value: string) => void;
  onClearFilters: () => void;
}

export function MonthlyBillsFilters({
  searchInput,
  vendorIds,
  vendorSearch,
  vendorPicker,
  tradeCategoryIds,
  tradeCategorySearch,
  tradeCategoryOptions,
  hasActiveFilters,
  onSearchChange,
  onVendorChange,
  onVendorSearchChange,
  onTradeCategoryChange,
  onTradeCategorySearchChange,
  onClearFilters,
}: MonthlyBillsFiltersProps) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap xl:items-center">
      <InputWrapper variant="sm" className="w-full xl:w-64">
        <Search className="size-4" />
        <Input
          placeholder="Search PO #, vendor, or project..."
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </InputWrapper>

      <div className="w-full xl:w-56">
        <InfiniteMultiSearchSelect
          options={vendorPicker.options}
          value={vendorIds}
          onValueChange={onVendorChange}
          search={vendorSearch}
          onSearchChange={onVendorSearchChange}
          isLoading={vendorPicker.isLoading}
          isFetchingNextPage={vendorPicker.isFetchingNextPage}
          hasNextPage={vendorPicker.hasNextPage}
          onFetchNextPage={vendorPicker.fetchNextPage}
          placeholder="All Vendors"
          searchPlaceholder="Search vendors..."
          emptyMessage="No vendors found."
        />
      </div>

      <div className="w-full xl:w-56">
        <InfiniteMultiSearchSelect
          options={tradeCategoryOptions}
          value={tradeCategoryIds}
          onValueChange={onTradeCategoryChange}
          search={tradeCategorySearch}
          onSearchChange={onTradeCategorySearchChange}
          placeholder="All Trades"
          searchPlaceholder="Search trades..."
          emptyMessage="No trades found."
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full text-xs sm:w-auto"
          onClick={onClearFilters}
        >
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
