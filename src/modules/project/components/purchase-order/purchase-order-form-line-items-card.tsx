import { LineItems } from '@/app/components/line-items';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { formatCurrency, formatPercent } from '@/app/lib/helpers';
import type { CreatePOInput } from '@/modules/project/schemas/purchase-order';
import type {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { PurchaseOrderFormOption } from './purchase-order-form-types';

interface PurchaseOrderFormLineItemsCardProps {
  control: Control<CreatePOInput>;
  fields: FieldArrayWithId<CreatePOInput, 'lineItems', 'id'>[];
  append: UseFieldArrayAppend<CreatePOInput, 'lineItems'>;
  remove: UseFieldArrayRemove;
  costCodeOptions: PurchaseOrderFormOption[];
  unitOptions: PurchaseOrderFormOption[];
  rootError?: FieldErrors<CreatePOInput>['lineItems'];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
}

const defaultLineItem: CreatePOInput['lineItems'][number] = {
  description: '',
  quantity: 1,
  unitId: '',
  unitPrice: 0,
  costCodeId: '',
};

export function PurchaseOrderFormLineItemsCard({
  control,
  fields,
  append,
  remove,
  costCodeOptions,
  unitOptions,
  rootError,
  subtotal,
  taxPercent,
  taxAmount,
  total,
}: PurchaseOrderFormLineItemsCardProps) {
  return (
    <LineItems
      control={control}
      fieldPrefix="lineItems"
      fields={fields}
      append={append}
      remove={remove}
      costCodeOptions={costCodeOptions}
      fieldNames={{ unit: 'unitId' }}
      unitOptions={unitOptions}
      allowCustomUnit={false}
      defaultItem={defaultLineItem}
      rootError={rootError?.root}
      showLineTotal
    >
      <Separator className="mt-4" />
      <div className="flex justify-end pt-4">
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping and Handling Fee</span>
            <Controller
              name="shippingHandlingFee"
              control={control}
              render={({ field }) => (
                <InputWrapper className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? 0}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                    className="text-right"
                  />
                </InputWrapper>
              )}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tax ({formatPercent(taxPercent)})</span>
            <span className="font-medium tabular-nums">{formatCurrency(taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </LineItems>
  );
}
