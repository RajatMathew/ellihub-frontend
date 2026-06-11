import { LineItems } from '@/app/components/line-items';
import type { CreatePOInput } from '@/modules/project/schemas/purchase-order';
import type {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from 'react-hook-form';

import type { PurchaseOrderFormOption } from './purchase-order-form-types';
import { PurchaseOrderFormTotalsFooter } from './purchase-order-form-totals-footer';

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
      <PurchaseOrderFormTotalsFooter
        control={control}
        subtotal={subtotal}
        taxPercent={taxPercent}
        taxAmount={taxAmount}
        total={total}
        negotiatedDiscountName="negotiatedDiscount"
        shippingHandlingFeeName="shippingHandlingFee"
        taxPercentName="taxPercent"
      />
    </LineItems>
  );
}
