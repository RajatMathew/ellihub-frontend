import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import { ProjectFilterTabs } from '@/modules/project/components/shared';
import { PO_STATUS_OPTIONS } from '@/modules/project/constants/purchase-order';
import type { PurchaseOrderListParamPatch } from '@/modules/project/hooks/purchase-order';
import type { POStatusName } from '@/modules/project/schemas/purchase-order';
import { ListFilterPlus } from 'lucide-react';

interface PurchaseOrderLookupOption {
  id: string;
  label?: string | null;
  name?: string | null;
}

interface PurchaseOrderVendorPicker {
  options: InfiniteSearchSelectOption[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

interface PurchaseOrderListFiltersProps {
  statusFilter?: POStatusName;
  tradeCategoryFilter?: string;
  vendorFilter?: string;
  hasActiveFilters: boolean;
  searchInput: string;
  vendorSearch: string;
  vendorPicker: PurchaseOrderVendorPicker;
  tradeCategories?: PurchaseOrderLookupOption[];
  onSearchChange: (value: string) => void;
  onVendorSearchChange: (value: string) => void;
  onUpdateParams: (patch: PurchaseOrderListParamPatch) => void;
  onClearFilters: () => void;
}

const STATUS_TABS = [{ label: 'All', value: undefined }, ...PO_STATUS_OPTIONS] as const;
const tableHeaderFilterTriggerClassName =
  'h-8 rounded-md !border-table-card-header-foreground/25 !bg-card-header !text-xs !font-medium !text-table-card-header-foreground shadow-xs shadow-black/10 hover:!border-table-card-header-foreground/40 hover:!bg-card-header [&_svg]:!text-table-card-header-foreground';
const tableHeaderFilterPlaceholderClassName = '!text-table-card-header-foreground/75';

export function PurchaseOrderListFilters({
  statusFilter,
  tradeCategoryFilter,
  vendorFilter,
  hasActiveFilters,
  searchInput,
  vendorSearch,
  vendorPicker,
  tradeCategories = [],
  onSearchChange,
  onVendorSearchChange,
  onUpdateParams,
  onClearFilters,
}: PurchaseOrderListFiltersProps) {
  return (
    <TableCardHeader
      title={
        <ProjectFilterTabs
          value={statusFilter}
          options={STATUS_TABS}
          onValueChange={(value) => onUpdateParams({ status: value, page: undefined })}
        />
      }
      actions={
        <TableCardHeaderToolbar className="flex-wrap">
          <TableCardHeaderSearch
            value={searchInput}
            placeholder="Search POs..."
            onChange={onSearchChange}
            className="sm:w-60"
          />
          <div className="w-full sm:w-52">
            <InfiniteSearchSelect
              options={vendorPicker.options}
              value={vendorFilter ?? null}
              onValueChange={(value) =>
                onUpdateParams({ vendorId: value ?? undefined, page: undefined })
              }
              search={vendorSearch}
              onSearchChange={onVendorSearchChange}
              isLoading={vendorPicker.isLoading}
              isFetchingNextPage={vendorPicker.isFetchingNextPage}
              hasNextPage={vendorPicker.hasNextPage}
              onFetchNextPage={vendorPicker.fetchNextPage}
              placeholder="All Vendors"
              searchPlaceholder="Search vendors..."
              emptyMessage="No vendors found."
              triggerClassName={tableHeaderFilterTriggerClassName}
              placeholderClassName={tableHeaderFilterPlaceholderClassName}
            />
          </div>
          <TableCardHeaderSelect
            value={tradeCategoryFilter ?? 'all'}
            placeholder="All Trades"
            icon={ListFilterPlus}
            options={[
              { label: 'All Trades', value: 'all' },
              ...tradeCategories.map((option) => ({
                label: option.label ?? option.name ?? option.id,
                value: option.id,
              })),
            ]}
            className="sm:w-48"
            onValueChange={(value) =>
              onUpdateParams({
                tradeCategoryId: value === 'all' ? undefined : value,
                page: undefined,
              })
            }
          />
          <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
        </TableCardHeaderToolbar>
      }
    />
  );
}
