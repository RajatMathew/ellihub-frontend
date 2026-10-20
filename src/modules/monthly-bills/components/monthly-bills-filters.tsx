import { TableCardHeaderSearch } from '@/app/components/table-card-header';
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

interface MonthlyBillsFiltersBaseProps {
  vendorIds: string[];
  vendorSearch: string;
  vendorPicker: MonthlyBillsVendorPicker;
  tradeCategoryIds: string[];
  tradeCategorySearch: string;
  tradeCategoryOptions: InfiniteMultiSearchSelectOption[];
  className?: string;
  onVendorChange: (value: string[]) => void;
  onVendorSearchChange: (value: string) => void;
  onTradeCategoryChange: (value: string[]) => void;
  onTradeCategorySearchChange: (value: string) => void;
}

type MonthlyBillsFiltersProps = MonthlyBillsFiltersBaseProps &
  (
    | {
        showSearch?: true;
        searchInput: string;
        onSearchChange: (value: string) => void;
      }
    | {
        showSearch: false;
        searchInput?: never;
        onSearchChange?: never;
      }
  );

// The trigger takes its colour from the header's `data-surface` token scope.
// Selected badges are the one thing that does not follow, because they sit on
// the trigger rather than the header — hence the explicit soft-primary fill.
const tableHeaderMultiSelectTriggerClassName =
  'shadow-xs shadow-black/10 [&_[data-slot=badge]]:border-primary-alpha [&_[data-slot=badge]]:bg-primary-soft [&_[data-slot=badge]]:text-primary-soft-foreground';

export function MonthlyBillsFilters(props: MonthlyBillsFiltersProps) {
  const {
    vendorIds,
    vendorSearch,
    vendorPicker,
    tradeCategoryIds,
    tradeCategorySearch,
    tradeCategoryOptions,
    className,
    onVendorChange,
    onVendorSearchChange,
    onTradeCategoryChange,
    onTradeCategorySearchChange,
  } = props;
  const showSearch = props.showSearch !== false;

  return (
    <div
      className={cn(
        'grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:items-center',
        showSearch
          ? 'xl:grid-cols-[minmax(16rem,1fr)_minmax(12rem,14rem)_minmax(12rem,14rem)]'
          : 'xl:grid-cols-[minmax(12rem,14rem)_minmax(12rem,14rem)]',
        className
      )}
    >
      {props.showSearch !== false ? (
        <TableCardHeaderSearch
          value={props.searchInput}
          placeholder="Search PO #, vendor, or project..."
          onChange={props.onSearchChange}
          className="xl:w-full"
        />
      ) : null}

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
          size="toolbar"
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
          size="toolbar"
          triggerClassName={tableHeaderMultiSelectTriggerClassName}
        />
      </div>
    </div>
  );
}
