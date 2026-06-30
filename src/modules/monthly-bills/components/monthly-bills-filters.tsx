import {
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
} from '@/app/components/table-card-header';
import {
  InfiniteMultiSearchSelect,
  type InfiniteMultiSearchSelectOption,
} from '@/app/components/ui/infinite-multi-search-select';

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

const tableHeaderMultiSelectTriggerClassName =
  'h-8 rounded-md !border-table-card-header-foreground/25 !bg-card-header !text-xs !font-medium !text-table-card-header-foreground shadow-xs shadow-black/10 hover:!border-table-card-header-foreground/40 hover:!bg-card-header [&_.text-muted-foreground]:!text-table-card-header-foreground/75 [&_svg]:!text-table-card-header-foreground';

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
      <TableCardHeaderSearch
        value={searchInput}
        placeholder="Search PO #, vendor, or project..."
        onChange={onSearchChange}
        className="xl:w-64"
      />

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
          triggerClassName={tableHeaderMultiSelectTriggerClassName}
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
          triggerClassName={tableHeaderMultiSelectTriggerClassName}
        />
      </div>

      <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
    </div>
  );
}
