import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { ProjectFilterTabs } from '@/modules/project/components/shared';
import type {
  InvoiceFilterOptionsResult,
  InvoiceListParamPatch,
} from '@/modules/project/hooks/invoice';

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
const tableHeaderFilterTriggerClassName =
  'h-8 rounded-md !border-table-card-header-foreground/25 !bg-card-header !text-xs !font-medium !text-table-card-header-foreground shadow-xs shadow-black/10 hover:!border-table-card-header-foreground/40 hover:!bg-card-header [&_svg]:!text-table-card-header-foreground';
const tableHeaderFilterPlaceholderClassName = '!text-table-card-header-foreground/75';

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
  const paymentValue = paidFilter === undefined ? undefined : paidFilter ? 'true' : 'false';

  return (
    <TableCardHeader
      title={
        <ProjectFilterTabs
          value={paymentValue}
          options={PAYMENT_TABS}
          onValueChange={(value) => onUpdateParams({ isPaid: value, page: undefined })}
        />
      }
      actions={
        <TableCardHeaderToolbar className="flex-wrap">
          <TableCardHeaderSearch
            value={searchInput}
            placeholder="Search invoices..."
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
              triggerClassName={tableHeaderFilterTriggerClassName}
              placeholderClassName={tableHeaderFilterPlaceholderClassName}
            />
          </div>
          <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
        </TableCardHeaderToolbar>
      }
    />
  );
}
