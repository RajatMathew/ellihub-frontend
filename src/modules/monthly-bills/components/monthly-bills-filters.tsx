import {
  TableCardHeaderSearch,
} from '@/app/components/table-card-header';
import {
  InfiniteMultiSearchSelect,
  type InfiniteMultiSearchSelectOption,
} from '@/app/components/ui/infinite-multi-search-select';
import { cn } from '@/app/lib/utils';

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
  className?: string;
  onSearchChange: (value: string) => void;
  onVendorChange: (value: string[]) => void;
  onVendorSearchChange: (value: string) => void;
  onTradeCategoryChange: (value: string[]) => void;
  onTradeCategorySearchChange: (value: string) => void;
}

const tableHeaderMultiSelectTriggerClassName =
  'h-8 rounded-md !border-table-card-header-foreground/25 !bg-card-header !text-xs !font-medium !text-table-card-header-foreground shadow-xs shadow-black/10 hover:!border-table-card-header-foreground/40 hover:!bg-card-header [&_.text-muted-foreground]:!text-table-card-header-foreground/75 [&_svg]:!text-table-card-header-foreground [&_[data-slot=badge]]:!border-primary-alpha [&_[data-slot=badge]]:!bg-primary-soft [&_[data-slot=badge]]:!text-primary-soft-foreground [&_[data-slot=badge].text-muted-foreground]:!text-primary-soft-foreground/75 [&_[data-slot=badge]_[role=button]]:!text-primary-soft-foreground/55 [&_[data-slot=badge]_[role=button]:hover]:!text-primary-soft-foreground [&_[data-slot=badge]_svg]:!text-primary-soft-foreground/65';

export function MonthlyBillsFilters({
  searchInput,
  vendorIds,
  vendorSearch,
  vendorPicker,
  tradeCategoryIds,
  tradeCategorySearch,
  tradeCategoryOptions,
  className,
  onSearchChange,
  onVendorChange,
  onVendorSearchChange,
  onTradeCategoryChange,
  onTradeCategorySearchChange,
}: MonthlyBillsFiltersProps) {
  return (
    <div
      className={cn(
        'grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_minmax(12rem,14rem)_minmax(12rem,14rem)] xl:items-center',
        className
      )}
    >
      <TableCardHeaderSearch
        value={searchInput}
        placeholder="Search PO #, vendor, or project..."
        onChange={onSearchChange}
        className="xl:w-full"
      />

      <div className="w-full">
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

      <div className="w-full">
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
    </div>
  );
}
