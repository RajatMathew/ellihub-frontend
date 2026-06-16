import { Search, X } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { ProjectFilterTabs } from '@/modules/project/components/shared';
import { PO_STATUS_OPTIONS } from '@/modules/project/constants/purchase-order';
import type { PurchaseOrderListParamPatch } from '@/modules/project/hooks/purchase-order';
import type { POStatusName } from '@/modules/project/schemas/purchase-order';

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

const STATUS_TABS = [
  { label: 'All', value: undefined },
  ...PO_STATUS_OPTIONS,
] as const;

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
    <CardHeader className="items-stretch sm:items-center">
      <CardTitle className="w-full overflow-x-auto sm:w-auto">
        <ProjectFilterTabs
          value={statusFilter}
          options={STATUS_TABS}
          onValueChange={(value) => onUpdateParams({ status: value, page: undefined })}
        />
      </CardTitle>
      <CardToolbar className="w-full sm:w-auto">
        <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <InputWrapper variant="sm" className="w-full sm:w-60">
            <Search className="size-4" />
            <Input
              placeholder="Search POs..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputWrapper>
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
              triggerClassName="h-8 text-xs"
              placeholderClassName="text-foreground"
            />
          </div>
          <Select
            value={tradeCategoryFilter ?? 'all'}
            onValueChange={(value) =>
              onUpdateParams({
                tradeCategoryId: value === 'all' ? undefined : value,
                page: undefined,
              })
            }
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-48">
              <SelectValue placeholder="All Trades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              {tradeCategories.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label ?? option.name ?? option.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearFilters}>
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </CardToolbar>
    </CardHeader>
  );
}
