import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/ui/form';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import type { QuickBooksVendorMapping } from '@/modules/integrations/schemas/quickbooks.schema';
import type { VendorMatch } from '@/modules/monthly-bills/lib/monthly-bills-vendor-match';
import type { MarkPaymentFormData } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { AlertTriangle, CheckCircle2, Link2Off, Plus } from 'lucide-react';
import type { Control } from 'react-hook-form';

interface MarkPaymentVendorFieldProps {
  control: Control<MarkPaymentFormData>;
  options: InfiniteSearchSelectOption[];
  vendorMatch: VendorMatch | null;
  vendorName: string;
  mapping: QuickBooksVendorMapping | null;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onFetchNextPage: () => void;
  onCreateVendor: () => void;
  onUnmapVendor: () => void;
  isUnmapping: boolean;
}

export function MarkPaymentVendorField({
  control,
  options,
  vendorMatch,
  vendorName,
  mapping,
  search,
  onSearchChange,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onFetchNextPage,
  onCreateVendor,
  onUnmapVendor,
  isUnmapping,
}: MarkPaymentVendorFieldProps) {
  return (
    <div className="space-y-3">
      <FormField
        control={control}
        name="qbVendorId"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <FormLabel>QuickBooks Vendor</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreateVendor}
                className="w-full sm:w-auto"
              >
                <Plus className="size-3.5" />
                Create Vendor
              </Button>
            </div>

            {mapping ? (
              <div className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      Mapped to {mapping.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {mapping.primaryEmail ?? mapping.companyName ?? 'Saved QuickBooks mapping'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  appearance="ghost"
                  size="sm"
                  onClick={onUnmapVendor}
                  disabled={isUnmapping}
                  className="w-full sm:w-auto"
                >
                  <Link2Off className="size-3.5" />
                  Unmap
                </Button>
              </div>
            ) : (
              vendorMatch && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        Suggested match: {vendorMatch.vendor.displayName}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        ElliHub vendor &ldquo;{vendorName}&rdquo; looks similar.{' '}
                        {vendorMatch.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            <FormControl>
              <InfiniteSearchSelect
                options={options}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? '')}
                search={search}
                onSearchChange={onSearchChange}
                isLoading={isLoading}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                onFetchNextPage={onFetchNextPage}
                placeholder={isLoading ? 'Loading...' : 'Select QuickBooks vendor'}
                searchPlaceholder="Search QuickBooks vendors..."
                emptyMessage="No QuickBooks vendors found."
                loadingMessage="Loading QuickBooks vendors..."
              />
            </FormControl>

            {!isLoading && options.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No QuickBooks vendors found. Sync reference data or create a new vendor.
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {!mapping && (
        <FormField
          control={control}
          name="saveVendorMapping"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start justify-start gap-3 rounded-md border border-border bg-muted/30 p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="flex flex-col gap-0.5 text-left">
                <FormLabel className="text-sm font-medium cursor-pointer select-none">Remember this mapping</FormLabel>
                <p className="text-xs leading-5 text-muted-foreground">
                  Auto-select this QuickBooks vendor for future {vendorName} payments.
                </p>
              </div>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
