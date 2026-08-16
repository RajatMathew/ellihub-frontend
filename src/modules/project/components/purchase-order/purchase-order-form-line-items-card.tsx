import type { ReactNode } from 'react';

import { LineItems } from '@/app/components/line-items';
import type { ProjectBudgetSummary } from '@/modules/project/schemas/project.schema';
import type { CreatePOInput } from '@/modules/project/schemas/purchase-order';
import type {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from 'react-hook-form';

import { PurchaseOrderFormTotalsFooter } from './purchase-order-form-totals-footer';
import type { PurchaseOrderFormOption } from './purchase-order-form-types';

interface PurchaseOrderFormLineItemsCardProps {
  control: Control<CreatePOInput>;
  fields: FieldArrayWithId<CreatePOInput, 'lineItems', 'id'>[];
  append: UseFieldArrayAppend<CreatePOInput, 'lineItems'>;
  remove: UseFieldArrayRemove;
  costCodeOptions: PurchaseOrderFormOption[];
  selectedCostCodeOptions?: PurchaseOrderFormOption[];
  costCodeSearch?: string;
  onCostCodeSearchChange?: (value: string) => void;
  isCostCodeLoading?: boolean;
  isCostCodeFetchingNextPage?: boolean;
  hasMoreCostCodes?: boolean;
  onFetchMoreCostCodes?: () => void;
  unitOptions: PurchaseOrderFormOption[];
  rootError?: FieldErrors<CreatePOInput>['lineItems'];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  headerAction?: ReactNode;
  budgetSummary?: ProjectBudgetSummary;
  isBudgetLoading: boolean;
  isBudgetError: boolean;
  onRetryBudget: () => void;
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
  selectedCostCodeOptions,
  costCodeSearch,
  onCostCodeSearchChange,
  isCostCodeLoading,
  isCostCodeFetchingNextPage,
  hasMoreCostCodes,
  onFetchMoreCostCodes,
  unitOptions,
  rootError,
  subtotal,
  taxPercent,
  taxAmount,
  total,
  headerAction,
  budgetSummary,
  isBudgetLoading,
  isBudgetError,
  onRetryBudget,
}: PurchaseOrderFormLineItemsCardProps) {
  return (
    <LineItems
      control={control}
      fieldPrefix="lineItems"
      fields={fields}
      append={append}
      remove={remove}
      costCodeOptions={costCodeOptions}
      selectedCostCodeOptions={selectedCostCodeOptions}
      costCodeSearch={costCodeSearch}
      onCostCodeSearchChange={onCostCodeSearchChange}
      isCostCodeLoading={isCostCodeLoading}
      isCostCodeFetchingNextPage={isCostCodeFetchingNextPage}
      hasMoreCostCodes={hasMoreCostCodes}
      onFetchMoreCostCodes={onFetchMoreCostCodes}
      fieldNames={{ unit: 'unitId' }}
      unitOptions={unitOptions}
      allowCustomUnit={false}
      defaultItem={defaultLineItem}
      rootError={rootError?.root}
      showLineTotal
      headerAction={headerAction}
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
        budgetSummary={budgetSummary}
        isBudgetLoading={isBudgetLoading}
        isBudgetError={isBudgetError}
        onRetryBudget={onRetryBudget}
      />
    </LineItems>
  );
}
