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
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Negotiated Discount (-)</span>
            <Controller
              name={negotiatedDiscountName}
              control={control}
              render={({ field }) => (
                <InputWrapper className="w-32">
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping and Handling Fee</span>
            <Controller
              name={shippingHandlingFeeName}
              control={control}
              render={({ field }) => (
                <InputWrapper className="w-32">
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tax %</span>
            <Controller
              name={taxPercentName}
              control={control}
              render={({ field }) => (
                <InputWrapper className="w-32">
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{formatPurchaseOrderTaxLabel(taxPercent)}</span>
            <span className="font-medium tabular-nums">{formatCurrency(taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
