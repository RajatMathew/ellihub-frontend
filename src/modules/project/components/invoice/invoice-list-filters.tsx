import { Search, X } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import type { InvoiceFilterOptionsResult, InvoiceListParamPatch } from '@/modules/project/hooks/invoice';
import { ProjectFilterTabs } from '@/modules/project/components/shared';

interface InvoiceListFiltersProps {
  paidFilter: boolean | undefined;
  hasActiveFilters: boolean;
  searchInput: string;
  vendorSearch: string;
  purchaseOrderSearch: string;
  vendorFilter?: string;
  purchaseOrderFilter?: string;
  vendorPicker: InvoiceFilterOptionsResult;
  purchaseOrderPicker: InvoiceFilterOptionsResult;
  onSearchChange: (value: string) => void;
  onVendorSearchChange: (value: string) => void;
  onPurchaseOrderSearchChange: (value: string) => void;
  onUpdateParams: (patch: InvoiceListParamPatch) => void;
  onClearFilters: () => void;
}

const PAYMENT_TABS = [
  { label: 'All', value: undefined },
  { label: 'Paid', value: 'true' },
  { label: 'Unpaid', value: 'false' },
] as const;

export function InvoiceListFilters({
  paidFilter,
  hasActiveFilters,
  searchInput,
  vendorSearch,
  purchaseOrderSearch,
  vendorFilter,
  purchaseOrderFilter,
  vendorPicker,
  purchaseOrderPicker,
  onSearchChange,
  onVendorSearchChange,
  onPurchaseOrderSearchChange,
  onUpdateParams,
  onClearFilters,
}: InvoiceListFiltersProps) {
  const paymentValue =
    paidFilter === undefined ? undefined : paidFilter ? 'true' : 'false';

  return (
    <CardHeader className="items-stretch sm:items-center">
      <CardTitle className="w-full overflow-x-auto sm:w-auto">
        <ProjectFilterTabs
          value={paymentValue}
          options={PAYMENT_TABS}
          onValueChange={(value) => onUpdateParams({ isPaid: value, page: undefined })}
        />
      </CardTitle>
      <CardToolbar className="w-full sm:w-auto">
        <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <InputWrapper variant="sm" className="w-full sm:w-60">
            <Search className="size-4" />
            <Input
              placeholder="Search invoices..."
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
          <div className="w-full sm:w-56">
            <InfiniteSearchSelect
              options={purchaseOrderPicker.options}
              value={purchaseOrderFilter ?? null}
              onValueChange={(value) =>
                onUpdateParams({ purchaseOrderId: value ?? undefined, page: undefined })
              }
              search={purchaseOrderSearch}
              onSearchChange={onPurchaseOrderSearchChange}
              isLoading={purchaseOrderPicker.isLoading}
              isFetchingNextPage={purchaseOrderPicker.isFetchingNextPage}
              hasNextPage={purchaseOrderPicker.hasNextPage}
              onFetchNextPage={purchaseOrderPicker.fetchNextPage}
              placeholder="All Purchase Orders"
              searchPlaceholder="Search purchase orders..."
              emptyMessage="No purchase orders found."
              triggerClassName="h-8 text-xs"
              placeholderClassName="text-foreground"
            />
          </div>
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
