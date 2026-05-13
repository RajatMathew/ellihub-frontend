import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import type { CreatePOInput } from '@/modules/project/schemas/purchase-order';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { PurchaseOrderFormOption } from './purchase-order-form-types';

interface PurchaseOrderFormDetailsCardProps {
  control: Control<CreatePOInput>;
  vendorOptions: PurchaseOrderFormOption[];
  tradeCategoryOptions: PurchaseOrderFormOption[];
  rfqOptions: PurchaseOrderFormOption[];
}

const fieldLabelClassName = 'text-xs font-semibold uppercase tracking-normal';

export function PurchaseOrderFormDetailsCard({
  control,
  vendorOptions,
  tradeCategoryOptions,
  rfqOptions,
}: PurchaseOrderFormDetailsCardProps) {
  return (
    <Card id="po-details">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">PO Details</h2>
          <p className="text-sm text-muted-foreground">
            Core information about this purchase order.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="vendorId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className={fieldLabelClassName}>Vendor</FieldLabel>
                <SearchableSelect
                  options={vendorOptions}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                  placeholder="Select vendor..."
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found."
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="tradeCategoryId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className={fieldLabelClassName}>Trade Category</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select trade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tradeCategoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="rfqId"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Linked RFQ (Optional)</FieldLabel>
              <SearchableSelect
                options={rfqOptions}
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value ?? undefined)}
                placeholder="Select RFQ..."
                searchPlaceholder="Search RFQs..."
                emptyMessage="No awarded RFQs found."
              />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className={fieldLabelClassName}>Description</FieldLabel>
              <Textarea
                {...field}
                placeholder="Describe the purchase order..."
                rows={3}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="expectedDate"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className={fieldLabelClassName}>Expected Delivery Date</FieldLabel>
                <InputWrapper>
                  <Input type="date" {...field} />
                </InputWrapper>
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="leadTime"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className={fieldLabelClassName}>Lead Time (Days)</FieldLabel>
                <InputWrapper>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 30"
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(event) => {
                      if (['e', 'E', '+', '-', '.'].includes(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    autoComplete="off"
                  />
                </InputWrapper>
              </Field>
            )}
          />

          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className={fieldLabelClassName}>Address</FieldLabel>
                <InputWrapper>
                  <Input {...field} placeholder="Vendor or billing address" autoComplete="off" />
                </InputWrapper>
              </Field>
            )}
          />
        </div>

        <Controller
          name="shipToAddress"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Ship To Address</FieldLabel>
              <InputWrapper>
                <Input {...field} placeholder="123 Job Site Rd, City ST 00000" autoComplete="off" />
              </InputWrapper>
            </Field>
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Internal Notes</FieldLabel>
              <Textarea {...field} placeholder="Internal notes..." rows={2} />
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}
