import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { QuickBooksPayee } from '@/modules/integrations/schemas/quickbooks.schema';
import type { VendorMatch } from '@/modules/monthly-bills/lib/monthly-bills-vendor-match';
import type { MarkPaymentFormData } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { CheckCircle2 } from 'lucide-react';
import type { Control } from 'react-hook-form';

interface MarkPaymentVendorFieldProps {
  control: Control<MarkPaymentFormData>;
  vendors: QuickBooksPayee[];
  vendorMatch: VendorMatch | null;
  vendorName: string;
  isLoading: boolean;
}

export function MarkPaymentVendorField({
  control,
  vendors,
  vendorMatch,
  vendorName,
  isLoading,
}: MarkPaymentVendorFieldProps) {
  return (
    <FormField
      control={control}
      name="qbVendorId"
      render={({ field }) =>
        vendorMatch ? (
          <FormItem className="space-y-2.5 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <p className="text-sm font-semibold text-foreground">Confirm QuickBooks vendor</p>
            <p className="text-xs text-muted-foreground">
              ElliHub vendor &ldquo;{vendorName}&rdquo; looks similar to an existing QuickBooks
              vendor. Confirm the mapping before posting so a duplicate vendor is not created.
            </p>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="h-auto bg-background py-2.5">
                  <div className="flex items-center gap-2.5 text-start">
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                    <div className="flex flex-col">
                      <SelectValue placeholder="Select the matching QuickBooks vendor" />
                      <span className="text-xs text-muted-foreground">{vendorMatch.reason}</span>
                    </div>
                  </div>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.qbId}>
                    {vendor.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        ) : (
          <FormItem className="space-y-1.5">
            <FormLabel>QuickBooks Vendor</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoading ? 'Loading…' : 'Select QuickBooks vendor'}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.qbId}>
                    {vendor.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && vendors.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No QuickBooks vendors found. Connect QuickBooks and sync reference data first.
              </p>
            )}
            <FormMessage />
          </FormItem>
        )
      }
    />
  );
}
