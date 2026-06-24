import { InputWrapper } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import { Separator } from '@/app/components/ui/separator';
import { formatCurrency } from '@/app/lib/helpers';
import {
  formatPurchaseOrderTaxLabel,
  type PurchaseOrderTotalsInput,
} from '@/modules/project/components/purchase-order/purchase-order-totals';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';

interface PurchaseOrderFormTotalsFooterProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  subtotal: number;
  taxPercent: PurchaseOrderTotalsInput['taxPercent'];
  taxAmount: number;
  total: number;
  negotiatedDiscountName: FieldPath<TFieldValues>;
  shippingHandlingFeeName: FieldPath<TFieldValues>;
  taxPercentName: FieldPath<TFieldValues>;
}

export function PurchaseOrderFormTotalsFooter<TFieldValues extends FieldValues>({
  control,
  subtotal,
  taxPercent,
  taxAmount,
  total,
  negotiatedDiscountName,
  shippingHandlingFeeName,
  taxPercentName,
}: PurchaseOrderFormTotalsFooterProps<TFieldValues>) {
  return (
    <>
      <Separator className="mt-4" />
      <div className="flex justify-end pt-4">
        <div className="w-full max-w-full space-y-3 sm:max-w-sm">
          <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums sm:text-right">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <span className="text-muted-foreground">Negotiated Discount (-)</span>
            <Controller
              name={negotiatedDiscountName}
              control={control}
              render={({ field }) => (
                <InputWrapper className="w-full sm:w-32">
                  <NumberInput
                    value={field.value ?? 0}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    min={0}
                    decimalPlaces={2}
                    placeholder="0.00"
                    className="text-right"
                  />
                </InputWrapper>
              )}
            />
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <span className="text-muted-foreground">Shipping and Handling Fee</span>
            <Controller
              name={shippingHandlingFeeName}
              control={control}
              render={({ field }) => (
                <InputWrapper className="w-full sm:w-32">
                  <NumberInput
                    value={field.value ?? 0}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    min={0}
                    decimalPlaces={2}
                    placeholder="0.00"
                    className="text-right"
                  />
                </InputWrapper>
              )}
            />
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <span className="text-muted-foreground">Tax %</span>
            <Controller
              name={taxPercentName}
              control={control}
              render={({ field }) => (
                <InputWrapper className="w-full sm:w-32">
                  <NumberInput
                    value={field.value ?? 0}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    min={0}
                    max={100}
                    decimalPlaces={3}
                    placeholder="0"
                    className="text-right"
                  />
                </InputWrapper>
              )}
            />
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <span className="text-muted-foreground">{formatPurchaseOrderTaxLabel(taxPercent)}</span>
            <span className="font-medium tabular-nums sm:text-right">
              {formatCurrency(taxAmount)}
            </span>
          </div>
          <Separator />
          <div className="grid gap-1 text-sm font-semibold sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <span>Total</span>
            <span className="tabular-nums sm:text-right">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
